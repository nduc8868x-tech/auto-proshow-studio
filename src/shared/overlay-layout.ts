export const defaultOverlayLayout = {
  x: 2.5,
  y: 78.5,
  width: 95,
  height: 14.5,
  fontSize: 180,
  autoFit: true,
};
export type OverlayLayout = typeof defaultOverlayLayout;
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
export function normalizeOverlayLayout(
  input: Partial<OverlayLayout>,
): OverlayLayout {
  const value = { ...defaultOverlayLayout, ...input },
    width = clamp(value.width, 10, 100),
    height = clamp(value.height, 5, 40);
  return {
    ...value,
    width,
    height,
    x: clamp(value.x, 0, 100 - width),
    y: clamp(value.y, 0, 100 - height),
    fontSize: clamp(value.fontSize, 8, 180),
  };
}
export function overlayGeometry(
  videoWidth: number,
  videoHeight: number,
  input: OverlayLayout,
  hasLogo: boolean,
  title: string,
) {
  const layout = normalizeOverlayLayout(input),
    width = (videoWidth * layout.width) / 100,
    height = (videoHeight * layout.height) / 100;
  const logoSize = hasLogo ? Math.min(height, width * 0.25) : 0,
    padding = Math.min(videoWidth * 0.018, width * 0.04),
    bandHeight = height * (0.105 / 0.145),
    textWidth = Math.max(1, width - logoSize - 2 * padding);
  const requested = (layout.fontSize * videoHeight) / 1080,
    fontSize = layout.autoFit
      ? Math.max(
          1,
          Math.min(
            requested,
            bandHeight * 0.85,
            textWidth / (Math.max(1, Array.from(title).length) * 0.85),
          ),
        )
      : requested;
  return {
    x: (videoWidth * layout.x) / 100,
    y: (videoHeight * layout.y) / 100,
    width,
    height,
    logoSize,
    padding,
    bandHeight,
    textWidth,
    fontSize,
  };
}
