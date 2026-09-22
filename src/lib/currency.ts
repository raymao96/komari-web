const DISPLAY_BY_CODE: Record<string, string> = {
  CAD: "C$",
  "CA$": "C$",
  "C$": "C$",
  HKD: "HK$",
  "HK$": "HK$",
};

export function currencyForDisplay(currency: string): string {
  const normalized = currency.trim().toUpperCase();
  return DISPLAY_BY_CODE[normalized] ?? currency;
}

export function currencyForStorage(currency: string): string {
  const normalized = currency.trim();
  const upper = normalized.toUpperCase();
  if (upper === "CAD" || upper === "CA$" || upper === "C$") return "CAD";
  if (upper === "HKD" || upper === "HK$") return "HKD";
  return normalized;
}
