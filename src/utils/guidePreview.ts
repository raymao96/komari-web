export function isGuidePreview() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("preview") === "1";
}

export function isSelfUpdatePreview() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("previewUpdate") === "1";
}
