export function reorderImages<T extends { id: string }>(
  images: T[],
  sourceId: string,
  targetId: string,
  edge: "before" | "after",
): T[] {
  if (
    sourceId === targetId ||
    !images.some((i) => i.id === sourceId) ||
    !images.some((i) => i.id === targetId)
  )
    return images;
  const result = images.filter((i) => i.id !== sourceId);
  const at =
    result.findIndex((i) => i.id === targetId) + (edge === "after" ? 1 : 0);
  result.splice(at, 0, images.find((i) => i.id === sourceId)!);
  return result;
}
