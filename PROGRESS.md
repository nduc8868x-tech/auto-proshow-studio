# Implementation and validation

## Phase 1 — Scaffold and shell

Official remotion-dev/template-electron cloned into the initially empty workspace.
Node.js 24.22.1 installed; npm 11.19.1. Vietnamese dark editor, typed preload, contextIsolation and sandbox.
npm run dev actually launched the Electron/Vite development flow. Development smoke rerun after fixture watcher repair: PASS with fresh electron-result.json.

## Phase 2 — Projects and imports

Atomic local project JSON, UUID assets, PNG thumbnails, natural order and schema validation.
Protected token/Range media server and canonical asset paths implemented.
Packaged integration PASS: PNG/JPEG/WebP import, WAV metadata, natural sort, reorder, save and reopen.
WebP initially failed nativeImage decoding; switched to Chromium decoder. Packaged WebP and rotated JPEG EXIF tests now PASS.

## Phase 3 — Timeline and fit

Integer frame allocation with exact duration and conservative overlap; rejects N>D.
Shared Remotion Player/export composition; voice audio; Auto Fit and same-image blurred background.
npm test: 12/12 PASS, including allocation sweeps, 100/200 image timelines, fit, schema, deterministic effects and media-server security/Range.

## Phase 4 — Editor

Six pan/zoom motions, none, four transitions, three presets, stable seed, reorder, clip motion/fit/transition controls.
Global blur/darkness/background scale/radius/shadow and three canvas profiles.
OS file drop implemented via native File handling inside isolated preload.
npm run lint: PASS with no warnings after fixing editor-only native img lint scope and hook dependencies.

## Phase 5 — Export

H.264/AAC, one active render, progress, cancel and temporary output promotion.
FFprobe validates codecs, dimensions, frame count and duration before successful completion.
npm run smoke:render: PASS — 8 seconds, 1280x720, 240 frames, H.264/AAC.
Packaged cancellation test: PASS — cancellation requested after rendering reaches 20%; partial output removed.
Initial fixture used FFmpeg color filter unavailable in Remotion binary; replaced with pure PNG fixture generator.

## Phase 6 — Packaging

npm run package:win: PASS. Portable EXE with compositor, prebuilt composition and Chrome Headless Shell created.
Actual EXE integration: PASS — PNG/JPEG/WebP, EXIF, voice, project persistence/reorder, preload/UI, 1080p render, MP4 validation and cancellation cleanup.
Evidence: fixtures/generated/packaged-result.json, packaged-editor.png, packaged-smoke.mp4.
Initial EXE attempt exited 9 because automation set ELECTRON_RUN_AS_NODE=1; removing that variable fixed launch.
Clean Windows machine with network physically disconnected: NOT RUN. Long-video stress rendering: NOT RUN.

## Commands actually completed

- npm install: PASS; lockfile created.
- npm run typecheck: PASS after repairing transition generics and upgrading Node types.
- npm test: PASS 12/12 (initial serialization assertion failure repaired).
- npm run lint: PASS.
- npm run smoke:render: PASS.
- npm run smoke:app: PASS (fresh result JSON; actual dev UI, import, EXIF, render and cancel).
- npm run package:win: PASS.
- Actual packaged --app-smoke: PASS (exit 0 and fresh result JSON).
- npm audit --omit=dev: PASS, 0 vulnerabilities.
- Full dependency audit at installation reported 29 vulnerabilities in development tooling; automatic breaking upgrades were not applied.

## Development harness issues

Earlier development smoke attempts were not counted as PASS: npm argument forwarding/Forge exit behavior could return zero without a result; tsx loader conflicted with the Vite Forge API; Vite watcher hit EBUSY on changing fixture files.
Use the Node ESM harness and verify a fresh electron-result.json. fixtures are now excluded from the watcher.

Final evidence: packaged-result.json and electron-result.json both report pass=true. Final runtime dependency audit: 0 vulnerabilities. Source formatting completed.

## Update — queue / portable GPU / title-logo / AVIF

