# Building Windows executables from macOS / CI

This project can produce Windows installers/executables, but building for Windows on macOS requires extra tooling or CI. Below are two recommended approaches.

## 1) Recommended: Use CI (GitHub Actions)

The simplest and most reliable approach is to build Windows artifacts on Windows runners in CI (e.g. GitHub Actions `windows-latest`). Add a workflow that checks out the repo, installs Node + Rust, and runs `npm ci && npm run tauri build` on Windows — Tauri will produce an `.exe`/installer using the WiX toolset on Windows.

Benefits:
- No local cross-toolchain setup needed
- Proper code signing and installer generation using native tools

## 2) Local cross-build on macOS (advanced)

You can cross-compile locally, but this requires:

- Install the Rust target for Windows (GNU):

```bash
rustup target add x86_64-pc-windows-gnu
```

- Install a Windows-compatible linker (e.g. `mingw-w64`) on macOS:

```bash
brew install mingw-w64
```

- Optionally install `wine` to run or test Windows executables locally:

```bash
brew install --cask wine-stable
```

- Then run the npm script added to this repo:

```bash
npm run tauri:build:windows
```

Notes and caveats:
- Cross-building the installer (WiX/NSIS) may still require Windows tools. You may get a portable executable (`.exe`) but not a native installer without Windows-only tools.
- Code signing on Windows requires an appropriate code-signing certificate and platform tools.
- If you hit linker errors, ensure `CC_x86_64_pc_windows_gnu` / environment variables point to the mingw compilers; consult Rust cross-compilation docs.

## Troubleshooting
- If `tauri build --target x86_64-pc-windows-gnu` fails due to missing compilers, install `mingw-w64` or use Docker-based cross-builds (e.g. `rustembedded/cross`) or a CI Windows runner.
- For production builds and installers, use CI on Windows for reliability.

## Example CI job (GitHub Actions)

```yaml
name: Build Windows
on: [push]
jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: x86_64-pc-windows-gnu
      - name: Install dependencies
        run: npm ci
      - name: Build frontend
        run: npm run build
      - name: Build Tauri Windows bundle
        run: npm run tauri build
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: windows-bundle
          path: src-tauri/target/release/bundle
```

If you'd like, I can add a GitHub Actions workflow file (`.github/workflows/build-windows.yml`) and/or try a local cross-build attempt here (I may need additional environment permissions/tools to be installed). Let me know which option you prefer.