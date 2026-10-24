import { z } from "zod";
import { defaultOverlayLayout } from "./overlay-layout";
import { motionSettings } from "./motion-settings";
import {
  subscribeAssetSchema,
  subscribeClipSchema,
  fitSubscribeClip,
} from "./subscribe";
export { defaultOverlayLayout } from "./overlay-layout";
export const motions = [
  "none",
  "zoom-in",
  "zoom-out",
  "pan-left",
  "pan-right",
  "pan-up",
  "pan-down",
] as const;
export const fits = ["auto", "cover", "contain-blur", "contain"] as const;
const id = z.string().uuid(),
  positive = z.number().finite().positive(),
  integer = z.number().int().nonnegative();
const asset = z.object({
  id,
  originalName: z.string().max(255),
  relativePath: z
    .string()
    .regex(/^media\/(images|audio)\/[a-f0-9-]+\.(jpg|jpeg|png|webp|mp3|wav)$/),
});
const image = asset.extend({
  width: positive,
  height: positive,
  thumbnailPath: z.string().regex(/^thumbnails\/[a-f0-9-]+\.png$/),
});
const audio = asset.extend({ durationSeconds: positive });
const clip = z.object({
  id: z.string(),
  imageId: id,
  startFrame: integer,
  durationFrames: integer.min(1),
  endFrame: integer.min(1),
  motion: z.enum(motions),
  transitionIn: z.enum(["fade", "slide-left", "slide-right", "wipe"]),
  transitionInFrames: integer,
  fitOverride: z.enum(fits).optional(),
  motionSpeed: z
    .number()
    .min(motionSettings.min)
    .max(motionSettings.max)
    .optional(),
});
export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  name: z.string().trim().min(1).max(120),
  createdAt: z.string(),
  updatedAt: z.string(),
  seed: z.number().int(),
  video: z.object({
    width: z.number().int().min(16).max(3840),
    height: z.number().int().min(16).max(3840),
    fps: z.number().int().min(1).max(60),
    totalFrames: integer,
  }),
  presetId: z.enum(["classic", "news", "dynamic"]),
  visual: z.object({
    fitMode: z.enum(fits),
    blurPx: z.number().min(0).max(60),
    backgroundScale: z.number().min(1.05).max(1.25),
    backgroundDarkness: z.number().min(0).max(0.4),
    foregroundShadow: z.boolean(),
    foregroundRadiusPx: z.number().min(0).max(24),
    motionSpeed: z
      .number()
      .min(motionSettings.min)
      .max(motionSettings.max)
      .default(motionSettings.initial),
  }),
  overlay: z
    .object({
      enabled: z.boolean(),
      title: z.string().max(180),
      logo: image.nullable(),
      layout: z
        .object({
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
          width: z.number().min(10).max(100),
          height: z.number().min(5).max(40),
          fontSize: z.number().min(8).max(180),
          autoFit: z.boolean(),
        })
        .default(defaultOverlayLayout),
    })
    .default({
      enabled: false,
      title: "",
      logo: null,
      layout: defaultOverlayLayout,
    }),
  exportSettings: z
    .object({
      mode: z.enum(["auto", "cpu"]),
      parallelFrames: z.number().int().min(0).max(8),
    })
    .default({ mode: "auto", parallelFrames: 0 }),
  voice: audio.nullable(),
  images: z.array(image).max(1000),
  clips: z.array(clip).max(1000),
  subscribeAssets: z.array(subscribeAssetSchema).max(50).default([]),
  subscribeClips: z.array(subscribeClipSchema).max(100).default([]),
});
export type Project = z.infer<typeof projectSchema>;
export type Clip = z.infer<typeof clip>;
export type Motion = (typeof motions)[number];
export type SceneProps = {
  project: Project;
  urls: Record<string, string>;
  backgrounds?: Record<string, { url: string; padding: number }>;
  importReport?: { requested: number; imported: number; errors: string[] };
};
export const presets = {
  classic: {
    name: "Classic ProShow",
    seconds: 0.9,
    motions: ["zoom-in", "zoom-out", "pan-left", "pan-right"],
    transitions: ["fade", "fade", "fade", "wipe"],
  },
  news: {
    name: "News Documentary",
    seconds: 0.6,
    motions: ["zoom-in", "pan-right", "zoom-out", "pan-left"],
    transitions: ["fade", "fade", "slide-left"],
  },
  dynamic: {
    name: "Dynamic Slideshow",
    seconds: 0.45,
    motions: [
      "zoom-in",
      "pan-left",
      "zoom-out",
      "pan-right",
      "pan-up",
      "pan-down",
    ],
    transitions: ["slide-left", "slide-right", "wipe", "fade"],
  },
} as const;
export function newProject(projectId: string): Project {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: projectId,
    name: "Dự án mới",
    createdAt: now,
    updatedAt: now,
    seed: 20261023,
    video: { width: 1920, height: 1080, fps: 30, totalFrames: 0 },
    presetId: "classic",
    visual: {
      fitMode: "contain-blur",
      blurPx: 32,
      backgroundScale: 1.15,
      backgroundDarkness: 0.2,
      foregroundShadow: true,
      foregroundRadiusPx: 0,
      motionSpeed: motionSettings.initial,
    },
    overlay: {
      enabled: false,
      title: "",
      logo: null,
      layout: { ...defaultOverlayLayout },
    },
    exportSettings: { mode: "auto", parallelFrames: 0 },
    voice: null,
    images: [],
    clips: [],
    subscribeAssets: [],
    subscribeClips: [],
  };
}
export function chooseFitMode(
  iw: number,
  ih: number,
  vw: number,
  vh: number,
): "cover" | "contain-blur" {
  if ([iw, ih, vw, vh].some((v) => !Number.isFinite(v) || v <= 0))
    throw Error("Kích thước ảnh không hợp lệ");
  return Math.abs(Math.log(iw / ih / (vw / vh))) <= Math.log(1.15)
    ? "cover"
    : "contain-blur";
}
export function allocateClips(
  imageIds: string[],
  seconds: number,
  fps: number,
  transitionSeconds: number,
) {
  if (
    !imageIds.length ||
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    !Number.isInteger(fps) ||
    fps <= 0 ||
    !Number.isFinite(transitionSeconds) ||
    transitionSeconds < 0
  )
    throw Error("Dữ liệu timeline không hợp lệ");
  const n = imageIds.length,
    D = Math.ceil(seconds * fps);
  if (n > D)
    throw Error(
      "Không đủ frame cho số ảnh. Giảm số ảnh hoặc dùng voice dài hơn.",
    );
  const requested = n === 1 ? 0 : Math.round(transitionSeconds * fps),
    T = Math.min(requested, Math.max(0, Math.floor((D - n) / (n + 1))));
  const sum = D + (n - 1) * T,
    base = Math.floor(sum / n),
    remainder = sum % n;
  let cursor = 0;
  const clips = imageIds.map((imageId, i) => {
    const durationFrames = base + (i < remainder ? 1 : 0),
      startFrame = cursor,
      endFrame = startFrame + durationFrames;
    cursor = endFrame - (i === n - 1 ? 0 : T);
    return {
      id: "clip-" + imageId,
      imageId,
      startFrame,
      endFrame,
      durationFrames,
      transitionInFrames: i === 0 ? 0 : T,
    };
  });
  return {
    totalFrames: D,
    transitionFrames: T,
    shortened: T < requested,
    clips,
  };
}
export function validateTimeline(p: Project) {
  const subscribeIds = new Set(p.subscribeAssets.map((a) => a.id));
  if (
    subscribeIds.size !== p.subscribeAssets.length ||
    new Set(p.subscribeClips.map((c) => c.id)).size !==
      p.subscribeClips.length ||
    p.subscribeClips.some((c) => !subscribeIds.has(c.assetId))
  )
    throw Error("Template Subscribe không hợp lệ");
  if (!p.images.length || !p.voice) {
    if (p.clips.length) throw Error("Timeline thiếu media");
    return;
  }
  const D = Math.ceil(p.voice.durationSeconds * p.video.fps);
  if (p.video.totalFrames !== D || p.clips.length !== p.images.length)
    throw Error("Timeline không khớp voice/ảnh");
  const known = new Set(p.images.map((i) => i.id)),
    seen = new Set<string>();
  p.clips.forEach((c, i) => {
    if (
      !known.has(c.imageId) ||
      seen.has(c.imageId) ||
      c.imageId !== p.images[i].id
    )
      throw Error("Clip ảnh không hợp lệ");
    seen.add(c.imageId);
    const prev = p.clips[i - 1],
      next = p.clips[i + 1];
    if (
      c.endFrame - c.startFrame !== c.durationFrames ||
      c.startFrame !== (prev ? prev.endFrame - c.transitionInFrames : 0) ||
      (!prev && c.transitionInFrames !== 0) ||
      c.durationFrames <
        c.transitionInFrames + (next?.transitionInFrames ?? 0) + 1
    )
      throw Error("Frame/overlap không hợp lệ");
  });
  if (p.clips.at(-1)?.endFrame !== D)
    throw Error("Thời lượng timeline không đúng");
}
export function generateTimeline(p: Project, regenerate = false): Project {
  if (!p.voice || !p.images.length)
    return { ...p, clips: [], video: { ...p.video, totalFrames: 0 } };
  const preset = presets[p.presetId],
    a = allocateClips(
      p.images.map((i) => i.id),
      p.voice.durationSeconds,
      p.video.fps,
      preset.seconds,
    );
  let seed = p.seed >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const old = new Map(p.clips.map((c) => [c.imageId, c]));
  const result: Project = {
    ...p,
    video: { ...p.video, totalFrames: a.totalFrames },
    subscribeClips: p.subscribeClips.map((clip) =>
      fitSubscribeClip(clip, a.totalFrames),
    ),
    clips: a.clips.map((c) => {
      const motion: Motion =
          preset.motions[Math.floor(random() * preset.motions.length)],
        transitionIn =
          preset.transitions[Math.floor(random() * preset.transitions.length)],
        previous = old.get(c.imageId);
      return !regenerate && previous
        ? { ...previous, ...c }
        : {
            ...c,
            motion,
            transitionIn,
            ...(previous?.fitOverride
              ? { fitOverride: previous.fitOverride }
              : {}),
            ...(previous?.motionSpeed !== undefined
              ? { motionSpeed: previous.motionSpeed }
              : {}),
          };
    }),
  };
  for (let i = 2; i < result.clips.length; i++)
    if (
      result.clips[i].motion === result.clips[i - 1].motion &&
      result.clips[i].motion === result.clips[i - 2].motion
    )
      result.clips[i].motion =
        result.clips[i].motion === "zoom-in" ? "zoom-out" : "zoom-in";
  validateTimeline(result);
  return result;
}
export const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
