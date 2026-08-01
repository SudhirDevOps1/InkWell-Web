import { useState } from "react";
import { X, GitBranch, FileText, Sparkles, Loader2, Settings2 } from "lucide-react";
import { parseMermaid, parseMarkdownOutline } from "../../utils/mermaidConvert";
import { AIConfig, resolveEndpoint, resolveModel } from "./AISetupModal";
import type { WbElement, WbConn } from "../../types/whiteboard";

interface GenerateModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (els: WbElement[], conns: WbConn[], title?: string) => void;
  aiConfig: AIConfig;
  onOpenAISetup: () => void;
  showToast: (msg: string) => void;
}

const MERMAID_SAMPLE = `graph TD
  A[User visits site] --> B{Logged in?}
  B -->|Yes| C[Show dashboard]
  B -->|No| D[Show login]
  D --> E[(Auth service)]
  E --> C
  C --> F((Done))`;

const MARKDOWN_SAMPLE = `# Product Launch
- Research
  - User interviews
  - Competitor scan
- Build
  - MVP
  - Beta test
- Launch
  - Marketing
  - Support`;

export function GenerateModal({
  open,
  onClose,
  onApply,
  aiConfig,
  onOpenAISetup,
  showToast,
}: GenerateModalProps) {
  const [tab, setTab] = useState<"mermaid" | "markdown" | "ai">("mermaid");
  const [mermaidSrc, setMermaidSrc] = useState(MERMAID_SAMPLE);
  const [mdSrc, setMdSrc] = useState(MARKDOWN_SAMPLE);
  const [outputType, setOutputType] = useState<"mindmap" | "flowchart" | "stickies">("mindmap");
  const [prompt, setPrompt] = useState("A CI/CD pipeline for a React app deployed to Vercel");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const runMermaid = (src: string, title: string) => {
    const parsed = parseMermaid(src);
    if (!parsed || parsed.els.length === 0) {
      showToast("⚠️ Could not parse that Mermaid syntax. Try `graph TD` flowchart style.");
      return false;
    }
    onApply(parsed.els, parsed.conns, title);
    showToast(`✅ Created ${parsed.els.length} nodes from Mermaid.`);
    onClose();
    return true;
  };

  const handleMarkdown = (srcToParse?: string) => {
    const parsed = parseMarkdownOutline(srcToParse || mdSrc);
    if (!parsed || parsed.els.length === 0) {
      showToast("⚠️ Add headings (#) or bullets (-) to build a mind map.");
      return;
    }
    onApply(parsed.els, parsed.conns, "Generated Mind Map");
    showToast(`✅ Created ${parsed.els.length} nodes from Markdown.`);
    onClose();
  };

  const handleAI = async () => {
    const endpoint = resolveEndpoint(aiConfig);
    const model = resolveModel(aiConfig);
    if (!endpoint || !model) {
      showToast("⚙️ Configure your AI provider first (free options available).");
      onOpenAISetup();
      return;
    }
    setBusy(true);

    const systemPrompt =
      outputType === "flowchart"
        ? "You convert descriptions into Mermaid flowcharts. Reply with ONLY a mermaid code block body starting with `graph TD` or `graph LR`. No prose, no backticks."
        : outputType === "mindmap"
        ? "You convert user topics into structured Markdown outlines for Mind Maps. Use `# Main Topic`, `## Subtopic`, and nested `- Bullet items`. Reply ONLY with the raw Markdown outline text. No prose, no markdown code block backticks."
        : "You summarize topics into bullet points for sticky note outlines. Use `# Title` and `- Note bullet`. Reply ONLY with raw Markdown text without code block backticks.";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(aiConfig.apiKey ? { Authorization: `Bearer ${aiConfig.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) {
        showToast(`⚠️ Provider error ${res.status}. Check AI setup.`);
        return;
      }
      const json = await res.json();
      const text: string =
        json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text ?? "";
      const cleaned = text.replace(/```(?:mermaid|markdown)?/gi, "").trim();
      if (!cleaned) {
        showToast("⚠️ Empty response from the model.");
        return;
      }

      if (outputType === "flowchart") {
        setMermaidSrc(cleaned);
        if (!runMermaid(cleaned, "AI Flowchart")) setTab("mermaid");
      } else {
        setMdSrc(cleaned);
        handleMarkdown(cleaned);
      }
    } catch {
      showToast("⚠️ Request failed (CORS/offline). Try Groq or a local Ollama endpoint.");
    } finally {
      setBusy(false);
    }
  };

  const aiReady = !!resolveEndpoint(aiConfig) && !!resolveModel(aiConfig);

  return (
    <div className="fixed inset-0 z-[175] flex items-center justify-center bg-black/60 p-3 backdrop-blur-md" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] border border-white/10 bg-slate-900 shadow-2xl animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">Generate Diagram</h2>
              <p className="text-[11px] text-slate-500">Mermaid · Markdown outline · AI text-to-diagram</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-white/5 px-4 pt-2">
          {([
            ["mermaid", "Mermaid", GitBranch],
            ["markdown", "Markdown", FileText],
            ["ai", "AI Prompt", Sparkles],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2 text-xs font-bold ${
                tab === id ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === "mermaid" && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400">
                Paste Mermaid flowchart syntax. Supports <code className="text-cyan-300">graph TD/LR</code>, node
                shapes <code className="text-cyan-300">[] () {"{}"} (())</code>, labels{" "}
                <code className="text-cyan-300">--&gt;|text|</code>, dashed <code className="text-cyan-300">-.-&gt;</code>.
              </p>
              <textarea
                value={mermaidSrc}
                onChange={(e) => setMermaidSrc(e.target.value)}
                rows={12}
                spellCheck={false}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 p-4 font-mono text-xs text-white outline-none focus:border-cyan-400"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setMermaidSrc(MERMAID_SAMPLE)} className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white">
                  Reset sample
                </button>
                <button
                  onClick={() => runMermaid(mermaidSrc, "Mermaid Diagram")}
                  className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                >
                  Convert to diagram
                </button>
              </div>
            </div>
          )}

          {tab === "markdown" && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400">
                Headings (<code className="text-cyan-300">#</code>) and nested bullets become a mind map.
              </p>
              <textarea
                value={mdSrc}
                onChange={(e) => setMdSrc(e.target.value)}
                rows={12}
                spellCheck={false}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 p-4 font-mono text-xs text-white outline-none focus:border-cyan-400"
              />
              <div className="flex justify-end">
                <button onClick={handleMarkdown} className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400">
                  Build mind map
                </button>
              </div>
            </div>
          )}

          {tab === "ai" && (
            <div className="space-y-3">
              <div
                className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-[11px] ${
                  aiReady
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/25 bg-amber-500/10 text-amber-300"
                }`}
              >
                <span>{aiReady ? `Ready · ${resolveModel(aiConfig)}` : "No AI provider configured yet"}</span>
                <button onClick={onOpenAISetup} className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 font-bold text-white hover:bg-white/20">
                  <Settings2 className="h-3 w-3" /> AI Setup
                </button>
              </div>

              {/* Output Target Selector */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Choose Output Type:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "mindmap", label: "🧠 Mind Map", desc: "Hierarchical tree layout" },
                    { id: "flowchart", label: "📊 Flowchart", desc: "Mermaid process diagram" },
                    { id: "stickies", label: "📝 Sticky Notes", desc: "Markdown topic outline" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setOutputType(opt.id as any)}
                      className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                        outputType === opt.id
                          ? "border-violet-500 bg-violet-500/15 text-white"
                          : "border-white/10 bg-slate-950/60 text-slate-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <span className="text-xs font-bold">{opt.label}</span>
                      <span className="text-[10px] opacity-75">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                placeholder="Describe what content, topic, flowchart or mind map you want to generate…"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm text-white outline-none focus:border-violet-400"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Microservices architecture with API gateway",
                  "Student exam preparation plan",
                  "Git branching workflow",
                  "Frontend framework comparison mind map",
                ].map((p) => (
                  <button key={p} onClick={() => setPrompt(p)} className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-slate-400 hover:text-white">
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAI}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {busy ? "Generating…" : `Generate ${outputType === "mindmap" ? "Mind Map" : outputType === "flowchart" ? "Flowchart" : "Sticky Notes"}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
