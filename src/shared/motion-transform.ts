import type { Motion } from "./project";
import { motionSettings } from "./motion-settings";
export function motionTransform(
  motion: Motion,
  frame: number,
  duration: number,
  speed: number,
  safe: boolean,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
) {
  const rate =
      motion === "none"
        ? 0
        : Math.min(motionSettings.max, Math.max(motionSettings.min, speed)),
    t = Math.min(1, Math.max(0, frame / Math.max(1, duration - 1))),
    progress = t * t * (3 - 2 * t),
    span = (safe ? 0.04 : 0.08) * rate;
  const scale =
    rate === 0
      ? 1
      : motion === "zoom-in"
        ? safe
          ? 1 - span + span * progress
          : 1.02 + span * progress
        : motion === "zoom-out"
          ? safe
            ? 1 - span * progress
            : 1.02 + span * (1 - progress)
          : motion === "none"
            ? 1
            : safe
              ? 1 - span
              : 1 + 0.1 * rate;
  const factor = Math.min(width / imageWidth, height / imageHeight),
    fw = imageWidth * factor,
    fh = imageHeight * factor;
  const dx = safe
      ? Math.max(0, (width - fw * scale) / 2) * (1 - Math.pow(0.4, rate))
      : width * 0.025 * rate,
    dy = safe
      ? Math.max(0, (height - fh * scale) / 2) * (1 - Math.pow(0.4, rate))
      : height * 0.025 * rate;
  const x =
      rate === 0
        ? 0
        : motion === "pan-left"
          ? (1 - 2 * progress) * dx
          : motion === "pan-right"
            ? (2 * progress - 1) * dx
            : 0,
    y =
      rate === 0
        ? 0
        : motion === "pan-up"
          ? (1 - 2 * progress) * dy
          : motion === "pan-down"
            ? (2 * progress - 1) * dy
            : 0;
  return {
    scale,
    x,
    y,
    fw,
    fh,
    progress,
    rate,
    transform: `translate(${x}px,${y}px) scale(${scale})`,
  };
}
