import { describe, expect, test } from "bun:test";
import { HsrcpayApiError, HsrcpayClient, HsrcpayValidationError } from "../src";
import { address, customer } from "./fixtures.more";
import { mockFetch, ok, page, queryOf } from "./helpers";

const setup = (...replies: Parameters<typeof mockFetch>) => {
  const mock = mockFetch(...replies);
  return { client: new HsrcpayClient({ apiKey: "sk_test_k", baseUrl: "http://api.test", fetch: mock.fetch, retryDelayMs: 1 }), calls: mock.calls };
};

const invalid = (run: () => unknown, fragment: string) => {
  try {
    run();
  } catch (e) {
    expect(e).toBeInstanceOf(HsrcpayValidationError);
    expect((e as Error).message).toContain(fragment);
    return;
  }
  throw new Error("expected a validation error");
};

describe("customers.create", () => {
  test("posts the body and moves account_id to the query", async () => {
    const { client, calls } = setup(ok(customer(), 201));
    const result = await client.customers.create({
      account_id: "acc_1",
      name: "Ada",
      email: "ada@example.com",
      external_reference: "crm-7",
      metadata: { plan: "pro" },
      addresses: [{ type: "BILLING", country: "TR", is_default: true }],
    });
    expect(result.id).toBe("cus_1");
    expect(calls[0]?.method).toBe("POST");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/customers");
    expect(queryOf(calls[0]!.url)).toEqual({ account_id: "acc_1" });
    expect(calls[0]?.body).toEqual({
      name: "Ada",
      email: "ada@example.com",
      external_reference: "crm-7",
      metadata: { plan: "pro" },
      addresses: [{ type: "BILLING", country: "TR", is_default: true }],
    });
  });

  test("account_id is optional", async () => {
    const { client, calls } = setup(ok(customer()));
    await client.customers.create({ name: "Ada" });
    expect(new URL(calls[0]!.url).search).toBe("");
  });

  test.each([
    [{}, "name"],
    [{ name: "A", email: "nope" }, "email"],
    [{ name: "A", external_reference: "" }, "external_reference"],
    [{ name: "A", addresses: [{ type: "HOME", country: "TR" }] }, "addresses"],
    [{ name: "A", addresses: [{ type: "BILLING", country: "" }] }, "addresses"],
    [{ name: "A", surprise: 1 }, "surprise"],
    [{ name: "A", data: { x: 1 } }, "data"],
  ])("rejects %j", (params, fragment) => {
    const { client, calls } = setup(ok(customer()));
    invalid(() => client.customers.create(params as never), fragment);
    expect(calls).toHaveLength(0);
  });
});

describe("customers.retrieve, list, update, delete", () => {
  test("retrieve has no account_id", async () => {
    const { client, calls } = setup(ok(customer()));
    await client.customers.retrieve("cus_1");
    expect(calls[0]?.url).toBe("http://api.test/v1/customers/cus_1");
  });

  test("list sends filters", async () => {
    const { client, calls } = setup(page([customer()], { total: 1 }));
    const result = await client.customers.list({ external_reference: "crm-7", page: 2, limit: 5, account_id: "acc_1" });
    expect(result.total).toBe(1);
    expect(queryOf(calls[0]!.url)).toEqual({ external_reference: "crm-7", page: "2", limit: "5", account_id: "acc_1" });
  });

  test("update is a PATCH of the profile", async () => {
    const { client, calls } = setup(ok(customer({ name: "Grace" })));
    const result = await client.customers.update("cus_1", { name: "Grace", metadata: { vip: true } });
    expect(result.name).toBe("Grace");
    expect(calls[0]?.method).toBe("PATCH");
    expect(calls[0]?.body).toEqual({ name: "Grace", metadata: { vip: true } });
  });

  test("update validates the email", () => {
    const { client } = setup(ok(customer()));
    invalid(() => client.customers.update("cus_1", { email: "x" }), "email");
  });

  test("delete resolves to undefined", async () => {
    const { client, calls } = setup(new Response(JSON.stringify({ message: "success", success: true }), { status: 200 }));
    await expect(client.customers.delete("cus_1")).resolves.toBeUndefined();
    expect(calls[0]?.method).toBe("DELETE");
  });

  test("delete surfaces the 409 refusal with its errorCode", async () => {
    const { client } = setup(new Response(JSON.stringify({ code: "customer_has_active_subscriptions" }), { status: 409 }));
    const error = (await client.customers.delete("cus_1").catch((e: unknown) => e)) as HsrcpayApiError;
    expect(error).toBeInstanceOf(HsrcpayApiError);
    expect(error.status).toBe(409);
    expect(error.errorCode).toBe("customer_has_active_subscriptions");
  });

  test("delete is retried because DELETE is safe to repeat", async () => {
    const { client, calls } = setup(
      new Response(JSON.stringify({ message: "down", success: false, error: { code: 503, message: "down" } }), { status: 503 }),
      new Response(JSON.stringify({ message: "success", success: true }), { status: 200 }),
    );
    await client.customers.delete("cus_1");
    expect(calls).toHaveLength(2);
  });
});

describe("customers.addresses", () => {
  test("create", async () => {
    const { client, calls } = setup(ok(address()));
    const result = await client.customers.addresses.create("cus_1", { type: "BILLING", is_default: true, country: "TR", city: "Istanbul" });
    expect(result.id).toBe("addr_1");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/customers/cus_1/addresses");
    expect(calls[0]?.body).toEqual({ type: "BILLING", is_default: true, country: "TR", city: "Istanbul" });
  });

  test("update patches an address", async () => {
    const { client, calls } = setup(ok(address({ city: "Ankara" })));
    await client.customers.addresses.update("cus_1", "addr_1", { city: "Ankara" });
    expect(calls[0]?.method).toBe("PATCH");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/customers/cus_1/addresses/addr_1");
  });

  test("markPrimary posts an empty body", async () => {
    const { client, calls } = setup(ok(address()));
    await client.customers.addresses.markPrimary("cus_1", "addr_1");
    expect(calls[0]?.method).toBe("POST");
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/customers/cus_1/addresses/addr_1/mark-primary");
    expect(calls[0]?.body).toEqual({});
  });

  test("delete", async () => {
    const { client, calls } = setup(new Response(JSON.stringify({ message: "success", success: true }), { status: 200 }));
    await client.customers.addresses.delete("cus_1", "addr_1");
    expect(calls[0]?.method).toBe("DELETE");
  });

  test.each([
    [{ type: "BILLING", country: "TR" }, "is_default"],
    [{ type: "BILLING", is_default: true }, "country"],
    [{ type: "OFFICE", is_default: true, country: "TR" }, "type"],
    [{ type: "BILLING", is_default: true, country: "TR", zip: 3 }, "zip"],
  ])("create rejects %j", (params, fragment) => {
    const { client } = setup(ok(address()));
    invalid(() => client.customers.addresses.create("cus_1", params as never), fragment);
  });

  test("ids are validated and encoded", () => {
    const { client } = setup(ok(address()));
    invalid(() => client.customers.addresses.update("", "a", {}), "customerId");
    invalid(() => client.customers.addresses.update("c", " ", {}), "addressId");
    invalid(() => client.customers.addresses.markPrimary("c", ""), "addressId");
    invalid(() => client.customers.addresses.delete("", "a"), "customerId");
  });
});
