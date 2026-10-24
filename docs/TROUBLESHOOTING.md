# Troubleshooting

- node/npm not found: install Node.js 24 LTS and open a new PowerShell terminal.
- PowerShell blocks npm.ps1: use npm.cmd instead of npm.
- EXE exits with code 9 or interprets --app-smoke as a Node flag: remove ELECTRON_RUN_AS_NODE from that terminal before launch. This variable was present in the automation environment.
- First smoke/export downloads a browser: expected in development. package:win includes it by default; do not set REMOTION_ELECTRON_PACKAGE_BROWSER=false for offline distribution.
- Missing compositor/browser in EXE: keep the entire out application folder together and re-run package:win.
- Vite EBUSY under test: fixtures/generated must remain excluded from the renderer watcher.
- Too many images for voice: reduce image count or use longer voice; no images are silently discarded.
- Broken image / unsupported format: inspect actual bytes; renaming an unsupported file to .jpg does not convert it. Chromium decoding validates media.
- Export failure: inspect userData/logs/app.log; check output-folder write permissions, free disk space and source project files.
- Render progress may pause while composition/browser prepares. Cancel is applied before rendering or via Remotion cancel signal during rendering.
- app-smoke-error.txt can be stale. Use result JSON timestamp and exit status to assess the most recent run.
- No long-video speed or GPU acceleration claim is made. Benchmark on target hardware before large production workloads.
