/**
 * Rich-text normaliser for sticky notes and text boxes.
 *
 * Runs when a label is saved so that plain markdown-ish typing becomes
 * clean display text. It is **idempotent** — running it twice produces the
 * same result, so text created by the editor toolbar is never mangled.
 *
 * Supported input → output
 *   - item      → • item
 *   * item      → • item
 *   1. item     → 1. item      (kept, spacing normalised)
 *   [ ] task    → ☐ task
 *   [x] task    → ☑ task
 *   **bold**    → 𝗯𝗼𝗹𝗱        (unicode math-bold)
 *   *italic*    → 𝘪𝘵𝘢𝘭𝘪𝘤       (unicode math-italic)
 *   `code`      → ｢code｣
 *   -> => <- <= → → ⇒ ← ⇐
 */

const BULLET = "•";
const TODO = "☐";
const DONE = "☑";

/* ── Unicode style maps ─────────────────────────────────────────── */
function toMathBold(input: string): string {
  return Array.from(input)
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d5d4 + (code - 65)); // A-Z
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d5ee + (code - 97)); // a-z
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7ec + (code - 48)); // 0-9
      return ch;
    })
    .join("");
}

function toMathItalic(input: string): string {
  return Array.from(input)
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d608 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d622 + (code - 97));
      return ch;
    })
    .join("");
}

/** Convert a single line's list prefix into display form. */
function normalizeLinePrefix(line: string): string {
  const indentMatch = line.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : "";
  const body = line.slice(indent.length);

  // Already-normalised prefixes are returned untouched (idempotent).
  if (body.startsWith(`${BULLET} `) || body.startsWith(`${TODO} `) || body.startsWith(`${DONE} `)) {
    return line;
  }

  // Checkbox: [ ] / [x] / [X] / [✓]
  const checkbox = body.match(/^\[([ xX✓✔])\]\s*(.*)$/);
  if (checkbox) {
    const checked = checkbox[1].trim() !== "";
    return `${indent}${checked ? DONE : TODO} ${checkbox[2]}`;
  }

  // Bullet: - * •
  const bullet = body.match(/^[-*•]\s+(.*)$/);
  if (bullet) return `${indent}${BULLET} ${bullet[1]}`;

  // Numbered: 1. / 1) — normalise spacing, keep the number
  const numbered = body.match(/^(\d+)[.)]\s*(.*)$/);
  if (numbered) return `${indent}${numbered[1]}. ${numbered[2]}`;

  return line;
}

function applyInlineStyles(line: string): string {
  let out = line;

  // Bold first so ** is not eaten by the italic rule.
  out = out.replace(/\*\*(.+?)\*\*/g, (_m, inner: string) => toMathBold(inner));
  out = out.replace(/__(.+?)__/g, (_m, inner: string) => toMathBold(inner));

  // Italic: single * or _ not adjacent to another marker.
  out = out.replace(/(^|[^*\w])\*([^*\n]+?)\*(?![*\w])/g, (_m, pre: string, inner: string) => pre + toMathItalic(inner));
  out = out.replace(/(^|[^_\w])_([^_\n]+?)_(?![_\w])/g, (_m, pre: string, inner: string) => pre + toMathItalic(inner));

  // Inline code
  out = out.replace(/`([^`\n]+?)`/g, (_m, inner: string) => `｢${inner}｣`);

  // Arrows (longest first)
  out = out
    .replace(/<-->/g, "↔")
    .replace(/-->/g, "→")
    .replace(/<--/g, "←")
    .replace(/=>/g, "⇒")
    .replace(/<=/g, "⇐")
    .replace(/(^|\s)->(\s|$)/g, "$1→$2")
    .replace(/(^|\s)<-(\s|$)/g, "$1←$2");

  // Typographic helpers
  out = out
    .replace(/\(tm\)/gi, "™")
    .replace(/\(c\)/gi, "©")
    .replace(/\(r\)/gi, "®")
    .replace(/(^|\s)--(\s|$)/g, "$1—$2")
    .replace(/\.\.\./g, "…");

  return out;
}

export function formatRichText(input: string): string {
  if (!input) return "";
  return input
    .split(/\r?\n/)
    .map((line) => applyInlineStyles(normalizeLinePrefix(line)))
    .join("\n");
}

/** Convert display text back to editable plain syntax. */
export function parseRichText(formatted: string): string {
  if (!formatted) return "";
  return formatted
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^(\s*)☑\s/, "$1[x] ")
        .replace(/^(\s*)☐\s/, "$1[ ] ")
        .replace(/^(\s*)•\s/, "$1- ")
        .replace(/｢([^｣]+)｣/g, "`$1`")
        .replace(/↔/g, "<-->")
        .replace(/→/g, "->")
        .replace(/←/g, "<-")
        .replace(/⇒/g, "=>")
        .replace(/⇐/g, "<=")
    )
    .join("\n");
}

/** True when the text contains anything worth normalising. */
export function hasRichFormatting(text: string): boolean {
  if (!text) return false;
  const patterns = [
    /^\s*[-*•]\s+/m,
    /^\s*\d+[.)]\s+/m,
    /^\s*\[[ xX✓✔]\]/m,
    /^\s*[☐☑]\s/m,
    /\*\*.+?\*\*/,
    /__.+?__/,
    /(^|[^*\w])\*[^*\n]+?\*(?![*\w])/,
    /`[^`\n]+`/,
    /-->|<--|<-->|=>|<=/,
    /(^|\s)->(\s|$)/,
    /\(tm\)|\(c\)|\(r\)/i,
    /\.\.\./,
  ];
  return patterns.some((p) => p.test(text));
}

/** Toggle a checklist item at a given display line (used by canvas clicks). */
export function toggleChecklistLine(text: string, lineIndex: number): string {
  const lines = text.split(/\r?\n/);
  if (lineIndex < 0 || lineIndex >= lines.length) return text;
  const line = lines[lineIndex];
  if (line.includes(TODO)) lines[lineIndex] = line.replace(TODO, DONE);
  else if (line.includes(DONE)) lines[lineIndex] = line.replace(DONE, TODO);
  return lines.join("\n");
}