- Added persistent queue with snapshots, pause/resume, per-job cancel, failure continuation and close confirmation.
- Added machine-local NVENC probe, CPU fallback/mode, adaptive frame parallelism, and development composition bundle reuse.
- Added editable title and replaceable logo on fixed white lower strip; shared preview/export overlay.
- Added AVIF and other common image formats; per-file success/failure reporting.
- npm run lint and npm test: PASS (18/18).
- npm run smoke:app: PASS with 16/16 mixed images including 5 AVIF, corrupt image reporting, first/middle/last overlay checks, two queued exports and cancel.
- Actual dev GPU render: NVIDIA NVENC, no fallback, 3 frames, 8s/1080p fixture in 10.488s.
- npm run package:portable: PASS; new app in release/auto-proshow-studio-win32-x64.
- Actual packaged test: PASS; NVENC and explicit CPU mode completed, queue order/cancel passed, 16/16 mixed images and first/middle/last title banner verified.
- See docs/UPDATE-QUEUE-GPU-OVERLAY.md for architecture and portability limits.

Final packaged smoke: exit 0, NVIDIA NVENC without fallback, 4 frame concurrency, 8.074s for the 8s/1080p fixture. CPU queued export also passed. ZIP includes the complete portable folder; use release rather than the older out folder.

## Update — title layout / project manager / motion speed

- Added shared percentage-based title geometry, X/Y/size/font controls, placement presets, long-title auto-fit and preview pointer drag/resize. Logo follows the banner; selection guides are editor-only.
- Added project cards with thumbnails/metadata, accent-insensitive search, sort, create/open, inline rename and native confirmed Recycle Bin deletion. Canonical-folder/UUID checks reject escaped paths/junctions; queued or active exports prevent deletion.
- Added global and per-clip 0.25x–3x motion speed. Safe pan travel increases throughout the range without cutting foreground images. Voice/timeline duration and queued snapshots remain stable; old projects receive defaults.
- Lint/typecheck: PASS. Unit/integration tests: 24/24 PASS, no skips.
- Development smoke: PASS (fresh electron-result.json, 2026-10-23). Actual pointer drag and corner resize persisted; UI rename and accent-insensitive search passed; fixture trash kept source/external export; pending export blocked deletion. Custom-position white banner verified in first/middle/last exported frames. NVIDIA NVENC and explicit CPU queued exports passed.
- Hidden smoke windows disable background throttling and wait for paint before screenshot capture; verified manager and selection screenshots visually.
- See docs/UPDATE-EDITOR-CONTROLS.md for usage and verification details.
- Portable build: PASS at release/editor-controls/auto-proshow-studio-win32-x64. The earlier release folder was in use by the user's open app, so the update was built separately without closing that session.
- Actual updated EXE smoke: PASS (exit 0 and fresh packaged-result.json). Pointer drag/resize, manager UI rename/search, safe trash and pending-export protection, 16 mixed images, first/middle/last custom banner, cancellation and queued CPU/NVENC exports passed. Small 8-second 1080p fixture: NVENC, 4 concurrent frames, no fallback, 6.783 seconds. This is not a long-video performance guarantee.
- Updated ZIP: PASS, 281700505 bytes. EXE, app.asar, browser, FFmpeg and updated portable instructions present; ZIP app.asar SHA-256 matches the tested build. Archive checksum sidecar and release/editor-controls/build-verification.json written.

## Update — 2026-10-24 defaults / timeline / project rows / export

- New projects default to 3x and contain-blur; speed limits changed to 0–10x, including per-image overrides. Zero yields a static foreground and background. Previously saved explicit settings are preserved.
- Timeline native mouse drag/drop supports before/after insertion markers, autoscroll and persisted ordering. Existing per-image settings and voice duration survive.
- Project manager now uses compact horizontal rows with names, duration, created/updated timestamps, open/rename/delete. Existing search/sort, Recycle Bin and busy-project protection remain.
- GPU policy supports up to 8 tabs bounded by CPU/free RAM/pixels; software fallback uses a separate CPU budget. Metadata selection and rendering reuse a browser within one export.
- Precomputed padded blur PNGs in project render-cache are shared by all frame workers and reused by later exports; CSS blur remains a fallback. Immutable UUID image responses can be cached by the private browser session.
- Lint/typecheck: PASS; 27/27 tests PASS, no skips. Actual development smoke PASS (fresh electron-result.json, 2026-10-24): defaults, 0/10 boundary UI save, native timeline drag, compact row timestamps/actions, title drag/resize, cached backgrounds reuse, mixed 16-image import, NVENC/CPU queue, cancellation and custom banner pixels.
- Same 24-second 1080p/30fps fixture (9 image slots, 3 unique generated textures, blur 32, speed 3), two measured runs after warmup on RTX 2060 SUPER, 12 logical CPUs, 15.8 GiB RAM: initial 4-frame pipeline 20.568s/16.995s (mean 18.7815s); final shared-cache/8-frame pipeline 15.206s/14.660s (mean 14.933s). Final measurements use prepared cached backgrounds; cache creation for three unique fixture images took 0.422s and is separate. Approximately 20.5% less measured render time; not a general/long-video guarantee. Experimental per-tab blur caching was replaced with shared disk assets after its 4-frame results were slower.
- Evidence: fixtures/performance-20261024/baseline.json and shared-cache-eight.json; scripts/benchmark-export.ts reproduces the local fixture. See docs/UPDATE-2026-10-24.md. Clean-machine and long-video stress remain untested.
- Final portable package and actual EXE smoke: PASS (exit 0, fresh packaged-result.json at 2026-10-24 02:47 local). NVENC, 8 frame workers, no fallback; 8-second smoke render 6.032s. Separate CPU queue export, title pixels, cache reuse, UI boundary saves, native timeline drag, row times/rename/search, safe fixture trash and cancellation passed. The packaged UI test waits for the full save/refresh cycle before the next edit to avoid racing a disabled Save button.
- Final ZIP: 281703898 bytes, critical EXE/browser/FFmpeg/app assets and current instructions verified; app.asar hash matches the tested 24/10 build. No fixture/project data in archive. SHA-256 sidecar and release/2026-10-24/build-verification.json written.

