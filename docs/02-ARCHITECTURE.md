[⬅️ Previous: Requirements](01-REQUIREMENTS.md) · [🏠 Index](00-START-HERE.md) · [➡️ Next: Features](03-FEATURES.md)

# 02 · System Architecture

Inkwell ek **local-first, single-page React app** hai. Koi server nahi — sab kuch browser me chalta hai.

## High-level architecture

```mermaid
flowchart TB
    subgraph UI[UI Layer]
        TB[WhiteboardToolbar]
        DSB[DrawingStudioBar]
        PP[PropertiesPanel]
        MODALS[Modals: Settings · Generate · AI · Export · Library]
    end
    subgraph CORE[Core]
        MMP[MindMapPage<br/>orchestrator + state]
        CANVAS[WhiteboardCanvas<br/>SVG renderer]
    end
    subgraph UTIL[Utilities]
        SR[shapeRecognition]
        HW[handwritingRecognition]
        MD[markdownRender]
        MM[mermaidConvert]
        EX[excalidrawImport]
        MEDIA[mediaHelpers]
    end
    STORE[(localStorage)]

    TB --> MMP
    DSB --> MMP
    PP --> MMP
    MODALS --> MMP
    MMP <--> CANVAS
    CANVAS --> SR
    CANVAS --> HW
    MMP --> MD
    MMP --> MM
    MMP --> EX
    MMP --> MEDIA
    MMP <--> STORE
```

---

## State management

Inkwell **local React state** use karta hai (no Redux). `MindMapPage` central orchestrator hai:

```mermaid
flowchart LR
    MMP[MindMapPage state] -->|boards, activeBoardId| CANVAS
    MMP -->|history, undo/redo| HIST[History stack]
    MMP -->|settings| SET[InkwellSettings]
    MMP -->|selectedIds| SEL[Selection]
    CANVAS -->|onAddElement / onUpdateElement| MMP
```

- **boards** — array of `WbBoard` (multi-page)
- **history** — 50-step undo/redo per board
- **settings** — persisted in `localStorage` (`inkwell_settings_v1`)
- **selectedIds / selectedConnId** — current selection

---

## Data flow: drawing a stroke

```mermaid
sequenceDiagram
    participant User
    participant Canvas as WhiteboardCanvas
    participant Rec as Recognition
    participant Page as MindMapPage
    participant LS as localStorage

    User->>Canvas: pointer down + move (pen)
    Canvas->>Canvas: collect points
    User->>Canvas: pointer up
    Canvas->>Rec: recognitionMode = shapes/handwriting/auto?
    Rec-->>Canvas: perfect shape OR letter OR raw ink
    Canvas->>Page: onAddElement(element)
    Page->>Page: pushChange() → history
    Page->>LS: autosave boards
```

---

## Rendering: pure SVG

Poora canvas ek **SVG element** hai. Har shape ek `<g>` group hai jisme `<rect>`, `<ellipse>`, `<path>` etc. hote hain. Pan/zoom ek transform se hota hai:

```
<g transform="translate(panX, panY) scale(zoom)"> ...elements... </g>
```

**Fayda:** infinite canvas, crisp at any zoom, easy export to SVG/PNG/PDF.

---

## Offline / PWA

```mermaid
flowchart LR
    FIRST[First visit online] --> SW[Service Worker caches shell]
    SW --> OFFLINE[Next visits work offline]
    OFFLINE --> LS[(Boards in localStorage)]
```

---

[⬅️ Previous: Requirements](01-REQUIREMENTS.md) · [🏠 Index](00-START-HERE.md) · [➡️ Next: Features](03-FEATURES.md)
