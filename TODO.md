# Remaining verification

- Test this portable build on a clean Windows x64 machine with networking physically disconnected, without separate Node/FFmpeg/Chrome.
- Test actual AMD/Intel/no-GPU hardware; CPU mode is exercised on the current NVIDIA development PC.
- Benchmark sustained 100–200 image, 10–20 minute voice exports and measure CPU/RAM/wall time. Do not extrapolate the 8-second fixture.
- Test full disk, lost output permissions and abrupt power loss during export/queue persistence.
- HEIC/HEIF/TIFF codecs are not included; unsupported files must be converted or explicitly reported.
- Manually test large user photo sets, OS drag/drop and MP3 playback on destination machines.
- Add installer/code signing if needed. Portable folder/ZIP is the current delivery format.
- Media checksums, configurable import limits, per-job verbose log controls and a virtualized grid remain follow-ups.
- Review development-tool dependency advisories; production audit previously reported zero vulnerabilities.

# Implemented since initial TODO

- Project duplication from header and project manager, with independent IDs and referenced media/frame copies; existing settings/timings preserved.
- New-project defaults: 180px title font and 7x motion speed. Explicit saved settings remain unchanged.
- Built-in evenly distributed Subscribe presets: 15x10s at X36/Y8/width29 and 5x2s at X25/Y11/width51; both green keyed and looping, with append/replace controls and fixed-duration validation.

- Queue for multiple videos, persisted snapshots, pause/resume, per-job cancel and continued processing after failure.
- GPU auto mode, actual NVENC probe, CPU fallback and adaptive parallel frame rendering.
- Editable full-video title and replaceable logo, with movable/resizable white strip and configurable font size.
- AVIF import and selected/imported/error counts; fixture test imports all 16 mixed images including 5 AVIF.
- First/middle/last-frame banner checks.
- Close confirmation when queued/running jobs exist.
- Global and per-image motion speed from 0x to 10x, default 3x for new projects, preserved on save/reopen and preset changes, without changing voice/timeline length. Zero stops foreground/background movement.
- Compact project manager rows with names, duration, created/updated times, search/sort, rename, create/open and confirmed Recycle Bin deletion; queued/active exports prevent deletion.
- Preview pointer drag/resize, title layout presets, X/Y/size/font controls, long-title auto-fit and backward-compatible project defaults.
- Native timeline drag/drop insertion in both directions; saves order and retains per-image settings and voice duration.
- New project defaults to blurred-photo background; GPU rendering supports up to 8 frame workers subject to CPU/RAM/resolution budgets, cached blur textures and browser reuse within each export.
- Follow-up: automatic render-cache disk quota/eviction for many blur/resolution variants. Cache is regenerable and removed when its project is trashed.
- Subscribe GIF template track: built-in user-supplied animation, optional GIF import, green key/transparent union crop, per-frame timing, pointer move/resize, geometry/time/loop controls, save/reopen/queue integration and interval-limited rendering.
- Subscribe clips share one row; copy/paste buttons and Ctrl+C/V insert independent clips at the playhead with the original geometry/loop settings, reusing the asset. A selector supports overlapping intervals.
- Saved logo library shared across projects, content deduplication, multi-file logo import, reuse with project-owned copies and migration of current logos from older projects when opened.
- Subscribe preview pointer drag/resize with autosave, shared track/preview selection, aspect-preserving bounds and keyboard positioning.
- Direct thumbnail deletion works before voice import, redistributes remaining timeline images and retains source/project media needed by queued snapshots.
