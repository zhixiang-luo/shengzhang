export function moveItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    throw new RangeError('Item index is outside the list');
  }

  const next = [...items];
  if (fromIndex === toIndex) return next;

  const moved = next.splice(fromIndex, 1)[0] as T;
  next.splice(toIndex, 0, moved);
  return next;
}
