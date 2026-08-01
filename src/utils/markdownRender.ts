/**
 * Tiny, safe, dependency-free Markdown → HTML renderer.
 * Supports the subset used inside sticky notes & text boxes:
 *   # H1  ## H2  ### H3
 *   **bold**  *italic*  ~~strike~~  `code`
 *   - bullet   1. numbered   [ ] / [x] task
 *   > blockquote
 *   ``` fenced code ```
 *   --- horizontal rule
 *   [text](https://link)
 * Everything is HTML-escaped first so it is XSS-safe.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text: string): string {
  let t = escapeHtml(text);
  // code spans first (protect their contents)
  t = t.replace(/`([^`]+)`/g, (_m, c) => `<code class="ink-code">${c}</code>`);
  // links
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, label, url) => `<a href="${url}" target="_blank" rel="noopener" class="ink-link">${label}</a>`
  );
  // bold, italic, strike
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  t = t.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  // arrows / typographic
  t = t
    .replace(/--&gt;/g, "→")
    .replace(/=&gt;/g, "⇒")
    .replace(/&lt;--/g, "←")
    .replace(/\.\.\./g, "…");
  return t;
}

export function renderMarkdown(src: string): string {
  const lines = src.split(/\r?\n/);
  const html: string[] = [];
  let inList: "ul" | "ol" | null = null;
  let inCode = false;
  let codeBuffer: string[] = [];

  const closeList = () => {
    if (inList) {
      html.push(`</${inList}>`);
      inList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code
    if (/^```/.test(line.trim())) {
      if (inCode) {
        html.push(`<pre class="ink-pre"><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    // Blank line
    if (!line.trim()) {
      closeList();
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeList();
      html.push('<hr class="ink-hr" />');
      continue;
    }

    // Headings
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level} class="ink-h${level}">${inline(heading[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      closeList();
      html.push(`<blockquote class="ink-quote">${inline(quote[1])}</blockquote>`);
      continue;
    }

    // Checkbox
    const checkbox = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (checkbox) {
      if (inList !== "ul") {
        closeList();
        html.push('<ul class="ink-ul">');
        inList = "ul";
      }
      const checked = checkbox[1].toLowerCase() === "x";
      html.push(
        `<li class="ink-task"><span class="ink-check">${checked ? "☑" : "☐"}</span> ${
          checked ? `<span class="ink-done">${inline(checkbox[2])}</span>` : inline(checkbox[2])
        }</li>`
      );
      continue;
    }

    // Bullet
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      if (inList !== "ul") {
        closeList();
        html.push('<ul class="ink-ul">');
        inList = "ul";
      }
      html.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }

    // Numbered
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numbered) {
      if (inList !== "ol") {
        closeList();
        html.push('<ol class="ink-ol">');
        inList = "ol";
      }
      html.push(`<li>${inline(numbered[1])}</li>`);
      continue;
    }

    // Paragraph
    closeList();
    html.push(`<p class="ink-p">${inline(line)}</p>`);
  }

  if (inCode && codeBuffer.length) {
    html.push(`<pre class="ink-pre"><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }
  closeList();
  return html.join("\n");
}
