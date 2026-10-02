import assert from "node:assert/strict";
import test from "node:test";

import {
  LITE_AGENT_DOCKER_IMAGE,
  LITE_AGENT_GITHUB_REPO,
  liteAgentInstallScriptUrl,
} from "../src/utils/agentInstall.ts";

test("one-click install uses Lite-agent latest, not a pinned release", () => {
  assert.equal(LITE_AGENT_GITHUB_REPO, "raymao96/komari-agent");
  assert.equal(LITE_AGENT_DOCKER_IMAGE, "ghcr.io/raymao96/komari-agent:latest");
  assert.match(LITE_AGENT_DOCKER_IMAGE, /:latest$/);
  assert.doesNotMatch(LITE_AGENT_DOCKER_IMAGE, /\d+\.\d+\.\d+\.\d+/);
  assert.equal(
    liteAgentInstallScriptUrl("install.sh"),
    "https://raw.githubusercontent.com/raymao96/komari-agent/github-nuomiiiii/install.sh",
  );
  assert.equal(
    liteAgentInstallScriptUrl("install.ps1"),
    "https://raw.githubusercontent.com/raymao96/komari-agent/github-nuomiiiii/install.ps1",
  );
  assert.doesNotMatch(liteAgentInstallScriptUrl("install.sh"), /komari-agent/);
  assert.doesNotMatch(liteAgentInstallScriptUrl("install.sh"), /install-version/);
});

test("ghproxy prefixes the Lite-agent script URL", () => {
  assert.equal(
    liteAgentInstallScriptUrl("install.sh", "https://ghproxy.example/"),
    "https://ghproxy.example/raw.githubusercontent.com/raymao96/komari-agent/github-nuomiiiii/install.sh",
  );
  assert.equal(
    liteAgentInstallScriptUrl("install.sh", "https://ghproxy.example"),
    "https://ghproxy.example/raw.githubusercontent.com/raymao96/komari-agent/github-nuomiiiii/install.sh",
  );
});
