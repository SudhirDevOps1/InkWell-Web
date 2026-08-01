/**
 * Free open media helpers used across Inkwell.
 * - YouTube / Vimeo URL normalizer
 * - Multi-provider GIF search (Giphy, Tenor, built-in sticker fallback)
 * - Expanded emoji catalog
 */

// GIPHY + Tenor public/demo keys. Each is rate-limited; we rotate & fall back.
// User should replace with their own free key from developers.giphy.com for production.
const GIPHY_KEYS = [
  "dc6zaTOxFJmzC", // legacy public beta (may be throttled)
  "GlVGYHkr3WSBn87yjqNJWyeyUIMyp5Qu",
  "Mv5fH7aCQXf7L3XJZ0Zg9J4L6Q8K2B5N",
];
// Tenor public beta key (Google-owned, free for non-commercial apps).
const TENOR_KEY = "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ";

export function toYouTubeEmbed(raw: string): string | null {
  try {
    const input = raw.trim();
    if (/youtube\.com\/embed\//i.test(input)) return input.split("?")[0];
    const short = input.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i);
    if (short?.[1]) return `https://www.youtube.com/embed/${short[1]}`;
    const shorts = input.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i);
    if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`;
    const live = input.match(/youtube\.com\/live\/([A-Za-z0-9_-]{6,})/i);
    if (live?.[1]) return `https://www.youtube.com/embed/${live[1]}`;
    const u = new URL(input.startsWith("http") ? input : `https://${input}`);
    if (u.hostname.includes("youtube")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function toVimeoEmbed(raw: string): string | null {
  try {
    const m = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (m?.[1]) return `https://player.vimeo.com/video/${m[1]}`;
  } catch {
    /* ignore */
  }
  return null;
}

export function normalizeMediaUrl(raw: string): { src: string; kind: "youtube" | "vimeo" | "video" | "gif" | "image" } {
  const yt = toYouTubeEmbed(raw);
  if (yt) return { src: yt, kind: "youtube" };
  const vim = toVimeoEmbed(raw);
  if (vim) return { src: vim, kind: "vimeo" };
  if (/\.gif(\?|$)/i.test(raw) || raw.includes("giphy.com/media") || raw.includes("tenor.com"))
    return { src: raw, kind: "gif" };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(raw)) return { src: raw, kind: "video" };
  return { src: raw, kind: "image" };
}

export interface GifResult {
  id: string;
  title: string;
  preview: string;
  url: string;
  width: number;
  height: number;
  source: "giphy" | "tenor" | "wikimedia" | "builtin";
}

/**
 * Wikimedia Commons: genuinely keyless, free, CORS-enabled animated GIF search.
 * MediaWiki search keyword `filemime:image/gif` filters animated GIF files.
 */
async function searchWikimediaGifs(query: string, limit: number): Promise<GifResult[]> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: `${query} filemime:image/gif`,
    gsrlimit: String(Math.min(50, limit)),
    prop: "imageinfo",
    iiprop: "url|mime|size",
    iiurlwidth: "320",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!res.ok) throw new Error(`Wikimedia ${res.status}`);
  const json = await res.json();
  const pages = Object.values(json?.query?.pages || {}) as any[];
  return pages
    .map((page): GifResult | null => {
      const info = page?.imageinfo?.[0];
      if (!info?.url || info.mime !== "image/gif") return null;
      return {
        id: `commons-${page.pageid}`,
        title: String(page.title || "GIF").replace(/^File:/, "").replace(/\.gif$/i, ""),
        // Use the original GIF so search results visibly animate.
        preview: info.url,
        url: info.url,
        width: Number(info.width || 240),
        height: Number(info.height || 180),
        source: "wikimedia",
      };
    })
    .filter((item): item is GifResult => !!item);
}

const mapGiphyItem = (g: any): GifResult => {
  const images = g.images || {};
  const fixed = images.fixed_width_small || images.fixed_width || images.original;
  const original = images.original || fixed;
  return {
    id: String(g.id),
    title: g.title || "GIF",
    preview: fixed?.url || original?.url || "",
    url: original?.url || fixed?.url || "",
    width: Number(original?.width || fixed?.width || 200),
    height: Number(original?.height || fixed?.height || 150),
    source: "giphy",
  };
};

