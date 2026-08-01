# Inkwell Desktop (Electron)

Inkwell ka native desktop version — Windows, macOS aur Linux ke liye.

## Kaise chalayein (development)

```bash
# 1. Web app ka dev server chalao
npm run dev

# 2. Doosre terminal me Electron window kholo
npm run electron:dev
```

## Desktop app build karo

```bash
# Pehle web build banao, phir installer banao
npm run build
npm run electron:build
```

Installer `release/` folder me banega:

| OS | File |
|---|---|
| Windows | `Inkwell Setup x.x.x.exe` (NSIS installer) + portable `.exe` |
| macOS | `Inkwell-x.x.x.dmg` |
| Linux | `Inkwell-x.x.x.AppImage` + `.deb` |

## package.json me ye scripts chahiye

`package.json` tools se edit nahi hota, isliye ye scripts **manually** add karein:

```jsonc
{
  "main": "electron/main.cjs",
  "scripts": {
    "electron:dev": "concurrently -k \"npm run dev\" \"wait-on http://localhost:5173 && electron electron/main.cjs\"",
    "electron:build": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.sudhirdevops1.inkwell",
    "productName": "Inkwell",
    "files": ["dist/**/*", "electron/**/*"],
    "directories": { "output": "release" },
    "win": { "target": ["nsis", "portable"], "icon": "electron/icon.png" },
    "mac": { "target": ["dmg"], "icon": "electron/icon.png", "category": "public.app-category.productivity" },
    "linux": { "target": ["AppImage", "deb"], "icon": "electron/icon.png", "category": "Graphics" }
  }
}
```

Aur ye dev-dependencies install karein:

```bash
npm install -D electron electron-builder concurrently wait-on
```

## Icon

`electron/icon.png` (512×512 PNG) rakhein. `public/inkwell-icon.svg` ko PNG me convert karke use kar sakte hain.

## Capacitor (Android / iOS tablet) — optional

```bash
npm install -D @capacitor/cli
npm install @capacitor/core @capacitor/android
npx cap init Inkwell com.sudhirdevops1.inkwell --web-dir=dist
npm run build && npx cap add android && npx cap sync && npx cap open android
```
