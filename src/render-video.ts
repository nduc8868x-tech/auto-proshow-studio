import {
  type CancelSignal,
  ensureBrowser,
  makeCancelSignal,
  openBrowser,
  renderMedia,
  selectComposition,
} from "@remotion/renderer";
import path from "node:path";
import { rm } from "node:fs/promises";
import { type RenderResult, type RenderUpdate } from "./electron-api";
import { getCompositorPackage } from "./compositor-package";
import {
  bundleRemotionProject,
  getPrebuiltRemotionBundlePath,
  hasPrebuiltRemotionBundle,
} from "./remotion-bundle";
import { getPackagedBrowserPaths } from "./packaged-browser";
import { renderPolicy } from "./main/render-policy";
import type { SceneProps } from "./shared/project";
export type RenderDetails = {
  encoder: string;
  concurrency: number;
  fallback: boolean;
  elapsedMs?: number;
};
let devBundle: Promise<string> | null = null;
export async function renderVideo({
  isPackaged,
  projectRoot,
  outputPath,
  inputProps,
  onUpdate,
  cancelSignal,
  onDetails,
}: {
  isPackaged: boolean;
  projectRoot: string;
  outputPath: string;
  inputProps: SceneProps;
  onUpdate?: (u: RenderUpdate) => void;
  cancelSignal?: CancelSignal;
  onDetails?: (d: RenderDetails) => void;
}): Promise<RenderResult> {
  const started = Date.now(),
    localSignal = makeCancelSignal();
  let wasCancelled = false;
  cancelSignal?.(() => {
    wasCancelled = true;
    localSignal.cancel();
  });
  const cleanup = async () => {
    await rm(outputPath, { force: true });
    return { cancelled: true as const, outputPath: null };
  };
  const browserExecutable = isPackaged
    ? (getPackagedBrowserPaths({
        arch: process.arch,
        platform: process.platform,
        projectRoot,
      })?.packagedBrowserExecutablePath ?? null)
    : null;
  const compositor = getCompositorPackage({
    arch: process.arch,
    platform: process.platform,
  });
  const binaryDir = isPackaged
    ? path.join(
        path.dirname(projectRoot),
        "app.asar.unpacked/node_modules",
        compositor,
      )
    : path.join(projectRoot, "node_modules", compositor);
  const binariesDirectory = isPackaged ? binaryDir : null;
  try {
    onUpdate?.({ type: "status", message: "Chuẩn bị trình dựng video…" });
    await ensureBrowser({ browserExecutable });
    if (wasCancelled) return cleanup();
    let serveUrl: string;
    if (isPackaged) {
      if (!hasPrebuiltRemotionBundle(projectRoot))
        throw Error("Thiếu composition bundle. Hãy đóng gói lại ứng dụng.");
      serveUrl = getPrebuiltRemotionBundlePath(projectRoot);
    } else {
      devBundle ??= bundleRemotionProject({ projectRoot, onUpdate }).catch(
        (error) => {
          devBundle = null;
          throw error;
        },
      );
      serveUrl = await devBundle;
    }
    if (wasCancelled) return cleanup();
    const policy = await renderPolicy(
      binaryDir,
      inputProps.project.exportSettings?.mode ?? "auto",
      inputProps.project.exportSettings?.parallelFrames ?? 0,
      inputProps.project.video.width * inputProps.project.video.height,
    );
    let details: RenderDetails = {
      encoder: policy.encoder,
      concurrency: policy.concurrency,
      fallback: false,
    };
    onDetails?.(details);
    const run = async (gpu: boolean) => {
      const concurrency = gpu ? policy.concurrency : policy.cpuConcurrency;
      const chromiumOptions = gpu
        ? { gl: "angle" as const }
        : { gl: "swangle" as const };
      const browser = await openBrowser("chrome", {
        browserExecutable,
        chromiumOptions,
      });
      try {
        const composition = await selectComposition({
          serveUrl,
          id: "AutoSlideshow",
          inputProps,
          binariesDirectory,
          browserExecutable,
          chromiumOptions,
          puppeteerInstance: browser,
        });
        if (wasCancelled) return;
        onUpdate?.({
          type: "status",
          message:
            (gpu ? "GPU NVIDIA NVENC" : "CPU H.264") +
            " · " +
            concurrency +
            " frames đồng thời",
        });
        await renderMedia({
          composition,
          serveUrl,
          codec: "h264",
          audioCodec: "aac",
          pixelFormat: "yuv420p",
          hardwareAcceleration: gpu ? "required" : "disable",
          videoBitrate:
            composition.width * composition.height > 1280 * 720 ? "8M" : "5M",
          concurrency,
          outputLocation: outputPath,
          inputProps,
          binariesDirectory,
          browserExecutable,
          chromiumOptions,
          puppeteerInstance: browser,
          cancelSignal: localSignal.cancelSignal,
          onProgress: (p) =>
            onUpdate?.({
              type: "progress",
              stage: "rendering",
              progress: p.progress * 100,
            }),
        });
      } finally {
        await browser.close({ silent: true });
      }
    };
    try {
      await run(policy.gpu);
    } catch (error) {
      if (wasCancelled) return cleanup();
      if (!policy.gpu) throw error;
      // Hardware/driver/browser differences must not prevent exporting on another PC.
      await rm(outputPath, { force: true });
      details = {
        encoder: "CPU H.264",
        concurrency: policy.cpuConcurrency,
        fallback: true,
      };
      onDetails?.(details);
      onUpdate?.({
        type: "status",
        message: "GPU không hoàn tất được. Tự chuyển CPU…",
      });
      await run(false);
    }
    if (wasCancelled) return cleanup();
    onDetails?.({ ...details, elapsedMs: Date.now() - started });
    return { cancelled: false, outputPath };
  } catch (error) {
    await rm(outputPath, { force: true });
    if (wasCancelled) return cleanup();
    throw error;
  }
}
