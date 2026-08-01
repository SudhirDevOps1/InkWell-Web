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
  const [outputType, setOutputType] = useState<"mindmap" | "architecture" | "flowchart" | "orgchart" | "sequence" | "stickies">("mindmap");
  const [prompt, setPrompt] = useState("Microservices e-commerce system with auth, payment gateway and notifications");
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
    return true;
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

    let systemPrompt = "";
    if (outputType === "architecture") {
      systemPrompt = "You create system architecture & cloud topology diagrams using Mermaid flowchart syntax. Use `graph LR` (Left-to-Right layout). Use nodes with brackets: `[Frontend UI]`, `[(Database)]`, `{{API Gateway}}`, `([Microservice])`. Connect components using labelled arrows (`-->|REST API|`). Output ONLY valid raw Mermaid code inside ```mermaid ``` block.";
    } else if (outputType === "flowchart") {
      systemPrompt = "You convert user processes into detailed Mermaid flowcharts. Use `graph TD` (Top-Down layout). Use decision nodes `{Condition?}`, action rectangles `[Step]`, start/end `((Start))`. Connect with labelled arrows (`-->|Yes|`). Reply ONLY with valid raw Mermaid code inside ```mermaid ``` block.";
    } else if (outputType === "sequence" || outputType === "orgchart") {
      systemPrompt = "You convert organizational structures or step sequences into structured Mermaid flowcharts. Use `graph TD`. Group levels clearly. Reply ONLY with valid raw Mermaid code inside ```mermaid ``` block.";
    } else if (outputType === "mindmap") {
      systemPrompt = "You convert user topics into rich, deeply nested Markdown outlines for Mind Maps. Use `# Main Central Theme`, `## Main Category Branch`, `### Sub-branch`, and nested `- Detailed point`. Include 4-6 main branches with 2-4 sub-points each. Reply ONLY with raw Markdown text without code block backticks.";
    } else {
      systemPrompt = "You organize concepts into a clean Markdown outline for a Kanban/Grid sticky notes board. Use `# Section Title` followed by `- Sticky item text`. Reply ONLY with raw Markdown text.";
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(aiConfig.apiKey ? { Authorization: `Bearer ${aiConfig.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
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
      const fenceMatch = text.match(/```(?:mermaid|markdown)?\s*([\s\S]*?)\s*```/i);
      const cleaned = fenceMatch ? fenceMatch[1].trim() : text.replace(/```/g, "").trim();
      if (!cleaned) {
        showToast("⚠️ Empty response from the model.");
        return;
      }

      if (outputType === "architecture" || outputType === "flowchart" || outputType === "sequence" || outputType === "orgchart") {
        setMermaidSrc(cleaned);
        if (!runMermaid(cleaned, `AI ${outputType}`)) setTab("mermaid");
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
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Choose What AI Should Create:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "mindmap", label: "🧠 Mind Map", desc: "Radial / Tree concept map" },
                    { id: "architecture", label: "🏗️ System Arch", desc: "Cloud & Database topology" },
                    { id: "flowchart", label: "📊 Flowchart", desc: "Process & Logic decisions" },
                    { id: "orgchart", label: "🏢 Org Structure", desc: "Hierarchy & Team roles" },
                    { id: "sequence", label: "⚡ User Journey", desc: "Step-by-step user path" },
                    { id: "stickies", label: "📝 Sticky Board", desc: "Grouped note cards" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setOutputType(opt.id as any)}
                      className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                        outputType === opt.id
                          ? "border-violet-500 bg-violet-500/20 text-white shadow-md shadow-violet-500/10"
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
                rows={4}
                placeholder="Describe what system, flowchart, mind map or user journey you want AI to draw…"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm text-white outline-none focus:border-violet-400"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Microservices e-commerce system with auth, DB & payment gateway",
                  "User onboarding & email verification flow",
                  "AI & Data Engineer learning roadmap",
                  "Company organizational chart with C-Suite & Leads",
                  "Customer support ticketing workflow",
                ].map((p) => (
                  <button key={p} onClick={() => setPrompt(p)} className="rounded-full bg-white/5 border border-white/5 px-2.5 py-1 text-[10px] text-slate-400 hover:text-white hover:border-violet-500/40">
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleAI}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 via-indigo-500 to-fuchsia-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 disabled:opacity-60 transition-all"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {busy ? "Generating Diagram…" : `Generate ${outputType.toUpperCase()}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
