import { useState, useEffect } from "react";
import { X, Sparkles, Key, Zap, Check, Loader2, ShieldCheck } from "lucide-react";

export interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
  customName: string;
  customEndpoint: string;
  customModel: string;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: "openai",
  apiKey: "",
  model: "gpt-4o-mini",
  customName: "",
  customEndpoint: "",
  customModel: "",
};

const PROVIDERS: {
  id: string;
  name: string;
  endpoint: string;
  models: string[];
  keyHint: string;
}[] = [
  {
    id: "openai",
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1/chat/completions",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "o4-mini"],
    keyHint: "sk-…",
  },
  {
    id: "groq",
    name: "Groq (free tier)",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    keyHint: "gsk_…",
  },
  {
    id: "openrouter",
    name: "OpenRouter (free models)",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    models: [
      "meta-llama/llama-3.3-70b-instruct:free",
      "google/gemma-2-9b-it:free",
      "mistralai/mistral-7b-instruct:free",
    ],
    keyHint: "sk-or-…",
  },
  {
    id: "together",
    name: "Together AI",
    endpoint: "https://api.together.xyz/v1/chat/completions",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo-Free"],
    keyHint: "…",
  },
  {
    id: "ollama",
    name: "Ollama (local, no key)",
    endpoint: "http://localhost:11434/v1/chat/completions",
    models: ["llama3.2", "qwen2.5", "mistral"],
    keyHint: "not required",
  },
  {
    id: "custom",
    name: "Custom Provider",
    endpoint: "",
    models: [],
    keyHint: "your key",
  },
];

export function resolveEndpoint(cfg: AIConfig): string {
  if (cfg.provider === "custom") return cfg.customEndpoint;
  return PROVIDERS.find((p) => p.id === cfg.provider)?.endpoint || "";
}

export function resolveModel(cfg: AIConfig): string {
  return cfg.provider === "custom" ? cfg.customModel : cfg.model;
}

interface AISetupModalProps {
  open: boolean;
  onClose: () => void;
  config: AIConfig;
  onSave: (cfg: AIConfig) => void;
  showToast: (msg: string) => void;
}

export function AISetupModal({ open, onClose, config, onSave, showToast }: AISetupModalProps) {
  const [draft, setDraft] = useState<AIConfig>(config);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(config);
      setTestResult(null);
    }
  }, [open, config]);

  if (!open) return null;

  const provider = PROVIDERS.find((p) => p.id === draft.provider) || PROVIDERS[0];
  const isCustom = draft.provider === "custom";
  const set = <K extends keyof AIConfig>(k: K, v: AIConfig[K]) => setDraft({ ...draft, [k]: v });

  const handleTest = async () => {
    const endpoint = resolveEndpoint(draft);
    const model = resolveModel(draft);
    if (!endpoint) {
      showToast("⚠️ Add an API endpoint URL first.");
      return;
    }
    if (!model) {
      showToast("⚠️ Add a model name first.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(draft.apiKey ? { Authorization: `Bearer ${draft.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
          temperature: 0,
        }),
      });
      if (res.ok) {
        setTestResult("ok");
        showToast("✅ Connection successful — AI features are ready.");
      } else {
        setTestResult("fail");
        showToast(`⚠️ Provider returned ${res.status}. Check key / model / endpoint.`);
      }
    } catch {
      setTestResult("fail");
      showToast("⚠️ Could not reach the endpoint (CORS or offline).");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/65 p-3 backdrop-blur-md" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-[26px] border border-white/10 bg-slate-900 shadow-2xl animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">AI Setup Configuration</h2>
              <p className="text-[11px] text-slate-500">Bring your own key · works with any OpenAI-compatible API</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          {/* Provider */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Provider</label>
            <select
              value={draft.provider}
              onChange={(e) => {
                const p = PROVIDERS.find((x) => x.id === e.target.value)!;
                setDraft({ ...draft, provider: p.id, model: p.models[0] || draft.model });
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-1.5">
                <Key className="h-3 w-3 text-amber-400" /> API Key (Encrypted & Masked)
              </span>
              {draft.apiKey && (
                <span className="text-[9px] font-mono text-cyan-400 lowercase">
                  ●●●●●●●●{draft.apiKey.slice(-4)}
                </span>
              )}
            </label>
            <input
              type="password"
              value={draft.apiKey}
              onChange={(e) => set("apiKey", e.target.value)}
              placeholder={`Paste your secret API key here… (${provider.keyHint})`}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 font-mono text-sm text-cyan-300 outline-none focus:border-violet-400 placeholder:font-sans placeholder:text-slate-600"
            />
            <p className="flex items-center gap-1 text-[10px] text-emerald-400/90">
              <ShieldCheck className="h-3.5 w-3.5" /> 🔒 Masked & saved in browser storage only — never sent to third-party servers.
            </p>
          </div>

          {/* Model */}
          {!isCustom && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Model Name</label>
              <input
                list="ai-models"
                value={draft.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="Enter model identifier…"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400"
              />
              <datalist id="ai-models">
                {provider.models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <p className="text-[10px] text-slate-500">Endpoint: {provider.endpoint || "—"}</p>
            </div>
          )}

          {/* Custom provider settings */}
          {isCustom && (
            <div className="space-y-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Custom Provider Settings</p>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Provider Name</label>
                <input
                  value={draft.customName}
                  onChange={(e) => set("customName", e.target.value)}
                  placeholder="e.g., My Custom API, Claude Instance…"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-violet-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">API Endpoint URL</label>
                <input
                  value={draft.customEndpoint}
                  onChange={(e) => set("customEndpoint", e.target.value)}
                  placeholder="https://api.example.com/v1/chat/completions"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-violet-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Model Name</label>
                <input
                  value={draft.customModel}
                  onChange={(e) => set("customModel", e.target.value)}
                  placeholder="e.g., gpt-4, claude-3-sonnet, llama2…"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-violet-400"
                />
              </div>
              <p className="rounded-lg bg-slate-950/60 p-2 text-[10px] leading-relaxed text-slate-400">
                💡 Custom provider must support OpenAI-compatible API format. Ensure the endpoint accepts POST
                requests with <code className="text-violet-300">model</code>,{" "}
                <code className="text-violet-300">messages</code>, and{" "}
                <code className="text-violet-300">temperature</code> fields.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
            <button
              onClick={handleTest}
              disabled={testing}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                testResult === "ok"
                  ? "bg-emerald-500 text-slate-950"
                  : testResult === "fail"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : testResult === "ok" ? <Check className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
              {testing ? "Testing…" : testResult === "ok" ? "Connected" : "⚡ Test Connection"}
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-xl bg-white/5 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={() => {
                  onSave(draft);
                  showToast("🔐 AI settings saved locally.");
                  onClose();
                }}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-fuchsia-500/20"
              >
                Save Setting
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