## Update — Subscribe GIF template track

- Included the user-provided download.gif as templates/subscribe.gif (61 frames, 2030 ms). Added a secure local decoder page because WebCodecs ImageDecoder is unavailable on data: pages; sandbox/contextIsolation remain enabled.
- Decode and green-key every frame, preserve white/red/black/alpha, despill edges, union-crop the animation, and store project-owned transparent PNG sequences. Repeated insertion reuses the same decoded asset. No new runtime dependency or source Downloads path is needed in the portable build.
- Added an independent Subscribe timeline track with built-in/custom GIF import, optional green removal for custom GIFs, real pointer time move/duration resize, start/duration/X/Y/size editing, loop/end hold and deletion. Project schema migrates old files to empty template arrays; asset metadata is immutable; queue snapshots retain schedule and asset IDs.
- Remotion selects frame by global video time and original per-frame duration. The overlay is present only inside its scheduled interval, above slideshow/title, with no changes to voice/image/video length.
- Corrected forwarding of prepared background props from Slideshow to ImageScene; the shared disk cache is now actually passed to the background renderer.
- Lint/typecheck and 31/31 tests PASS. Actual dev smoke and portable EXE smoke PASS (fresh results 2026-10-24). Covered all 61 frames/2030 ms, transparent corners/despill, animated frame differences, native pointer move/resize, numeric edits, loop, delete/reinsert/reuse, save/reopen. Exported pixel comparisons at 3.0/4.2s passed; overlay absent at 1/6s for a 2–5s schedule.
- Actual portable render: NVENC, 7 concurrent frames selected by current resource budget, no fallback, 7.609s for the 8s fixture with Subscribe. Existing AVIF/import/title/project/CPU queue/cancellation checks also passed. Clean-PC and long-video stress remain untested.
- Build: release/2026-10-24-subscribe/auto-proshow-studio-win32-x64. Usage: docs/SUBSCRIBE-TEMPLATE.md.
- ZIP verified: 281836982 bytes; critical runtime files and Subscribe instructions present, app.asar hash matches the tested EXE build, no project/fixture data included. Built-in GIF source SHA-256 matches the user's Downloads GIF. Archive SHA-256 sidecar and release/2026-10-24-subscribe/build-verification.json written.

## Update — Subscribe single row and copy/paste

- All Subscribe clips share one fixed-height timeline row. Existing schedules and overlaps are preserved; a clip selector provides access to overlapping clips.
- Added Copy and Paste at playhead buttons and Ctrl+C/V scoped to the Subscribe editor. Text/number/select inputs keep native shortcuts. Clicking empty track space seeks the playhead.
- Paste creates an independently editable/saved UUID clip, preserves asset/geometry/loop/duration, trims at video end and reuses decoded frames. Copy buffer is a snapshot for the current project and resets on project change.
- Lint/typecheck PASS; 32/32 tests PASS. Actual dev and packaged EXE smoke PASS. Covered buttons plus native keyboard input, same-row geometry, IDs, end trimming, overlapping selection, input shortcut exclusion, save/reopen and unchanged source. Existing Subscribe frame/export pixel, import, project, title, queue CPU/NVENC and cancellation checks passed.
- New portable: release/2026-10-24-subscribe-copy/auto-proshow-studio-win32-x64. Packaged sample: NVENC, 7 frame workers, no fallback, 6.342s for the 8-second fixture; no long-video performance claim.
- ZIP verified: 281838636 bytes; critical EXE/browser/FFmpeg/assets and updated copy/paste instructions present. ZIP app.asar hash matches the tested portable EXE build; no project/fixture data. Checksum sidecar and build-verification.json written.