const mapTenorItem = (g: any): GifResult => {
  const mf = g.media_formats;
  const gif = mf?.gif || mf?.tinygif || mf?.nanogif;
  const preview = mf?.tinygif || mf?.nanogif || gif;
  return {
    id: g.id || g.id_str || String(Math.random()),
    title: g.title || "GIF",
    preview: preview?.url || gif?.url || "",
    url: gif?.url || preview?.url || "",
    width: Number(gif?.dims?.[0] || 200),
    height: Number(gif?.dims?.[1] || 150),
    source: "tenor",
  };
};

/** Try Giphy first, then Tenor, always succeed (even offline with built-in stickers). */
export async function searchGifs(query: string, limit = 24): Promise<GifResult[]> {
  const q = query.trim() || "funny";
  const errors: string[] = [];

  // Primary provider: no key, no account, open licensed Commons media.
  try {
    const commons = await searchWikimediaGifs(q, limit);
    if (commons.length > 0) return commons;
  } catch (e) {
    errors.push(`commons:${(e as Error).message.slice(0, 24)}`);
  }

  for (const key of GIPHY_KEYS) {
    try {
      const endpoint =
        `https://api.giphy.com/v1/gifs/search?api_key=${key}` +
        `&q=${encodeURIComponent(q)}&limit=${limit}&rating=g&lang=en&bundle=messaging_non_clips`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json?.data) ? json.data : [];
        const items: GifResult[] = data.map(mapGiphyItem).filter((g: GifResult) => g.url);
        if (items.length > 0) return items;
      } else {
        errors.push(`giphy:${res.status}`);
      }
    } catch (e) {
      errors.push(`giphy:${(e as Error).message.slice(0, 24)}`);
    }
  }

  // Fallback: Tenor
  try {
    const endpoint =
      `https://tenor.googleapis.com/v2/search?key=${TENOR_KEY}` +
      `&q=${encodeURIComponent(q)}&limit=${limit}&media_filter=gif,tinygif&clientkey=inkwell`;
    const res = await fetch(endpoint);
    if (res.ok) {
      const json = await res.json();
      const items: GifResult[] = (json.results || []).map(mapTenorItem).filter((g: GifResult) => g.url);
      if (items.length > 0) return items;
    } else {
      errors.push(`tenor:${res.status}`);
    }
  } catch (e) {
    errors.push(`tenor:${(e as Error).message.slice(0, 24)}`);
  }

  // Final fallback: built-in sticker pack (always works, offline-friendly)
  const ql = q.toLowerCase();
  const matched = BUILTIN_STICKERS.filter((s: GifResult) =>
    s.title.toLowerCase().includes(ql)
  );
  return (matched.length ? matched : BUILTIN_STICKERS).slice(0, limit);
}

export async function trendingGifs(limit = 24): Promise<GifResult[]> {
  try {
    const commons = await searchWikimediaGifs("animation", limit);
    if (commons.length > 0) return commons;
  } catch {
    /* continue to provider fallbacks */
  }
  try {
    const endpoint =
      `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEYS[0]}` +
      `&limit=${limit}&rating=g&bundle=messaging_non_clips`;
    const res = await fetch(endpoint);
    if (res.ok) {
      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];
      const items = data.map(mapGiphyItem).filter((g: GifResult) => g.url);
      if (items.length > 0) return items;
    }
  } catch {
    /* fall through */
  }
  return BUILTIN_STICKERS.slice(0, limit);
}

