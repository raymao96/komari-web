export function nodeListInsertAfter(
  pointerY: number,
  overTop: number,
  overHeight: number,
): boolean {
  return pointerY > overTop + overHeight / 2;
}

export function nodeListReorderIndex(
  oldIndex: number,
  overIndex: number,
  insertAfter: boolean,
): number {
  if (overIndex < 0 || oldIndex === overIndex) return oldIndex;
  if (insertAfter) {
    return oldIndex < overIndex ? overIndex : overIndex + 1;
  }
  return oldIndex < overIndex ? overIndex - 1 : overIndex;
}
