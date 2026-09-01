export function normalizeBandwidth(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const fields = trimmed.split(/\s+/).filter(Boolean);
  const glued = splitGluedBandwidth(fields[0] ?? "");
  if (glued) {
    fields.splice(0, 1, glued.number, glued.unit);
  }
  return fields.join(" ");
}

function splitGluedBandwidth(
  value: string,
): { number: string; unit: string } | null {
  const match = value.match(/^(\d+(?:\.\d+)?)([^0-9].*)$/);
  if (!match) {
    return null;
  }
  return { number: match[1], unit: match[2] };
}
