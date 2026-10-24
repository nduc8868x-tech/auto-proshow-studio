# Queue, portable GPU mode, overlays and image formats

Implemented:

- Persistent sequential render queue, per-job cancel, pause/resume, failure continuation, frozen project snapshots and duplicate-active-output protection.
- Queue survives restart; pending items reopen paused. Interrupted active jobs become failed; no automatic overwrite/retry.
- Auto NVENC support probes an actual PNG frame with bundled FFmpeg on the current machine. No GPU model is hardcoded. CPU compatibility mode is available.
- Default frame concurrency adapts to CPU/free RAM and is capped at four. User override is capped by the same safe budget.
- GPU raster via ANGLE is requested with NVENC; hardware render errors retry with software encoding/raster. No general speed guarantee.
- Full-duration white title strip, editable red text, editable/replaceable logo on right. Shared composition for preview/export. Overlay is outside TransitionSeries so it stays fixed through transitions.
- Additive project defaults keep old projects readable.
- AVIF, JFIF, GIF, BMP, ICO and SVG join JPG/PNG/WebP. File bytes determine the decoder format, including incorrectly named downloads.
- Import reports selected/success/error counts and filenames; corrupt files do not silently disappear. HEIC/TIFF are not claimed supported; use All files to receive an explicit error or convert them first.

Validated on development machine:

- Lint/typecheck and 18 unit/integration tests passed.
- Dev app smoke passed: 16/16 mixed images including five AVIF fixtures, corrupt-image report, EXIF, replacement logo, title persistence, first/middle/last banner pixels, rendering, queue and cancellation.
- NVENC probe initially failed because Remotion FFmpeg lacks rawvideo input; fixed by using a PNG probe.
- A complete 8-second 1080p fixture exported via NVIDIA NVENC with no fallback, three concurrent frames, approximately 10.5 seconds including setup/bundling. This is a small-fixture observation, not a large-workload benchmark.
- Packaged build test results are recorded in fixtures/generated/packaged-result.json; check its timestamp.

Portable distribution:
npm run package:portable writes release/auto-proshow-studio-win32-x64.
npm run zip:portable creates release/AutoProShowStudio-Windows-x64.zip.
Extract the whole folder on another Windows x64 PC. Auto mode probes that machine independently; no separate Node/FFmpeg/Chrome is expected because binaries are staged.
Actual clean-machine offline testing remains NOT RUN.

Official Remotion reference:
https://www.remotion.dev/docs/hardware-acceleration

Final packaged verification: PASS (exit 0). 8-second 1080p fixture completed using NVIDIA NVENC, 4 concurrent frames, no fallback, 8.074 seconds. A separate full CPU queued export completed successfully. White banner checks passed at first/middle/last frames. Mixed 16-image import including five AVIF files passed.
