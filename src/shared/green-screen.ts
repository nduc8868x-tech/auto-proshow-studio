// Self-contained so this exact function can also run in the isolated Chromium decoder.
export function keyGreenPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  removeGreen = true,
) {
  let left = width,
    top = height,
    right = -1,
    bottom = -1;
  for (let i = 0; i < pixels.length; i += 4) {
    const other = Math.max(pixels[i], pixels[i + 2]);
    const dominance = pixels[i + 1] - other;
    if (removeGreen && pixels[i + 1] > 80 && dominance > 25) {
      pixels[i + 3] = Math.round(
        pixels[i + 3] * Math.max(0, 1 - (dominance - 25) / 75),
      );
      pixels[i + 1] = Math.min(pixels[i + 1], other + 20);
    }
    if (pixels[i + 3] > 8) {
      const at = i / 4,
        x = at % width,
        y = Math.floor(at / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return { left, top, right, bottom };
}
