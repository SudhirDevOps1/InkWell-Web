import { useEffect, useRef, useState } from "react";
import {
  List,
  ListOrdered,
  CheckSquare,
  IndentIncrease,
  IndentDecrease,
  Eraser,
  Bold,
  Italic,
  Code2,
  ArrowRight,
  Type,
  Eye,
  EyeOff,
} from "lucide-react";
import { renderMarkdown } from "../../utils/markdownRender";

interface TextEditorModalProps {
  open: boolean;
  elementType: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

type LineKind = "bullet" | "number" | "todo" | "done" | "plain";

const BULLET = "• ";
const TODO = "☐ ";
const DONE = "☑ ";

function detectKind(line: string): LineKind {
  const body = line.replace(/^\s*/, "");
  if (body.startsWith(BULLET.trim())) return "bullet";
  if (body.startsWith(TODO.trim())) return "todo";
  if (body.startsWith(DONE.trim())) return "done";
  if (/^\d+\.\s/.test(body)) return "number";
  return "plain";
}

function stripPrefix(line: string): { indent: string; text: string } {
  const indentMatch = line.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : "";
  let text = line.slice(indent.length);
  text = text
    .replace(/^•\s?/, "")
    .replace(/^☐\s?/, "")
    .replace(/^☑\s?/, "")
    .replace(/^\d+\.\s?/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/^\[[ xX]\]\s?/, "");
  return { indent, text };
}

export function TextEditorModal({
  open,
  elementType,
  value,
  onChange,
  onSave,
  onCancel,
}: TextEditorModalProps) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeKinds, setActiveKinds] = useState<Set<LineKind>>(new Set());
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (open) setTimeout(() => areaRef.current?.focus(), 40);
  }, [open]);

  // Track which list style the caret is currently on (for toolbar highlight)
  useEffect(() => {
    if (!open) return;
    const area = areaRef.current;
    if (!area) return;
    const update = () => {
      const start = area.selectionStart;
      const before = value.slice(0, start);
      const lineStart = before.lastIndexOf("\n") + 1;
      const lineEnd = value.indexOf("\n", start);
      const line = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);
      setActiveKinds(new Set([detectKind(line)]));
    };
    area.addEventListener("keyup", update);
    area.addEventListener("click", update);
    update();
    return () => {
      area.removeEventListener("keyup", update);
      area.removeEventListener("click", update);
    };
  }, [open, value]);

  if (!open) return null;

  /** Get the selected line range (expanded to full lines). */
  const getLineRange = () => {
    const area = areaRef.current;
    if (!area) return { start: 0, end: value.length };
    const selStart = area.selectionStart;
    const selEnd = area.selectionEnd;
    const start = value.lastIndexOf("\n", selStart - 1) + 1;
    let end = value.indexOf("\n", selEnd);
    if (end === -1) end = value.length;
    return { start, end };
  };

  const applyToLines = (transform: (line: string, index: number) => string) => {
    const { start, end } = getLineRange();
    const before = value.slice(0, start);
    const target = value.slice(start, end);
    const after = value.slice(end);
    const next = target.split("\n").map(transform).join("\n");
    const updated = before + next + after;
    onChange(updated);
    requestAnimationFrame(() => {
      const area = areaRef.current;
      if (!area) return;
      area.focus();
      area.setSelectionRange(start, start + next.length);
    });
  };

  const toggleBullet = () => {
    const { start, end } = getLineRange();
    const lines = value.slice(start, end).split("\n");
    const allBullets = lines.every((l) => !l.trim() || detectKind(l) === "bullet");
    applyToLines((line) => {
      if (!line.trim()) return line;
      const { indent, text } = stripPrefix(line);
      return allBullets ? indent + text : `${indent}${BULLET}${text}`;
    });
  };

  const toggleNumbered = () => {
    const { start, end } = getLineRange();
    const lines = value.slice(start, end).split("\n");
    const allNumbers = lines.every((l) => !l.trim() || detectKind(l) === "number");
    let counter = 0;
    applyToLines((line) => {
      if (!line.trim()) return line;
      const { indent, text } = stripPrefix(line);
      if (allNumbers) return indent + text;
      counter += 1;
      return `${indent}${counter}. ${text}`;
    });
  };

  const toggleTodo = () => {
    const { start, end } = getLineRange();
    const lines = value.slice(start, end).split("\n");
    const allTodo = lines.every(
      (l) => !l.trim() || detectKind(l) === "todo" || detectKind(l) === "done"
    );
    applyToLines((line) => {
      if (!line.trim()) return line;
      const kind = detectKind(line);
      const { indent, text } = stripPrefix(line);
      if (allTodo) {
        // toggle checked <-> unchecked, or remove when already checked
        return kind === "todo" ? `${indent}${DONE}${text}` : indent + text;
      }
      return `${indent}${TODO}${text}`;
    });
  };

  const indent = () => applyToLines((line) => (line.trim() ? "  " + line : line));
  const outdent = () => applyToLines((line) => line.replace(/^ {1,2}/, ""));

  const clearFormatting = () =>
    applyToLines((line) => {
      const { text } = stripPrefix(line);
      return text;
    });

  /** Wrap the current selection with markers (bold/italic/code). */
  const wrapSelection = (marker: string, fallback: string) => {
    const area = areaRef.current;
    if (!area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const updated = value.slice(0, start) + marker + selected + marker + value.slice(end);
    onChange(updated);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + marker.length, start + marker.length + selected.length);
    });
  };

  const insertAtCaret = (text: string) => {
    const area = areaRef.current;
    if (!area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const updated = value.slice(0, start) + text + value.slice(end);
    onChange(updated);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + text.length, start + text.length);
    });
  };

  /** Enter continues the current list automatically. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onSave();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    // Formatting shortcuts
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        wrapSelection("**", "bold");
        return;
      }
      if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        wrapSelection("*", "italic");
        return;
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      if (e.key === "8") {
        e.preventDefault();
        toggleBullet();
        return;
      }
      if (e.key === "7") {
        e.preventDefault();
        toggleNumbered();
        return;
      }
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        toggleTodo();
        return;
      }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) outdent();
      else indent();
      return;
    }
    if (e.key === "Enter") {
      const area = areaRef.current;
      if (!area) return;
      const pos = area.selectionStart;
      const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
      const line = value.slice(lineStart, pos);
      const kind = detectKind(line);
      if (kind === "plain") return; // default newline

      const { indent: ind, text } = stripPrefix(line);
      // Empty list item → exit the list
      if (!text.trim()) {
        e.preventDefault();
        const updated = value.slice(0, lineStart) + ind + value.slice(pos);
        onChange(updated);
        requestAnimationFrame(() => {
          area.focus();
          const caret = lineStart + ind.length;
          area.setSelectionRange(caret, caret);
        });
        return;
      }
      e.preventDefault();
      let prefix = "";
      if (kind === "bullet") prefix = BULLET;
      else if (kind === "todo" || kind === "done") prefix = TODO;
      else if (kind === "number") {
        const n = parseInt(line.trim(), 10) || 0;
        prefix = `${n + 1}. `;
      }
      const insertion = `\n${ind}${prefix}`;
      const updated = value.slice(0, pos) + insertion + value.slice(pos);
      onChange(updated);
      requestAnimationFrame(() => {
        area.focus();
        const caret = pos + insertion.length;
        area.setSelectionRange(caret, caret);
      });
    }
  };

  const ToolButton = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-cyan-500 text-slate-950"
          : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );

  const lineCount = value.split("\n").length;

  return (
    <div
      className="fixed inset-0 z-[195] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className={`w-full ${showPreview ? "max-w-3xl" : "max-w-lg"} overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl animate-zoom-in transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Edit label ({elementType}) · markdown + checklist
          </p>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/10 hover:text-white"
            title="Toggle live preview"
          >
            {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showPreview ? "Hide preview" : "Live preview"}
          </button>
        </div>

        {/* Formatting toolbar */}
        <div className="mt-2 flex flex-wrap items-center gap-1 border-b border-white/10 px-4 pb-3">
          <ToolButton onClick={toggleBullet} active={activeKinds.has("bullet")} title="Bullet list (Ctrl+Shift+8)">
            <List className="h-4 w-4" />
          </ToolButton>
          <ToolButton onClick={toggleNumbered} active={activeKinds.has("number")} title="Numbered list (Ctrl+Shift+7)">
            <ListOrdered className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            onClick={toggleTodo}
            active={activeKinds.has("todo") || activeKinds.has("done")}
            title="Checklist (Ctrl+Shift+C)"
          >
            <CheckSquare className="h-4 w-4" />
          </ToolButton>

          <span className="mx-1 h-5 w-px bg-white/10" />

          <ToolButton onClick={indent} title="Indent (Tab)">
            <IndentIncrease className="h-4 w-4" />
          </ToolButton>
          <ToolButton onClick={outdent} title="Outdent (Shift+Tab)">
            <IndentDecrease className="h-4 w-4" />
          </ToolButton>

          <span className="mx-1 h-5 w-px bg-white/10" />

          <ToolButton onClick={() => wrapSelection("**", "bold")} title="Bold (Ctrl+B)">
            <Bold className="h-4 w-4" />
          </ToolButton>
          <ToolButton onClick={() => wrapSelection("*", "italic")} title="Italic (Ctrl+I)">
            <Italic className="h-4 w-4" />
          </ToolButton>
          <ToolButton onClick={() => wrapSelection("`", "code")} title="Inline code">
            <Code2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton onClick={() => insertAtCaret(" → ")} title="Insert arrow">
            <ArrowRight className="h-4 w-4" />
          </ToolButton>
          <ToolButton onClick={() => insertAtCaret("— ")} title="Insert em dash">
            <Type className="h-4 w-4" />
          </ToolButton>

          <span className="mx-1 h-5 w-px bg-white/10" />

          <ToolButton onClick={clearFormatting} title="Clear list formatting">
            <Eraser className="h-4 w-4" />
          </ToolButton>
        </div>

        <div className="p-4">
          <div className={`grid gap-3 ${showPreview ? "md:grid-cols-2" : "grid-cols-1"}`}>
            <textarea
              ref={areaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={Math.min(16, Math.max(6, lineCount + 1))}
              spellCheck={false}
              className="w-full resize-y rounded-xl border border-cyan-400/70 bg-slate-950 p-3 text-sm leading-relaxed text-white outline-none transition-colors focus:border-cyan-300 font-mono"
              placeholder={"Type markdown…\n# Heading\n- bullet\n1. numbered\n- [ ] task\n**bold**  *italic*  `code`  > quote"}
            />
            {showPreview && (
              <div className="min-h-[8rem] overflow-y-auto rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                  Live preview
                </p>
                {value.trim() ? (
                  <div
                    className="ink-markdown text-sm leading-relaxed text-slate-100"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
                  />
                ) : (
                  <p className="text-xs text-slate-600">Preview appears here as you type…</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[10px] text-slate-500">
              <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono">Enter</kbd> new line ·{" "}
              <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono">Ctrl+Enter</kbd> or{" "}
              <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono">Esc</kbd> to save
            </p>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                className="rounded-lg bg-cyan-400 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-md transition-colors hover:bg-cyan-300"
              >
                Save (Ctrl+Enter)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
