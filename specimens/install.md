# Building VCP Editor for Distribution

## Windows Installer

### Prerequisites

1. **Install Windows build tools** (if not already installed):
   - Install [Microsoft Visual Studio](https://visualstudio.microsoft.com/) with C++ build tools
   - Or install the standalone [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)

### Configure Bundle Settings

Edit `src-tauri/tauri.conf.json` to configure the installer:

```json
{
  "bundle": {
    "identifier": "com.vcpeditor.app",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "targets": ["msi", "nsis"],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    }
  }
}
```

### Build the Installer

```bash
npm run tauri build
```

This command will:
1. Build the React frontend in production mode
2. Compile the Rust backend
3. Create Windows installers in `src-tauri/target/release/bundle/`

### Available Installer Formats

- **MSI** - Microsoft Installer package
  - Location: `src-tauri/target/release/bundle/msi/`
  - Standard Windows installer format
  
- **NSIS** - Nullsoft Scriptable Install System
  - Location: `src-tauri/target/release/bundle/nsis/`
  - Creates a `.exe` installer

### Distribution

The generated installers in `src-tauri/target/release/bundle/` are ready to distribute to Windows users.

## macOS Installer

### Prerequisites

- Xcode Command Line Tools: `xcode-select --install`

### Build

```bash
npm run tauri build
```

Outputs:
- **DMG**: `src-tauri/target/release/bundle/dmg/`
- **App Bundle**: `src-tauri/target/release/bundle/macos/`

## Linux Installer

### Prerequisites

Install development dependencies:

```bash
# Debian/Ubuntu
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel

# Arch
sudo pacman -S webkit2gtk-4.1 \
  base-devel \
  curl \
  wget \
  file \
  openssl \
  libappindicator-gtk3 \
  librsvg
```

### Build

```bash
npm run tauri build
```

Outputs:
- **AppImage**: `src-tauri/target/release/bundle/appimage/`
- **DEB**: `src-tauri/target/release/bundle/deb/`

## Code Signing (Optional)

For production releases, you should sign your installers:

### Windows
Add certificate details to `tauri.conf.json`:
```json
"windows": {
  "certificateThumbprint": "YOUR_CERT_THUMBPRINT",
  "digestAlgorithm": "sha256",
  "timestampUrl": "http://timestamp.digicert.com"
}
```

### macOS
Configure in `tauri.conf.json`:
```json
"macOS": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)",
  "entitlements": null
}
```

## Troubleshooting

### Build fails on Windows
- Ensure Visual Studio Build Tools are installed
- Check that Rust is up to date: `rustup update`

### Build fails on macOS
- Install Xcode Command Line Tools: `xcode-select --install`
- Accept Xcode license: `sudo xcodebuild -license accept`

### Build fails on Linux
- Ensure all development dependencies are installed
- Check webkit2gtk version matches system requirements
