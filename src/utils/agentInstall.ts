import { quotePowerShellArg, quoteShellArg, quoteShellArgs } from "./shellQuote.ts";

export const LITE_AGENT_GITHUB_REPO = "raymao96/komari-agent";
export const LITE_AGENT_DOCKER_IMAGE = "ghcr.io/raymao96/komari-agent:latest";
export const LITE_AGENT_INSTALL_USER_AGENT =
  "Lite-agent-install (+https://github.com/raymao96/komari-agent)";

export function defaultInstallGitHubProxy(
  settings?: { github_proxy?: unknown } | null,
): string {
  return typeof settings?.github_proxy === "string"
    ? settings.github_proxy.trim()
    : "";
}

export function rewriteGitHubURL(rawURL: string, proxy = "") {
  const prefix = proxy.trim().replace(/\/+$/, "");
  const raw = rawURL.trim();
  if (!prefix || !raw) return raw;
  if (raw.startsWith(`${prefix}/`)) return raw;
  return `${prefix}/${raw}`;
}

export function liteAgentInstallScriptUrl(
  scriptFile: "install.sh" | "install.ps1",
  ghproxy = "",
) {
  return rewriteGitHubURL(
    `https://raw.githubusercontent.com/${LITE_AGENT_GITHUB_REPO}/github-nuomiiiii/${scriptFile}`,
    ghproxy,
  );
}

export function liteAgentLinuxInstallCommand(scriptUrl: string, args: string[]) {
  return (
    `wget -qO- -U ${quoteShellArg(LITE_AGENT_INSTALL_USER_AGENT)} ${quoteShellArg(scriptUrl)} | sudo bash -s -- ` +
    quoteShellArgs(args)
  );
}

export function liteAgentMacInstallCommand(scriptUrl: string, args: string[]) {
  return (
    `zsh <(curl -sL -A ${quoteShellArg(LITE_AGENT_INSTALL_USER_AGENT)} ${quoteShellArg(scriptUrl)}) ` +
    quoteShellArgs(args)
  );
}

export function liteAgentWindowsInstallCommand(scriptUrl: string, args: string[]) {
  let command =
    `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ` +
    `"iwr ${quotePowerShellArg(scriptUrl)}` +
    ` -UserAgent ${quotePowerShellArg(LITE_AGENT_INSTALL_USER_AGENT)}` +
    ` -UseBasicParsing -OutFile 'install.ps1'; &` +
    ` '.\\install.ps1'`;
  for (const arg of args) {
    command += ` ${quotePowerShellArg(arg)}`;
  }
  return `${command}"`;
}