## Update — reusable logos, Subscribe preview and image deletion

- Added a persistent logo library under user data, shared across projects. Multi-file imports automatically save normalized PNG/thumbnail pairs, deduplicate by content and reuse through a project-owned copy. Opening older projects migrates their current logo. Concurrent writes for the same content share one pending operation, avoiding Windows file locks.
- Added Subscribe preview selection, real pointer drag and aspect-preserving corner resize with autosave on release, keyboard nudging and shared selection with the timeline. Guides are editor-only; timeline intervals/voice duration stay unchanged.
- Added direct thumbnail delete buttons, including before voice import. Remaining images redistribute across voice duration, retain per-image settings, and the last image gives an empty preview. Source/project files are retained for queue snapshots.
- Lint/typecheck PASS, 34/34 tests PASS, including concurrent logo writes, library persistence/deduplication/path validation and preview bounds in landscape/portrait.
- Actual development smoke PASS: cross-project saved-logo UI reuse and deduplication, delete before voice/remaining/last image with unchanged voice, native Subscribe preview drag/resize autosave and exported pixels. Existing project/title/import/queue/copy/paste checks passed. Dev render used NVENC, 4 workers, no fallback; total preparation/render time 121.762s on this run. No performance improvement claim.
- New version: 1.0.1. Portable target: release/2026-10-24-logo-preview/auto-proshow-studio-win32-x64.
- Actual EXE 1.0.1 smoke PASS (fresh packaged-result.json): saved-logo UI reuse/deduplication and project-owned media, no-voice/remaining/last-photo deletion, native Subscribe preview movement/resize autosave, shared selection and exported pixel checks. Existing title, queue, CPU, AVIF and cancellation checks passed. NVENC, 4 workers, no fallback; 35.406s elapsed for this 8-second fixture. Machine load/preparation vary; no speedup claim.
- Final 1.0.1 ZIP verified: 281842486 bytes; runtime files/instructions present, archive app.asar matches the tested EXE, no fixture/project data. SHA-256 sidecar and release/2026-10-24-logo-preview/build-verification.json written.

## Update — 2026-10-26 project copy and Subscribe presets (1.0.2)

- New-project defaults are 7x global motion and 180px title font (1080p basis). Saved explicit values and project copies retain their settings; optional auto-fit can reduce displayed font size.
- Header and project-manager Copy actions save pending edits and open an independent project copy. Photos, voice, logo, templates and clips receive new identities; referenced PNG/audio/frame files are copied into the new project folder. Render caches regenerate and export jobs are not duplicated. Failed copies remove only the verified new target folder.
- Added preset 1 (15 clips x10s, X36/Y8/width29) and preset 2 (5 clips x2s, X25/Y11/width51). Both use the built-in green-keyed GIF and loop. Starts are evenly spaced from zero to total-duration, preserving exact per-clip duration. Default append; explicit Replace existing subs option. Video shorter than a clip duration is rejected; overlapping intervals on shorter videos are permitted and explained in the UI.
- Lint/typecheck PASS; 37/37 tests PASS. Native dev UI checks passed for both Copy buttons, independent media bytes/IDs, unchanged source, preset append/replace, exact geometry/timing, decoded-asset reuse and reopen. Full development smoke failed during headless-browser setup with a 30-second timeout; actual packaged validation is tracked separately.
- Replaced a fixed project-manager test sleep with a bounded wait for the current project row to load.
- Actual packaged EXE 1.0.2 smoke PASS: both Copy actions, independent media/frame IDs and bytes, preserved source/settings, exact preset counts/durations/positions, green key/loop/asset reuse, append/replace, save/reopen and new defaults. Existing pointer/queue/logo/import/title/cancellation checks and MP4 pixel comparisons passed. NVENC, 4 workers, no fallback; 8.617s for the 8-second fixture. The packaged prebuilt bundle exported successfully despite the development-bundle headless startup timeout.
- Final 1.0.2 ZIP verified: 281846783 bytes, critical runtime and instructions present, app.asar hash matches tested EXE, no project/fixture data. Checksum sidecar and release/2026-10-26-presets/build-verification.json written.
