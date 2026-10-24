import { z } from "zod";
export const subscribeAssetSchema = z.object({
  id: z.string().uuid(),
  originalName: z.string().max(255),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  removeGreen: z.boolean(),
  width: z.number().int().positive().max(4096),
  height: z.number().int().positive().max(4096),
  frameDurationsMs: z
    .array(z.number().int().min(10).max(10000))
    .min(1)
    .max(600),
});
export const subscribeClipSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().uuid(),
  startFrame: z.number().int().nonnegative(),
  durationFrames: z.number().int().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(5).max(100),
  loop: z.boolean(),
});
export type SubscribeAsset = z.infer<typeof subscribeAssetSchema>;
export type SubscribeClip = z.infer<typeof subscribeClipSchema>;
export function subscribeFrameIndex(
  durations: number[],
  localFrame: number,
  fps: number,
  loop: boolean,
) {
  const total = durations.reduce((sum, value) => sum + value, 0);
  let ms = (Math.max(0, localFrame) * 1000) / fps;
  if (loop) ms %= total;
  else if (ms >= total) return durations.length - 1;
  for (let i = 0; i < durations.length; i++) {
    if (ms < durations[i]) return i;
    ms -= durations[i];
  }
  return durations.length - 1;
}
export function subscribeGeometry(
  clip: Pick<SubscribeClip, "x" | "y" | "width">,
  asset: Pick<SubscribeAsset, "width" | "height">,
  videoWidth: number,
  videoHeight: number,
) {
  const width = Math.min(
    clip.width,
    100,
    (100 * videoHeight * asset.width) / (videoWidth * asset.height),
  );
  const height =
    (width * videoWidth * asset.height) / (videoHeight * asset.width);
  return {
    width,
    height,
    x: Math.max(0, Math.min(clip.x, 100 - width)),
    y: Math.max(0, Math.min(clip.y, 100 - height)),
  };
}
export function subscribeFramePath(assetId: string, index: number) {
  return `media/templates/${assetId}/${String(index).padStart(4, "0")}.png`;
}
export function transformSubscribeClip(
  clip: SubscribeClip,
  asset: Pick<SubscribeAsset, "width" | "height">,
  videoWidth: number,
  videoHeight: number,
  dx: number,
  dy: number,
  resize = false,
): SubscribeClip {
  const next = resize
    ? { ...clip, width: Math.max(5, Math.min(100, clip.width + dx)) }
    : { ...clip, x: clip.x + dx, y: clip.y + dy };
  const geometry = subscribeGeometry(next, asset, videoWidth, videoHeight);
  return {
    ...next,
    x: geometry.x,
    y: geometry.y,
    width: Math.max(5, geometry.width),
  };
}
export function fitSubscribeClip(
  clip: SubscribeClip,
  totalFrames: number,
): SubscribeClip {
  const startFrame = Math.max(
    0,
    Math.min(clip.startFrame, Math.max(0, totalFrames - 1)),
  );
  return {
    ...clip,
    startFrame,
    durationFrames: Math.max(
      1,
      Math.min(clip.durationFrames, totalFrames - startFrame),
    ),
  };
}
export function pasteSubscribeClip(
  source: SubscribeClip,
  id: string,
  atFrame: number,
  totalFrames: number,
): SubscribeClip {
  return fitSubscribeClip(
    { ...source, id, startFrame: Math.max(0, Math.round(atFrame)) },
    totalFrames,
  );
}
