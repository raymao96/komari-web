export type FileRootChoice = {
  value: string;
  label: string;
};

export function normalizeRemotePath(path: string, separator: string) {
  if (!path) return "";
  let value = path.replace(/[\\/]+/g, separator);
  const isDriveRoot = /^[A-Za-z]:[\\/]?$/.test(value);
  if (isDriveRoot) {
    return value.endsWith(separator) ? value : `${value}${separator}`;
  }
  if (value.length > 1 && value.endsWith(separator)) {
    value = value.slice(0, -1);
  }
  return value || separator;
}

export function sameRemotePath(left: string, right: string, separator: string) {
  return normalizeRemotePath(left, separator) === normalizeRemotePath(right, separator);
}

export function fileRootChoices(
  roots: string[],
  home: string,
  separator: string,
  homeLabel: string,
): FileRootChoice[] {
  const choices: FileRootChoice[] = [];
  const seen = new Set<string>();
  const add = (value: string, label: string) => {
    const normalized = normalizeRemotePath(value, separator);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    choices.push({ value: normalized, label });
  };
  if (home) add(home, homeLabel);
  for (const root of roots) add(root, root);
  return choices;
}

export function selectedRootValue(
  currentPath: string,
  choices: FileRootChoice[],
  separator: string,
) {
  const match = choices.find((choice) => sameRemotePath(choice.value, currentPath, separator));
  return match?.value ?? "";
}
