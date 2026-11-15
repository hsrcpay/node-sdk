// Prints the next semver from the latest `v*` tag and the conventional commits since it.
// breaking (`!:` or `BREAKING CHANGE`) -> major, `feat` -> minor, anything else -> patch.
import { $ } from "bun";

const BASE = "0.0.0";

const lastTag = (await $`git describe --tags --abbrev=0 --match "v*"`.nothrow().text()).trim();
const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
const log = (await $`git log ${range} --format=%B%x00`.text()).split("\0").map((m) => m.trim()).filter(Boolean);

if (log.length === 0) {
  console.error("No commits since the last release.");
  process.exit(1);
}

const [major = 0, minor = 0, patch = 0] = (lastTag ? lastTag.slice(1) : BASE).split(".").map(Number);

const isBreaking = (m: string) => /^[a-z]+(\([^)]*\))?!:/m.test(m) || /^BREAKING CHANGE:/m.test(m);
const isFeature = (m: string) => /^feat(\([^)]*\))?:/.test(m);

if (log.some(isBreaking)) console.log(`${major + 1}.0.0`);
else if (log.some(isFeature)) console.log(`${major}.${minor + 1}.0`);
else console.log(`${major}.${minor}.${patch + 1}`);
