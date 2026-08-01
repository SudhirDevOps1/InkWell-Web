<div align="center">

<img src="public/inkwell.png" alt="Inkwell" width="110" style="border-radius: 22px;" />

# Inkwell Studio

### Infinite whiteboard · Mind maps · AI Diagramming · Media board — 100% free, offline-first

[![License: MIT](https://img.shields.io/badge/License-MIT-22d3ee?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![PWA](https://img.shields.io/badge/PWA-offline--first-6366f1?style=for-the-badge)](https://web.dev/progressive-web-apps/)

**Every feature is free. No account. No paywall. No watermark. No telemetry.**

[🌐 Live App](https://inkwell-web.pages.dev/) · [Features](#-features) · [Quick Start](#-quick-start) · [Docs](docs/00-START-HERE.md) · [Shortcuts](#-keyboard-shortcuts)

</div>

---

## 📖 About

**Inkwell Studio** is a production-grade digital whiteboard and mind-mapping workspace that runs entirely in your browser. It was built for **teachers, students, engineers and creators** who need a serious visual tool without a subscription.

Everything most whiteboard apps charge for — unlimited boards, image & video embedding, PDF export, AI diagram generation, presentation mode, shape recognition — is **free forever** in Inkwell.

Your data never leaves your device. Boards are stored in your browser's local storage, and the app keeps working with no internet connection after the first visit.

---

## ✨ Features

### 🎨 Drawing & Brush Studio
| Feature | Description |
|---|---|
| **6 brush presets** | Pen, Pencil, Marker, Brush, Calligraphy, Technical pen |
| **Pen size** | 1 – 40 px with slider and quick presets |
| **Opacity control** | 10 % – 100 % per stroke |
| **Stroke stabilizer** | 0 – 8 smoothing for stylus / finger drawing |
| **Pressure feel** | Real stylus pressure, or velocity-based thickness |
| **Highlighter** | Semi-transparent marker mode |
| **Laser pointer** | Temporary fading trail for presentations |
| **Draggable pen bar** | Move the toolbar anywhere on screen |

### 🔷 Shapes & Smart Recognition
- **20+ vector shapes** — rectangle, rounded box, circle, ellipse, diamond, triangle, hexagon, cloud, star, capsule, parallelogram, mind-map pill, frame, line, arrow
- **Draw-to-shape** — sketch a rough circle, rectangle, triangle, diamond or line and it snaps to a perfect geometric shape
- **Handwriting beautify (beta)** — write `A–Z` or `0–9` freehand and it converts to clean editable text
  - Multi-stroke aware (A, K, R, T, X, Y recognized even with 2–3 strokes)
  - Rotation & scale invariant
  - Multiple templates per letter for different writing styles
  - Works 100% offline using `$1 Unistroke Recognizer`
- **Rich text in sticky notes** — auto-format as you type:
  - Bullets: `-`, `*`, `•` → `•`
  - Numbers: `1.`, `2.` → numbered list
  - Checkboxes: `[ ]`, `[x]` → ✅ / 
  - Bold: `**text**` → **bold**
  - Italic: `*text*` → *italic*
  - Code: `` `code` `` → ⌨️ code
  - Arrows: `-->`, `=>` → → / ⇒
- **Snap to grid** — 20 px alignment for tidy diagrams

### 🧠 Mind Mapping
- Screenshot-style **Central Idea** layout with colourful branches
- **One-click `+` handles** on every node to spawn connected children
- **Smart connectors** — curved Bézier, straight, orthogonal elbow with auto anchor detection
- **Auto-layout** — radial mind map, hierarchical tree, horizontal flowchart
- **✨ Flowing particles** — animated energy dots travel along connections (toggleable)
- **Glowing connectors** — neon glow effect for presentations

### 🤖 AI Integration & Multi-Modal Generators
- **Interactive AI Generator** — Choose what to create:
  - 📝 **Markdown Mind Maps** (nested topics & concepts)
  - 📊 **Mermaid Diagrams** (Flowcharts, Architecture, Sequence, Mindmaps)
  - 🎨 **Visual Canvas Elements** (custom colored shape groups)
- **Multi-Provider Support** — Connect OpenAI (GPT-4o), Groq (free tier), OpenRouter, Together AI, Ollama (local offline AI), or custom OpenAI-compatible endpoints.
- **🔐 Secure Password-Masked API Keys** — API keys are stored strictly in `localStorage` in masked password form (`••••••••`), preventing screen-leak exposure during video calls or recordings.
- Built-in API connection validator to verify keys instantly.

### 🖼️ Media
- **Image upload** — file picker, drag-and-drop, or clipboard paste
- **Video embed** — YouTube, Vimeo, or direct MP4/WebM links
- **Local video** — play files from your device offline
- **Free GIF search** — Wikimedia Commons (keyless), with Giphy/Tenor fallback
- **500+ emoji** across 10 categories

### 📚 Excalidraw Compatibility
- Import `.excalidraw` scenes and `.excalidrawlib` libraries
- **Library shelf** — each library item appears as a thumbnail; click one to place it
- Export back to `.excalidraw` format
- Dark-theme-safe colour correction on import

### 🎯 Selection & Editing
- **Lasso selection** — draw freely around items to select them
- **Marquee selection** — classic drag-box
- **Multi-select resize** — scale a whole group from one handle (hold `Shift` for uniform)
- Group / ungroup, align, distribute, layer ordering, lock
- Rotate handle on every element
- Copy, paste, duplicate, arrow-key nudging

### 🖥️ Workspace
- **Multi-page boards** with tabs, rename, duplicate
- **Focus / Zen mode** — hide all UI, canvas only
- **Presentation mode** — clean classroom view
- **Teaching Canvas preset** — maximum board area
- **Draggable panels** — move properties panel and mini-map anywhere
- **Mini-map radar** for large boards
- **Undo / redo** with 50-step history

### ⚙️ Customization
- 10 canvas background presets + custom colour picker
- 4 grid types — dots, squares, blueprint, blank
- Toggle any panel independently
- Reduced motion, high contrast, compact UI
- 12 stroke colours, 15 fills, custom colour pickers
- 6 font families, sizes up to 64 px, text colour control

### 💾 Export & Offline
- **SVG · PNG · JPG · WEBP · PDF · `.flowtrack` · `.excalidraw`**
- **Export scope** — whole board or just the current selection
- **Scale** — 1× · 2× · 3× · 4× retina output
- **Padding** — adjustable 0–200 px margin around the artwork
- **Copy image** — put a PNG straight on the system clipboard
- Transparent / light / dark backgrounds
- Text keeps its line breaks, bullets and checklists in exports
### ⚡ PWA & Smooth Offline Performance
- **Installable Web App (PWA)** — Install directly onto Windows, macOS, Android, or iOS as a standalone app.
- **100% Offline Capability** — Works smoothly without internet after initial download.
- All drawing tools, local video playback, shape recognition, $1 Unistroke handwriting engine, mind map auto-layout, PDF export, and local storage auto-save function 100% offline.

---

## 🚀 Quick Start

### Run locally

```bash
git clone https://github.com/SudhirDevOps1/InkWell.git
cd InkWell
npm install
npm run dev
```

Open `http://localhost:5173`.

### Build for production

```bash
npm run build     # outputs a single-file bundle to dist/
npm run preview   # preview the production build
```

The build produces a **self-contained `dist/index.html`** — you can open it directly from disk, host it on any static server, or drop it on GitHub Pages.

### Deploy

| Platform | Command / Setting |
|---|---|
| **Vercel** | Import repo → framework `Vite` → deploy |
| **Netlify** | Build `npm run build`, publish `dist` |
| **GitHub Pages** | Push `dist/` to `gh-pages` branch |
| **Any static host** | Upload the `dist` folder |

---

## 💡 Rich Text in Notes

Double-click any sticky note or text box to open the **rich text editor**. It has a real formatting toolbar and smart list handling.

### Toolbar

| Button | Action | Shortcut |
|---|---|---|
| ☰ | Bullet list | `Ctrl` + `Shift` + `8` |
| 1☰ | Numbered list | `Ctrl` + `Shift` + `7` |
| ☑ | Checklist | `Ctrl` + `Shift` + `C` |
| ⇥ | Indent | `Tab` |
| ⇤ | Outdent | `Shift` + `Tab` |
| **B** | Bold | `Ctrl` + `B` |
| *I* | Italic | `Ctrl` + `I` |
| `<>` | Inline code | — |
| → | Insert arrow | — |
| ⌫ | Clear list formatting | — |

### Smart typing

| You type | You get |
|---|---|
| `- item` | `• item` |
| `1. item` | `1. item` |
| `[ ] task` | `☐ task` |
| `[x] done` | `☑ done` |
| `**bold**` | 𝗯𝗼𝗹𝗱 |
| `*italic*` | 𝘪𝘵𝘢𝘭𝘪𝘤 |
| `` `code` `` | ｢code｣ |
| `-->` `=>` `<-` | → ⇒ ← |
| `(c)` `(r)` `(tm)` | © ® ™ |
| `...` | … |

**Enter** continues the current list automatically. Pressing **Enter** on an empty list item exits the list.

**Save:** `Ctrl` + `Enter` · **New line:** `Enter` · **Cancel:** `Esc`

Notes and text boxes **auto-grow** so nothing is ever clipped.

---

## ⌨️ Keyboard Shortcuts

<details open>
<summary><b>Tools</b></summary>

| Action | Shortcut |
|---|---|
| Selection | `V` or `1` |
| Hand (pan) | `H` |
| Rectangle | `R` or `2` |
| Diamond | `D` or `3` |
| Ellipse | `O` or `4` |
| Arrow | `A` or `5` |
| Line | `L` or `6` |
| Draw | `P` or `7` |
| Text | `T` or `8` |
| Insert image | `9` or `I` |
| Eraser | `E` or `0` |
| Frame | `F` |
| Laser pointer | `K` |
| Sticky note | `S` |
| Highlighter | `M` |
| Lasso selection | `Shift` + `L` |
| Toggle draw-to-shape | `Shift` + `X` |

</details>

<details>
<summary><b>Editor</b></summary>

| Action | Shortcut |
|---|---|
| Edit text / label | Double-click |
| New line (editor) | `Enter` |
| Save text | `Ctrl` + `Enter` |
| Cancel editing | `Esc` |
| Delete selection | `Delete` |
| Cut / Copy / Paste | `Ctrl` + `X` / `C` / `V` |
| Select all | `Ctrl` + `A` |
| Add to selection | `Shift` + click |
| Duplicate | `Ctrl` + `D` |
| Undo / Redo | `Ctrl` + `Z` / `Ctrl` + `Y` |
| Group / Ungroup | `Ctrl` + `G` / `Ctrl` + `Shift` + `G` |
| Send back / Bring front | `Ctrl` + `[` / `Ctrl` + `]` |
| Nudge 1 px / 10 px | Arrows / `Shift` + Arrows |
| Pen size − / + | `[` / `]` |

</details>

<details>
<summary><b>View</b></summary>

| Action | Shortcut |
|---|---|
| Zoom in / out | `Ctrl` + `+` / `Ctrl` + `-` |
| Reset zoom | `Ctrl` + `0` |
| Zoom to fit | `Shift` + `1` |
| Zoom at pointer | `Ctrl` + Scroll |
| Pan canvas | Scroll or `Space` + drag |
| Zen / Focus mode | `Alt` + `Z` or `Z` |
| Snap to grid | `Alt` + `S` |
| Toggle grid | `Ctrl` + `'` |
| Presentation mode | `Shift` + `P` |
| Fullscreen | `F11` |

</details>

---

## 📖 Documentation

Full docs in [`docs/`](docs/00-START-HERE.md):

| Doc | Topic |
|---|---|
| [00 Start Here](docs/00-START-HERE.md) | Index + learning paths |
| [01 Requirements](docs/01-REQUIREMENTS.md) | Prerequisites + free links |
| [02 Architecture](docs/02-ARCHITECTURE.md) | System design |
| [03 Features](docs/03-FEATURES.md) | Every feature |
| [04 Folder Structure](docs/04-FOLDER-STRUCTURE.md) | File roles |
| [05 Data Model](docs/05-DATA-MODEL.md) | Types + storage |
| [06 Setup](docs/06-SETUP.md) | Run · build · deploy |
| [07 Recognition](docs/07-RECOGNITION.md) | Shape + handwriting engine |
| [08 Contributing](docs/08-CONTRIBUTING.md) | Add features safely |
| [09 FAQ](docs/09-FAQ.md) | Common questions |
| [10 Glossary](docs/10-GLOSSARY.md) | A–Z terms |

## 🖥️ Desktop App (Electron)

Native Windows / macOS / Linux build — see [electron/README.md](electron/README.md).

```bash
npm install -D electron electron-builder concurrently wait-on
npm run build && npx electron-builder   # installers → release/
```

GitHub Actions (`.github/workflows/build.yml`) auto-builds web + desktop installers on version tags.

## 🧩 Tech Stack

```
React 19  ·  TypeScript 5.9  ·  Vite 7  ·  Tailwind CSS 4
lucide-react   — icon system
jsPDF          — PDF export
canvas-confetti — celebration effects
```

**Zero backend.** All state lives in the browser. All rendering is SVG.

### Project structure

```
src/
├── components/whiteboard/
│   ├── MindMapPage.tsx          # Orchestrator: state, history, keyboard
│   ├── WhiteboardCanvas.tsx     # SVG renderer, pointer & touch handling
│   ├── WhiteboardToolbar.tsx    # Header + left tool rail
│   ├── DrawingStudioBar.tsx     # Brush controls (compact / expanded)
│   ├── WhiteboardPropertiesPanel.tsx
│   ├── ConnectorPropertiesPanel.tsx
│   ├── LibraryPanel.tsx         # Excalidraw library shelf
│   ├── GifEmojiPicker.tsx       # Free GIF + emoji browser
│   ├── GenerateModal.tsx        # Mermaid / Markdown / AI
│   ├── AISetupModal.tsx         # Provider + API key config
│   ├── SettingsModal.tsx        # All customization toggles
│   ├── ExportShareModal.tsx     # SVG/PNG/PDF/JSON export
│   ├── TemplateGeneratorModal.tsx
│   ├── ShortcutsHelpModal.tsx
│   ├── WhiteboardMiniMap.tsx
│   └── ToolbarPopover.tsx       # Portal popovers (no clipping)
├── utils/
│   ├── whiteboardUtils.ts       # Geometry, layouts, templates
│   ├── shapeRecognition.ts      # Draw-to-shape engine
│   ├── handwritingRecognition.ts# $1 Unistroke recognizer
│   ├── excalidrawImport.ts      # .excalidraw / .excalidrawlib
│   ├── mermaidConvert.ts        # Mermaid + Markdown parsers
│   └── mediaHelpers.ts          # GIF search, URL normalizing
├── hooks/useDraggable.ts
└── types/whiteboard.ts
```

---

## 🗺️ Roadmap

- [ ] Real-time collaboration (WebRTC / Yjs)
- [ ] Electron desktop build
- [ ] Capacitor mobile / tablet build
- [ ] Cloud sync (optional, self-hostable)
- [ ] Full Mermaid support — sequence, class, ER, gantt
- [ ] Lowercase + cursive handwriting recognition
- [ ] Infinite canvas virtualization for 10 000+ elements
- [ ] Plugin API for custom shapes

---

## 🤝 Contributing

Contributions are welcome.

```bash
git checkout -b feature/your-feature
npm run dev
npm run build     # must pass before opening a PR
git commit -m "feat: describe your change"
git push origin feature/your-feature
```

Please keep the project **free of paywalls** — that is the core promise of Inkwell.

---

## 📜 License

Released under the **MIT License** — free for personal, educational and commercial use.

---

<div align="center">

**Built with ❤️ by [SudhirDevOps1](https://github.com/SudhirDevOps1)**

_Where ideas take shape — free, forever._

⭐ Star this repo if Inkwell helps you teach, learn or build.

</div>
