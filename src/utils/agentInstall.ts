export const LITE_AGENT_GITHUB_REPO = "raymao96/komari-agent";
export const LITE_AGENT_DOCKER_IMAGE = "ghcr.io/raymao96/komari-agent:latest";

export function liteAgentInstallScriptUrl(
  scriptFile: "install.sh" | "install.ps1",
  ghproxy = "",
) {
  let scriptUrl = `https://raw.githubusercontent.com/${LITE_AGENT_GITHUB_REPO}/github-nuomiiiii/${scriptFile}`;
  const proxy = ghproxy.trim();
  if (!proxy) return scriptUrl;
  scriptUrl = scriptUrl.slice("https://".length);
  scriptUrl = proxy.endsWith("/") ? `${proxy}${scriptUrl}` : `${proxy}/${scriptUrl}`;
  if (!scriptUrl.startsWith("http")) {
    scriptUrl = `http://${scriptUrl}`;
  }
  return scriptUrl;
}
