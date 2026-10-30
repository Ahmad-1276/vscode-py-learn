// @ts-check
// Webview script for Python Learner lesson and problem pages.
(function () {
  // @ts-ignore acquireVsCodeApi is injected by VS Code
  const vscode = acquireVsCodeApi();
  const stateEl = document.getElementById("pylearn-state");
  const page = JSON.parse(stateEl ? stateEl.textContent || "{}" : "{}");
  const INDENT = "    ";

  /** @param {string} id */
  const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

  // Navigation links work on both page kinds.
  document.addEventListener("click", (e) => {
    const target = /** @type {HTMLElement} */ (e.target).closest("[data-open-kind]");
    if (!target) return;
    e.preventDefault();
    vscode.postMessage({ command: "open", kind: target.getAttribute("data-open-kind"), id: target.getAttribute("data-open-id") });
  });

  if (page.kind === "lesson") {
    vscode.setState({ kind: page.kind, id: page.id, version: page.version });
    const done = /** @type {HTMLInputElement | null} */ (document.getElementById("lessonDone"));
    if (done) done.addEventListener("change", () => vscode.postMessage({ command: "toggleLesson", done: done.checked }));
    return;
  }

  // ---- Problem page ----------------------------------------------------------

  const code = /** @type {HTMLTextAreaElement} */ ($("code"));
  const gutter = $("gutter");
  const output = $("output");
  const results = $("results");
  const status = $("status");
  const buttons = ["runBtn", "checkBtn", "hintBtn", "resetBtn"].map($);

  // Restore unsaved state if the webview was reloaded for the same problem.
  /** @type {{ kind: string, id: string, version: number, code?: string, output?: string, outputClass?: string, resultsHtml?: string, resultsTitle?: string, hints?: string[] }} */
  const prev = vscode.getState();
  const saved = prev && prev.id === page.id && prev.version === page.version ? prev : { kind: page.kind, id: page.id, version: page.version };
  code.value = saved.code ?? page.code;

  function persist() {
    vscode.setState({
      ...saved,
      kind: page.kind,
      id: page.id,
      version: page.version,
      code: code.value,
      output: output.textContent || "",
      outputClass: output.className,
      resultsHtml: results.innerHTML,
      resultsTitle: $("resultsTitle").textContent || "",
      hints: Array.from(document.querySelectorAll("#hintBox .hint")).map((h) => h.textContent || "")
    });
  }

  if (saved.output) { showOutput(saved.output, saved.outputClass); }
  if (saved.resultsHtml) { results.innerHTML = saved.resultsHtml; $("resultsTitle").textContent = saved.resultsTitle || "Test results"; $("resultsSection").hidden = false; }
  (saved.hints || []).forEach((h, i) => addHint(h, i + 1));

  function updateGutter() {
    const n = code.value.split("\n").length;
    let s = "";
    for (let i = 1; i <= n; i++) s += i + "\n";
    gutter.textContent = s;
    gutter.scrollTop = code.scrollTop;
  }
  code.addEventListener("scroll", () => { gutter.scrollTop = code.scrollTop; });

  let draftTimer = 0;
  code.addEventListener("input", () => {
    updateGutter();
    persist();
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => vscode.postMessage({ command: "draft", code: code.value }), 400);
  });
  updateGutter();

  /** Replace the selection via execCommand so native undo/redo keeps working. */
  function insert(text) {
    if (!document.execCommand("insertText", false, text)) {
      code.setRangeText(text, code.selectionStart, code.selectionEnd, "end");
      code.dispatchEvent(new Event("input"));
    }
  }

  function lineStartOf(pos) {
    return code.value.lastIndexOf("\n", pos - 1) + 1;
  }

  /** Indent or dedent every line touched by the selection. */
  function shiftLines(dedent) {
    const v = code.value;
    const start = lineStartOf(code.selectionStart);
    let end = code.selectionEnd;
    if (end > start && v[end - 1] === "\n") end--;
    const lineEnd = v.indexOf("\n", end) === -1 ? v.length : v.indexOf("\n", end);
    const lines = v.slice(start, lineEnd).split("\n");
    const changed = lines.map((l) => dedent ? l.replace(/^( {1,4}|\t)/, "") : INDENT + l).join("\n");
    code.setSelectionRange(start, lineEnd);
    insert(changed);
    code.setSelectionRange(start, start + changed.length);
  }

  code.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === "Enter") {
      e.preventDefault();
      send(e.shiftKey ? "check" : "run");
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const multiLine = code.value.slice(code.selectionStart, code.selectionEnd).includes("\n");
      if (e.shiftKey || multiLine) shiftLines(e.shiftKey);
      else insert(INDENT);
      return;
    }
    if (e.key === "Enter" && !mod && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const before = code.value.slice(lineStartOf(code.selectionStart), code.selectionStart);
      let indent = (/^[ \t]*/.exec(before) || [""])[0];
      if (/:\s*(#.*)?$/.test(before)) indent += INDENT;
      insert("\n" + indent);
      return;
    }
    if (e.key === "Backspace" && code.selectionStart === code.selectionEnd) {
      const before = code.value.slice(lineStartOf(code.selectionStart), code.selectionStart);
      if (before.length > 0 && /^ +$/.test(before)) {
        e.preventDefault();
        const remove = before.length % 4 || 4;
        code.setSelectionRange(code.selectionStart - remove, code.selectionStart);
        insert("");
      }
    }
  });

  /** @param {"run" | "check"} command */
  function send(command) {
    if (buttons[0].hasAttribute("disabled")) return;
    vscode.postMessage({ command, code: code.value });
  }

  $("runBtn").addEventListener("click", () => send("run"));
  $("checkBtn").addEventListener("click", () => send("check"));
  $("hintBtn").addEventListener("click", () => vscode.postMessage({ command: "hint" }));
  $("resetBtn").addEventListener("click", () => vscode.postMessage({ command: "resetCode" }));

  function setBusy(busy, label) {
    buttons.forEach((b) => { if (busy) b.setAttribute("disabled", ""); else b.removeAttribute("disabled"); });
    status.textContent = busy ? label : "";
    document.body.classList.toggle("busy", busy);
  }

  function showOutput(text, cls) {
    output.textContent = text;
    output.className = "output " + (cls || "");
    $("outputSection").hidden = false;
  }

  function addHint(text, index) {
    const div = document.createElement("div");
    div.className = "hint";
    div.textContent = text;
    div.setAttribute("data-label", "Hint " + index);
    $("hintBox").appendChild(div);
    $("hintCounter").textContent = `(${index}/${page.hintTotal})`;
  }

  function formatRun(m) {
    let text = m.stdout || "";
    if (m.stderr) text += (text && !text.endsWith("\n") ? "\n" : "") + m.stderr;
    const notes = [];
    if (m.timedOut) notes.push(`Stopped: your code ran longer than ${m.timeoutMs} ms. Check for an infinite loop.`);
    if (m.truncated) notes.push("Output was too long and has been cut off.");
    if (m.cancelled) notes.push("Run cancelled.");
    if (notes.length) text += (text ? "\n\n" : "") + notes.join("\n");
    return text || "(no output — use print() to display values)";
  }

  window.addEventListener("message", (event) => {
    const m = event.data;
    switch (m.command) {
      case "busy":
        setBusy(m.busy, m.label || "");
        break;
      case "trigger":
        if (m.action === "hint") vscode.postMessage({ command: "hint" }); else send(m.action);
        break;
      case "setCode":
        code.value = m.code;
        updateGutter();
        persist();
        break;
      case "runResult": {
        const failed = m.timedOut || m.exitCode !== 0;
        showOutput(formatRun(m), failed ? "error" : "");
        status.textContent = `Finished in ${m.durationMs} ms`;
        persist();
        break;
      }
      case "checkResult": {
        results.innerHTML = "";
        const title = $("resultsTitle");
        if (m.loadError) {
          const div = document.createElement("div");
          div.className = "test fail";
          div.textContent = m.loadError;
          results.appendChild(div);
          title.textContent = "Could not run tests";
        } else {
          const passed = m.results.filter((r) => r.pass).length;
          title.textContent = `Test results: ${passed} / ${m.results.length} passed`;
          m.results.forEach((r, i) => {
            const div = document.createElement("div");
            div.className = "test " + (r.pass ? "pass" : "fail");
            const head = document.createElement("div");
            head.className = "test-head";
            head.textContent = `${r.pass ? "✔" : "✘"} ${r.hidden ? `Hidden test ${i + 1}` : r.call}`;
            div.appendChild(head);
            if (!r.pass && !r.hidden) {
              const detail = document.createElement("div");
              detail.className = "test-detail";
              detail.textContent = r.error ? r.error : `expected ${r.expected}, got ${r.got}`;
              div.appendChild(detail);
            }
            results.appendChild(div);
          });
          if (m.allPassed) {
            const ok = document.createElement("p");
            ok.className = "celebrate";
            ok.textContent = "🎉 All tests passed — nice work!";
            results.appendChild(ok);
            $("solvedPill").hidden = false;
          }
        }
        $("resultsSection").hidden = false;
        if (m.stdout || m.stderr || m.timedOut) showOutput(formatRun(m), m.timedOut ? "error" : "");
        status.textContent = `Finished in ${m.durationMs} ms`;
        persist();
        $("resultsSection").scrollIntoView({ behavior: "smooth", block: "nearest" });
        break;
      }
      case "hint":
        addHint(m.text, m.index);
        persist();
        break;
    }
  });

  code.focus();
})();
