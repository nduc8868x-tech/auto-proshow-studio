import type { SubscribeClip } from "./subscribe";
export const subscribePresets = {
  fifteen: { label: "Mẫu 1", count: 15, seconds: 10, x: 36, y: 8, width: 29 },
  five: { label: "Mẫu 2", count: 5, seconds: 2, x: 25, y: 11, width: 51 },
} as const;
export type SubscribePresetId = keyof typeof subscribePresets;
export function buildSubscribePreset(
  presetId: SubscribePresetId,
  assetId: string,
  fps: number,
  totalFrames: number,
  makeId: () => string,
): SubscribeClip[] {
  const preset = subscribePresets[presetId];
  if (!preset) throw Error("Mẫu Subscribe không hợp lệ");
  const durationFrames = preset.seconds * fps;
  if (
    !Number.isInteger(fps) ||
    fps < 1 ||
    !Number.isInteger(totalFrames) ||
    totalFrames < durationFrames
  )
    throw Error(
      `${preset.label} cần video dài ít nhất ${preset.seconds} giây để giữ đúng thời lượng sub.`,
    );
  return Array.from({ length: preset.count }, (_, index) => ({
    id: makeId(),
    assetId,
    startFrame: Math.round(
      (index * (totalFrames - durationFrames)) / (preset.count - 1),
    ),
    durationFrames,
    x: preset.x,
    y: preset.y,
    width: preset.width,
    loop: true,
  }));
}
