import React, { useState } from "react";
import {
  Sparkles,
  X,
  LayoutTemplate,
  CheckCircle2,
  Wand2,
  BookOpen,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  DIAGRAM_TEMPLATES,
  generateTemplateData,
  convertTextOutlineToDiagram,
} from "../../utils/whiteboardUtils";
import { WbElement, WbConn } from "../../types/whiteboard";

interface TemplateGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (els: WbElement[], conns: WbConn[], title?: string) => void;
  showToast: (msg: string) => void;
}

export const TemplateGeneratorModal: React.FC<TemplateGeneratorModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<"templates" | "outline">("templates");
  const [outlineText, setOutlineText] = useState(
    "Cloud Native Microservices\n• API Gateway & Auth Guard\n• User Account Service\n• Order & Billing Engine\n• Postgres Database\n• Redis Caching Layer\n• Kubernetes Cluster"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [templateSearch, setTemplateSearch] = useState("");

  if (!isOpen) return null;

  const handleSelectTemplate = (templateId: string, title: string) => {
    const { els, conns } = generateTemplateData(templateId);
    onApplyData(els, conns, title);
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }
    showToast(`✅ Loaded "${title}" template!`);
    onClose();
  };

  const handleGenerateFromOutline = () => {
    if (!outlineText.trim()) {
      showToast("⚠️ Please enter a few topics or an outline first.");
      return;
    }
    const { els, conns } = convertTextOutlineToDiagram(outlineText);
    onApplyData(els, conns, "AI Generated Diagram");
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }
    showToast(`✅ Generated diagram with ${els.length} nodes!`);
    onClose();
  };

  const handleLoadOCRNotes = () => {
    const raw =
      localStorage.getItem("flowtrack_temp_flashcard_input") ||
      localStorage.getItem("flowtrack_temp_notes_input") ||
      "";

    if (raw && raw.trim().length > 5) {
      setOutlineText(raw);
      showToast("📥 Imported notes from Study Workspace OCR!");
    } else {
      const sampleNotes =
        "React Performance Optimization\n• Code Splitting with React.lazy\n• Memoization (useMemo & useCallback)\n• Virtualized Lists for Big Data\n• Avoid Unnecessary Re-renders\n• Web Workers for Heavy Tasks\n• Optimize Asset Delivery";
      setOutlineText(sampleNotes);
      showToast("📥 Loaded sample high-yield study topics!");
    }
  };

  const filteredTemplates =
    (selectedCategory === "All"
      ? DIAGRAM_TEMPLATES
      : DIAGRAM_TEMPLATES.filter((t) => t.category === selectedCategory)
    ).filter((t) =>
      `${t.title} ${t.description} ${t.category}`
        .toLowerCase()
        .includes(templateSearch.trim().toLowerCase())
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                Diagram Templates & AI Generator
              </h2>
              <p className="text-xs text-slate-400">
                Start from a production template or generate nodes from text/OCR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-slate-950/40 px-6 pt-2 gap-4">
          <button
            onClick={() => setActiveTab("templates")}
            className={`flex items-center gap-2 pb-3 px-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === "templates"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <LayoutTemplate className="w-4 h-4" />
            <span>Built-In Templates</span>
          </button>
          <button
            onClick={() => setActiveTab("outline")}
            className={`flex items-center gap-2 pb-3 px-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === "outline"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>Text / OCR to Diagram</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "templates" ? (
            <div className="space-y-4">
              {/* Search + Filter */}
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <input
                  value={templateSearch}
                  onChange={(event) => setTemplateSearch(event.target.value)}
                  placeholder="Search templates, presets, mind maps..."
                  className="w-full sm:max-w-xs bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                {["All", "Brainstorm", "Software", "Business", "Study"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedCategory === cat
                        ? "bg-cyan-500 text-slate-950 font-bold shadow-md"
                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                </div>
              </div>

              {/* Template Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredTemplates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTemplate(t.id, t.title)}
                    className="group bg-slate-950/80 border border-white/10 hover:border-cyan-400/60 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-xl hover:shadow-cyan-500/10 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-2xl">{t.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                          {t.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">
                        {t.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {t.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-500">
                      <span>{t.nodeCount} connected nodes</span>
                      <span className="text-cyan-400 font-semibold group-hover:underline flex items-center gap-1">
                        <span>Load Template</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-300">
                  Enter a title on the first line, followed by bullet points or
                  sub-topics. Our engine will generate a colorful radial or
                  hierarchical mind map automatically.
                </p>
                <button
                  onClick={handleLoadOCRNotes}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-cyan-300 transition-all shrink-0"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Load OCR / Sample Notes</span>
                </button>
              </div>

              <textarea
                value={outlineText}
                onChange={(e) => setOutlineText(e.target.value)}
                rows={8}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-white font-mono text-sm focus:outline-none focus:border-cyan-400 transition-colors"
                placeholder="Central Topic&#10;• Subtopic 1&#10;• Subtopic 2&#10;• Subtopic 3..."
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateFromOutline}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Connected Diagram</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
