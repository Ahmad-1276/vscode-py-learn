import { Lesson } from "../data/lessons";
import { Problem } from "../data/problems";
import { mdToHtml, escapeHtml } from "../util/markdown";

export interface PageAssets {
  cspSource: string;
  cssUri: string;
  scriptUri: string;
  nonce: string;
}

export interface NavLink {
  id: string;
  title: string;
}

export interface LessonPage {
  lesson: Lesson;
  completed: boolean;
  practice: (NavLink & { solved: boolean })[];
  prev?: NavLink;
  next?: NavLink;
}

export interface ProblemPage {
  problem: Problem;
  solved: boolean;
  code: string;
  prev?: NavLink;
  next?: NavLink;
  lesson?: NavLink;
}

export function makeNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

/** Render a JSON value the way Python's repr() would, for showing examples. */
export function pyRepr(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    const q = v.includes("'") && !v.includes('"') ? '"' : "'";
    const body = v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\t/g, "\\t").split(q).join("\\" + q);
    return q + body + q;
  }
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(", ")}]`;
  if (typeof v === "object") {
    return `{${Object.entries(v as Record<string, unknown>).map(([k, x]) => `${pyRepr(k)}: ${pyRepr(x)}`).join(", ")}}`;
  }
  return String(v);
}

function shell(a: PageAssets, title: string, body: string, state: unknown): string {
  // Escape "<" so the JSON payload cannot close the script tag.
  const json = JSON.stringify(state).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${a.cspSource}; img-src ${a.cspSource} https: data:; script-src 'nonce-${a.nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${a.cssUri}">
<title>${escapeHtml(title)}</title>
</head>
<body>
${body}
<script nonce="${a.nonce}" id="pylearn-state" type="application/json">${json}</script>
<script nonce="${a.nonce}" src="${a.scriptUri}"></script>
</body>
</html>`;
}

function navButton(kind: "lesson" | "problem", link: NavLink | undefined, label: string): string {
  if (!link) return `<button class="secondary" disabled>${label}</button>`;
  return `<button class="secondary" data-open-kind="${kind}" data-open-id="${escapeHtml(link.id)}" title="${escapeHtml(link.title)}">${label}</button>`;
}

export function lessonHtml(a: PageAssets, page: LessonPage, version: number): string {
  const { lesson, completed, practice } = page;
  const practiceHtml = practice.length === 0 ? "" : `
<section class="card">
  <h2>Practice</h2>
  <ul class="link-list">
    ${practice.map((p) => `<li><a href="#" data-open-kind="problem" data-open-id="${escapeHtml(p.id)}">${escapeHtml(p.title)}</a>${p.solved ? ' <span class="pill ok">Solved</span>' : ""}</li>`).join("")}
  </ul>
</section>`;

  const body = `
<header class="page-header">
  <div>
    <div class="eyebrow">${escapeHtml(lesson.category)}</div>
    <h1>${escapeHtml(lesson.title)}</h1>
    <p class="muted">${escapeHtml(lesson.summary)}</p>
  </div>
</header>
<article class="lesson">${mdToHtml(lesson.content)}</article>
${practiceHtml}
<footer class="page-footer">
  ${navButton("lesson", page.prev, "← Previous")}
  <label class="checkbox"><input type="checkbox" id="lessonDone" ${completed ? "checked" : ""}> Mark lesson complete</label>
  ${navButton("lesson", page.next, "Next →")}
</footer>`;
  return shell(a, lesson.title, body, { kind: "lesson", id: lesson.id, version });
}

export function problemHtml(a: PageAssets, page: ProblemPage, version: number): string {
  const { problem: p, solved } = page;
  const examples = p.testCases.filter((t) => !t.hidden);
  const hiddenCount = p.testCases.length - examples.length;

  const body = `
<header class="page-header">
  <div>
    <div class="eyebrow">${escapeHtml(p.category)}</div>
    <h1>${escapeHtml(p.title)}</h1>
    <div class="badges">
      <span class="pill ${p.difficulty}">${p.difficulty}</span>
      <span class="pill ok" id="solvedPill" ${solved ? "" : "hidden"}>Solved</span>
      ${page.lesson ? `<a href="#" class="muted small" data-open-kind="lesson" data-open-id="${escapeHtml(page.lesson.id)}">Review lesson: ${escapeHtml(page.lesson.title)}</a>` : ""}
    </div>
  </div>
  <nav class="nav">
    ${navButton("problem", page.prev, "←")}
    ${navButton("problem", page.next, "→")}
  </nav>
</header>

<section class="card description">
  ${mdToHtml(p.description)}
  <h3>Examples</h3>
  <ul class="examples">
    ${examples.map((t) => `<li><code>${escapeHtml(`${p.functionName}(${t.args.map(pyRepr).join(", ")})`)}</code> → <code>${escapeHtml(pyRepr(t.expected))}</code></li>`).join("")}
  </ul>
  ${hiddenCount > 0 ? `<p class="muted small">Plus ${hiddenCount} hidden test${hiddenCount === 1 ? "" : "s"}.</p>` : ""}
</section>

<section class="editor-section">
  <div class="toolbar">
    <button id="runBtn" title="Run (Ctrl+Enter)">▶ Run</button>
    <button id="checkBtn" title="Check against tests (Ctrl+Shift+Enter)">✔ Check</button>
    <button id="hintBtn" class="secondary">Hint <span id="hintCounter">(0/${p.hints.length})</span></button>
    <span class="spacer"></span>
    <span id="status" class="muted small" role="status" aria-live="polite"></span>
    <button id="resetBtn" class="secondary" title="Restore the starter code">Reset code</button>
  </div>
  <div class="editor">
    <pre class="gutter" id="gutter" aria-hidden="true">1</pre>
    <textarea id="code" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Your code" wrap="off"></textarea>
  </div>
  <p class="muted small">Tab indents · Shift+Tab dedents · Ctrl+Enter runs · Ctrl+Shift+Enter checks</p>
</section>

<div id="hintBox"></div>

<section class="results-section" id="resultsSection" hidden>
  <h3 id="resultsTitle">Test results</h3>
  <div id="results"></div>
</section>

<section class="output-section" id="outputSection" hidden>
  <h3>Output</h3>
  <pre id="output" class="output"></pre>
</section>`;

  return shell(a, p.title, body, {
    kind: "problem",
    id: p.id,
    version,
    code: page.code,
    starter: p.starterCode,
    hintTotal: p.hints.length
  });
}
