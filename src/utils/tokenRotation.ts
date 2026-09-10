const rotationInProgressMessage =
  "Token 重置仍在过渡期内，请先使用新 Token 重新部署 Agent；新 Token 首次成功连接后才能再次重置";

const rotationInProgressMessages = new Set([
  "a token rotation is already in progress",
  rotationInProgressMessage.toLocaleLowerCase(),
]);

export function localizeTokenRotationError(message: unknown) {
  if (typeof message !== "string" || !message.trim()) return "Token 重置失败";
  const normalized = message.trim();
  if (rotationInProgressMessages.has(normalized.toLocaleLowerCase())) {
    return rotationInProgressMessage;
  }
  return normalized;
}
