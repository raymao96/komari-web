import assert from "node:assert/strict";
import test from "node:test";

import {
  isReleaseNewer,
  parseReleaseVersionHash,
  visibleReleaseBody,
  type GithubReleaseInfo,
} from "../src/components/admin/shell/adminShellModel.ts";

test("parses Lite version hash and still reads Komari comments", () => {
  assert.equal(
    parseReleaseVersionHash("<!-- lite-version-hash: AbC1234 -->\nnotes"),
    "abc1234",
  );
  assert.equal(
    parseReleaseVersionHash("<!-- komari-version-hash: old9876 -->\nnotes"),
    "old9876",
  );
  assert.equal(parseReleaseVersionHash("no hash here"), null);
});

test("hides both Lite and Komari version-hash comments from release notes", () => {
  assert.equal(
    visibleReleaseBody("<!-- lite-version-hash: abc1234 -->\n\n- keep this"),
    "- keep this",
  );
  assert.equal(
    visibleReleaseBody("<!-- komari-version-hash: old9876 -->\n\n- keep this"),
    "- keep this",
  );
});

test("treats same version with a different hash as newer", () => {
  const release: GithubReleaseInfo = {
    tag_name: "2.2.4",
    html_url: "https://github.com/nuomiiiii/Lite/releases/tag/2.2.4",
    body: "<!-- lite-version-hash: newhash -->",
  };
  assert.equal(isReleaseNewer(release, "2.2.4", "oldhash"), true);
  assert.equal(isReleaseNewer(release, "2.2.4", "newhash"), false);
  assert.equal(isReleaseNewer(release, "2.2.5", "oldhash"), false);
  assert.equal(isReleaseNewer(release, "2.2.3", "oldhash"), true);
});
