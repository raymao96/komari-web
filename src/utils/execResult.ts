const execResultKeys: Record<string, string> = {
  "Client offline!": "exec.output.client_offline",
  "delivery failed": "exec.output.delivery_failed",
  "delivery timeout": "exec.output.delivery_timeout",
  "execution status unknown": "exec.output.execution_unknown",
  "remote control unavailable": "exec.output.remote_unavailable",
  "远程管理已关闭，任务未投递/已取消": "exec.output.remote_closed",
  "执行超时": "exec.output.timeout",
};

export function execResultI18nKey(result?: string) {
  const text = result?.trim() ?? "";
  if (!text) return "";
  return execResultKeys[text] ?? "";
}

export function isExecTimeoutResult(result?: string) {
  const key = execResultI18nKey(result);
  return key === "exec.output.timeout" || key === "exec.output.delivery_timeout";
}

export function localizeExecResult(
  result: string | undefined,
  t: (key: string) => string,
) {
  const key = execResultI18nKey(result);
  if (!key) return result ?? "";
  const translated = t(key);
  if (!translated || translated === key) return result ?? "";
  return translated;
}
