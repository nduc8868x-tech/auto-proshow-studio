# Architecture

Electron Forge + Vite + React + TypeScript; based on remotion-dev/template-electron.

- src/shared/project.ts: Zod schema, types, frame allocation, deterministic presets, Auto Fit, timeline validation. No Node/Electron imports.
- src/preload.ts and src/app-api.ts: typed IPC allowlist. OS dropped file paths are obtained inside isolated preload with webUtils.getPathForFile.
- src/main/project-service.ts: UUID project storage, atomic JSON writes, canonical asset paths, original asset ownership validation, import and FFprobe verification.
- src/main/image-decoder.ts: isolated hidden Chromium image decoder for PNG/JPEG/WebP and EXIF normalization. Sequential processing bounds concurrent memory usage.
- src/main/media-server.ts: 127.0.0.1 dynamic-port HTTP server, session token, registered assets only, Range/HEAD support.
- src/shared/motion-settings.ts / motion-transform.ts: 0–10x global/per-image speed; default 3x, zero static, bounded contain motion. New projects default to contain-blur; explicit saved settings are preserved.
- src/shared/reorder-images.ts / src/App.tsx: timeline and library insertion ordering, native mouse drag with before/after targets and retained clip identity/settings.
- src/components/ProjectManager.tsx: compact project rows, duration and created/updated timestamps, search/sort, rename and Recycle Bin deletion. src/main/project-storage.ts verifies canonical project folders and rejects junctions before deletion; queue guards unfinished work.
- src/shared/subscribe.ts, src/components/SubscribeTimeline.tsx, remotion/SubscribeLayer.tsx: independent timed overlay track with pointer move/resize, position/size, loop/end hold and deterministic GIF frame selection. Frame assets are immutable, project-owned PNG sequences; timing edits never extend the slideshow/voice duration.
- templates/decoder.html and src/main/image-decoder.ts: sandboxed local secure decoder page enables WebCodecs ImageDecoder; GIF frames are green-keyed/cropped once. templates/subscribe.gif is the user-provided built-in sample, staged into the portable app with the decoder page. Frame URLs use the same authenticated media service as other assets.
- remotion/Slideshow.tsx: same composition for Player and MP4. Bounded foreground motion, full-resolution images, blur from same image, four TransitionSeries presentations.
- src/main.ts: trusted main-frame IPC validation, native dialogs, one active render, progress/cancel, temporary MP4 promoted after FFprobe verification.
- src/render-video.ts, src/remotion-bundle.ts, src/packaged-browser.ts: upstream bundle/compositor/browser layout retained. Production uses prebuilt composition and packaged browser.
- src/main/render-policy.ts: live NVENC probe; GPU ANGLE raster/compositing plus NVENC encoding, CPU fallback with its own worker budget. Up to 8 GPU frame workers, bounded by CPU/free memory/resolution. A browser is reused for composition selection and frame rendering within one export.
- ProjectService.renderView prepares padded, blurred background PNGs once using ImageDecoder's Chromium canvas, under the project's render-cache. Keys include asset identity/file metadata, blur and canvas dimensions. All workers share registered texture URLs; later exports reuse cache. remotion/BlurredBackground.tsx uses the prepared texture or falls back to CSS blur. Source photos and project schema are unchanged by preparation.

Timeline: D=ceil(voiceSeconds*fps); allocate D+(N-1)*T frames over N clips. Limit T to floor((D-N)/(N+1)) so every clip is at least 2\*T+1. Reject N>D. Store frame values and chosen effects in project JSON.

Fit: new project default is contain-blur. When auto is selected, relative log-ratio gap <= log(1.15) selects cover; otherwise contain-blur. Foreground scale stays <=1 in contain modes, with translations bounded by remaining margins. Background covers frame with overscan.

Projects contain relative media paths. Session media URLs are created on open and never saved to project JSON. New project and explicit save/import/preset/reorder operations persist data; arbitrary visual edits require Save.
