# Decisions

1. Preserve official Remotion Electron Forge template for build/binary staging.
2. Pin remotion and every @remotion/\* package to 4.0.538; retain package-lock.json.
3. Shared frame data and composition drive Player and export, preventing preview/export divergence.
4. Use a session-token HTTP server bound to 127.0.0.1 rather than arbitrary file URLs.
5. Main validates project ownership and asset metadata. Preload exposes named operations only.
6. A Chromium decoder is required: nativeImage alone failed the actual WebP fixture. Canvas normalization also passed the EXIF orientation fixture in packaged tests.
7. Normalize to lossless full-resolution PNG and create separate thumbnails; this costs extra disk space but gives stable orientation/format handling.
8. Process images sequentially; one render job at a time. A queued render request is rejected while another is active.
9. Temporary MP4 is in output directory and renamed only after H.264/AAC, dimensions, frames and duration checks.
10. Include Chrome Headless Shell by default. Clean-machine physically offline verification remains separate from successful packaged testing on this machine.
11. Portable Windows folder is the delivery artifact. Installer/signing are follow-up distribution work.
12. React editor thumbnail img elements use native lazy loading; Remotion's Img rule stays enabled for all composition files.
