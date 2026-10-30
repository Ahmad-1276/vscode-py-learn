export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Minimal Markdown renderer for the bundled lesson content (headings, lists, code, tables, inline styles). */
export function mdToHtml(md: string): string {
  const out: string[] = [];
  const lines = md.split("\n");
  let i = 0;

  const isTableRow = (l: string) => l.trim().startsWith("|");
  const isTableSep = (l: string) => /^\|[\s\-:|]+\|$/.test(l.trim());
  const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i++; // closing fence (or end of input)
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      out.push(`<pre><code${cls}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) items.push(`<li>${inline(lines[i++].trim().replace(/^[-*]\s+/, ""))}</li>`);
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) items.push(`<li>${inline(lines[i++].trim().replace(/^\d+\.\s+/, ""))}</li>`);
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (isTableRow(line)) {
      const rows: string[] = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(lines[i++]);
      const hasHeader = rows.length > 1 && isTableSep(rows[1]);
      const head = hasHeader ? `<thead><tr>${cells(rows[0]).map((c) => `<th>${c}</th>`).join("")}</tr></thead>` : "";
      const body = (hasHeader ? rows.slice(2) : rows).filter((r) => !isTableSep(r))
        .map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
      out.push(`<table>${head}<tbody>${body}</tbody></table>`);
      continue;
    }

    if (trimmed === "") { i++; continue; }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,4}\s|```|[-*]\s|\d+\.\s|\|)/.test(lines[i].trim())) para.push(lines[i++].trim());
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }

  return out.join("\n");
}

function inline(s: string): string {
  // Pull code spans out first so their contents are not styled.
  const spans: string[] = [];
  const text = s.replace(/`([^`]+)`/g, (_m, code: string) => {
    spans.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${spans.length - 1}\u0000`;
  });
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\u0000(\d+)\u0000/g, (_m, n: string) => spans[Number(n)]);
}