const stickerSvg = (emoji: string, bg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220"><defs><radialGradient id="g"><stop stop-color="${bg}"/><stop offset="1" stop-color="#0b1120"/></radialGradient></defs><rect width="220" height="220" rx="44" fill="url(#g)"/><text x="110" y="130" text-anchor="middle" font-size="96">${emoji}</text></svg>`
  )}`;

/** Curated offline sticker pack — valid data URLs, no broken remote links. */
export const BUILTIN_STICKERS: GifResult[] = [
  ["thumbs up", "👍", "#06b6d4"],
  ["fire", "🔥", "#f97316"],
  ["celebrate", "🥳", "#a855f7"],
  ["success", "✅", "#22c55e"],
  ["idea", "💡", "#eab308"],
  ["love", "❤️", "#ec4899"],
  ["warning", "⚠️", "#f59e0b"],
  ["coding", "💻", "#3b82f6"],
].map(([title, emoji, color], index) => {
  const url = stickerSvg(title === "warning" ? "⚠️" : emoji, color);
  return {
    id: `offline-sticker-${index}`,
    title,
    preview: url,
    url,
    width: 220,
    height: 220,
    source: "builtin" as const,
  };
});

// Large free emoji catalog grouped for the picker.
export const EMOJI_CATALOG: { cat: string; items: string[] }[] = [
  { cat: "Smileys", items: ["😀", "😁", "😂", "", "😊", "😍", "😘", "😎", "🤩", "🥳", "😇", "🤗", "🤔", "😴", "😭", "😡", "", "🥶", "🫡", "🫠", "😈", "", "💀", "🤖", "👽", "🎃"] },
  { cat: "Gestures", items: ["👍", "👎", "", "🙌", "", "✌️", "🤞", "🤟", "", "🤘", "", "👈", "️", "✊", "", "💪", "🙏", "💅", "🫶", "👋", "🫡", "✍️", "👀", "", "🫀", ""] },
  { cat: "People", items: ["👤", "", "🧑‍💻", "👨‍💻", "👩‍💻", "🧑🎨", "🧑‍", "🧑‍🏫", "🧑‍🚀", "👮", "🕵️", "🧙", "🦸", "‍💼", "👨‍👩‍👧‍", "👶", "", "🧔", "", "🧑‍🎤"] },
  { cat: "Nature", items: ["🌈", "☀️", "", "⭐", "⚡", "🔥", "💧", "", "🌸", "🌺", "🌻", "🌹", "🍀", "🌲", "", "🌵", "🍁", "🍄", "🐶", "", "🦊", "🐻", "🐼", "🦁", "🐯", "🐸"] },
  { cat: "Food", items: ["", "🍌", "🍉", "🍇", "🍓", "", "🍑", "", "🍍", "", "🍅", "", "🌶️", "", "🥕", "", "🧀", "", "🍔", "", "🌮", "🍣", "🍜", "🍩", "🍪", "🎂"] },
  { cat: "Travel", items: ["", "🚕", "🚌", "🚀", "✈️", "", "🚂", "", "🏠", "🏢", "🏛️", "🏰", "🗽", "🗼", "️", "🧭", "🧳", "⛺", "️", "⛰️", "", "🛣️", "", "🌃"] },
  { cat: "Objects", items: ["💡", "🔦", "📱", "", "🖥️", "⌨️", "🖱️", "🖨️", "📷", "📹", "🎥", "📺", "", "⌛", "", "📖", "✏️", "🖊️", "", "📌", "🔑", "🔒", "🧲", "", "🧬", "🔭"] },
  { cat: "Symbols", items: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "✨", "💫", "⭐", "🌟", "", "✅", "❌", "️", "🚫", "️", "🔔", "🔕", "💬", "💭", "️", "🔴", ""] },
  { cat: "Tech / Work", items: ["⚙️", "️", "🔧", "", "🧰", "🖥️", "☁️", "🔐", "🛡️", "📡", "🛰️", "📶", "", "🔋", "💾", "📀", "🧮", "", "📈", "📉", "🗂️", "📁", "🗄️", "🧾", "", "💳"] },
  { cat: "Education", items: ["📚", "📖", "📝", "🎓", "🏫", "️", "📐", "📏", "🧮", "🧪", "🔬", "🧬", "", "🧭", "🧠", "💡", "🗂️", "", "🏷️", "️", "👩‍", "🧑‍", "🎒", "🕰️"] },
];
