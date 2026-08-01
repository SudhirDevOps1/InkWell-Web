[⬅️ Previous: Setup](06-SETUP.md) · [🏠 Index](00-START-HERE.md) · [➡️ Next: Contributing](08-CONTRIBUTING.md)

# 07 · Recognition Engine

Inkwell do tarah ki recognition karta hai: **shapes** aur **handwriting**. Dono ek **single mode** se control hote hain taaki conflict na ho.

## Recognition mode (Settings)

```mermaid
flowchart TD
    STROKE[Pen stroke complete] --> MODE{recognitionMode?}
    MODE -->|off| INK[Keep raw ink]
    MODE -->|shapes| SHAPE[recognizeShape]
    MODE -->|handwriting| HW[recognizeStrokes]
    MODE -->|auto| TRY[Try shape first]
    TRY -->|found| SHAPE
    TRY -->|none| HW
    SHAPE -->|match| PERF[Perfect shape]
    SHAPE -->|no match| INK
    HW -->|confident| TEXT[Clean text]
    HW -->|unsure| INK
```

> **Ye fix kyun important tha:** pehle shapes aur handwriting dono ON hote the, toh square banane pe circle ya galat letter ban jaata tha. Ab ek time pe sirf ek mode chalta hai.

---

## Shape recognition (`shapeRecognition.ts`)

```mermaid
flowchart LR
    PTS[Points] --> CLOSED{Closed loop?}
    CLOSED -->|No| LINE[Straight line test]
    CLOSED -->|Yes| SIMP[RDP simplify]
    SIMP --> CORNERS[Count sharp corners]
    CORNERS -->|3| TRI[Triangle]
    CORNERS -->|4 corners| RECT[Rectangle]
    CORNERS -->|4 midpoints| DIA[Diamond]
    CORNERS -->|~0| CIRC[Circle / Ellipse]
```

**Technique:**
- **Ramer–Douglas–Peucker** simplification se real corners nikalte hain
- **Turn angle** > 45° = sharp corner
- Corner count + placement → triangle / rectangle / diamond
- Low radial spread + no corners → circle

---

## Handwriting recognition (`handwritingRecognition.ts`)

**$1 Unistroke Recognizer** (Wobbrock 2007) + multi-stroke buffer:

```mermaid
sequenceDiagram
    participant U as User
    participant C as Canvas
    participant B as Stroke Buffer
    participant R as $1 Recognizer

    U->>C: draw stroke 1 (e.g. "A" left leg)
    C->>B: buffer + show ink
    U->>C: draw stroke 2 (right leg)
    C->>B: buffer
    U->>C: draw stroke 3 (crossbar)
    Note over B: 900ms pause OR tool change
    B->>R: flush all strokes
    R->>R: resample · rotate · scale · match
    R-->>C: "A" (clean text) or keep ink
```

**Coverage:** A–Z, a–z, 0–9, `+ - = ? ! * /` — har glyph ke multiple variants for real handwriting.

**Accuracy tricks:**
- Resample to 64 points
- Rotation-invariant (thoda tirchha bhi chalega)
- Scale-independent
- Aspect-ratio bonus (I vs O, l vs D, - vs =)
- Stroke-count agreement bonus
- Confidence threshold 0.60 (random sketch reject)

---

> 💡 **Real-life analogy:** $1 recognizer ek "shape stamp collection" jaisa hai — aapki drawing ko har stamp se overlap karke sabse best match dhoondta hai.

Tune karne ke liye: `handwritingRecognition.ts` me `LETTER_TEMPLATES` me aur variants add karein.

---

[⬅️ Previous: Setup](06-SETUP.md) · [🏠 Index](00-START-HERE.md) · [➡️ Next: Contributing](08-CONTRIBUTING.md)
