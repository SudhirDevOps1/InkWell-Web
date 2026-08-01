import { useEffect, useState } from "react";
import { Search, X, Sparkles, Smile, Loader2 } from "lucide-react";
import {
  EMOJI_CATALOG,
  GifResult,
  searchGifs,
  trendingGifs,
} from "../../utils/mediaHelpers";

interface GifEmojiPickerProps {
  open: boolean;
  onClose: () => void;
  onPickEmoji: (emoji: string) => void;
  onPickGif: (gif: GifResult) => void;
  showToast: (msg: string) => void;
}

export function GifEmojiPicker({
  open,
  onClose,
  onPickEmoji,
  onPickGif,
  showToast,
}: GifEmojiPickerProps) {
  const [tab, setTab] = useState<"emoji" | "gif">("emoji");
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [emojiCat, setEmojiCat] = useState(EMOJI_CATALOG[0].cat);
  const [emojiFilter, setEmojiFilter] = useState("");

  useEffect(() => {
    if (!open || tab !== "gif") return;
    let cancelled = false;
    setLoading(true);
    const run = async () => {
      try {
        const data = query.trim()
          ? await searchGifs(query.trim(), 30)
          : await trendingGifs(30);
        if (!cancelled) setGifs(data);
      } catch {
        if (!cancelled) {
          setGifs([]);
          showToast("⚠️ GIF search needs internet. Offline emoji still works.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = window.setTimeout(run, query ? 280 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, tab, query, showToast]);

  if (!open) return null;

  const cat = EMOJI_CATALOG.find((c) => c.cat === emojiCat) || EMOJI_CATALOG[0];
  const filteredEmojis = emojiFilter
    ? EMOJI_CATALOG.flatMap((c) => c.items).filter(() => true) // all when searching categories by name only
    : cat.items;

  const displayEmojis = emojiFilter
    ? EMOJI_CATALOG.filter((c) =>
        c.cat.toLowerCase().includes(emojiFilter.toLowerCase())
      ).flatMap((c) => c.items)
    : filteredEmojis;

  return (
    <div
      className="fixed inset-0 z-[170] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 shadow-2xl animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Free GIF & Emoji Library</h2>
              <p className="text-[10px] text-slate-500">Wikimedia Commons (keyless) · Giphy / Tenor fallback</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-white/5 px-3 pt-2">
          <button
            onClick={() => setTab("emoji")}
            className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2 text-xs font-bold ${
              tab === "emoji" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"
            }`}
          >
            <Smile className="h-3.5 w-3.5" /> Emoji
          </button>
          <button
            onClick={() => setTab("gif")}
            className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2 text-xs font-bold ${
              tab === "gif" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> GIF Search
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "emoji" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  value={emojiFilter}
                  onChange={(e) => setEmojiFilter(e.target.value)}
                  placeholder="Filter categories…"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>
              {!emojiFilter && (
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_CATALOG.map((c) => (
                    <button
                      key={c.cat}
                      onClick={() => setEmojiCat(c.cat)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        emojiCat === c.cat
                          ? "bg-cyan-500 text-slate-950"
                          : "bg-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      {c.cat}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
                {displayEmojis.map((em, i) => (
                  <button
                    key={`${em}-${i}`}
                    onClick={() => {
                      onPickEmoji(em);
                      onClose();
                    }}
                    className="flex h-10 items-center justify-center rounded-xl bg-white/5 text-xl transition-all hover:scale-110 hover:bg-white/10"
                    title={em}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search free GIFs — cats, celebrate, coding…"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-pink-400"
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["celebrate", "coding", "thumbs up", "mind blown", "teaching", "success", "error", "love"].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuery(q)}
                    className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-400 hover:bg-pink-500/15 hover:text-pink-300"
                  >
                    {q}
                  </button>
                ))}
              </div>
              {loading ? (
                <div className="flex h-40 items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching free GIF library…
                </div>
              ) : gifs.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-xs text-slate-500">
                  No GIFs found. Try another word or go online.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {gifs.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        onPickGif(g);
                        onClose();
                      }}
                      className="group overflow-hidden rounded-xl border border-white/10 bg-slate-950 transition-all hover:border-pink-400/50 hover:shadow-lg hover:shadow-pink-500/10"
                      title={g.title}
                    >
                      <img
                        src={g.preview}
                        alt={g.title}
                        loading="lazy"
                        className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              )}
              <p className="text-center text-[9px] text-slate-600">
                Open GIF search · Commons results are freely licensed; provider terms apply
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
