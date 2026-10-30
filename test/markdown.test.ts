import { test, describe } from "node:test";
import * as assert from "node:assert/strict";
import { escapeHtml, mdToHtml } from "../src/util/markdown";
import { pyRepr } from "../src/webview/htmlBuilder";

describe("mdToHtml", () => {
  test("escapes HTML", () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
    assert.ok(!mdToHtml("<script>alert(1)</script>").includes("<script>"));
  });

  test("renders headings, lists and code blocks", () => {
    const html = mdToHtml("# Title\n\n- a\n- b\n\n```python\nx = 1 < 2\n```");
    assert.ok(html.includes("<h1>Title</h1>"));
    assert.ok(html.includes("<ul><li>a</li><li>b</li></ul>"));
    assert.ok(html.includes('<pre><code class="language-python">x = 1 &lt; 2</code></pre>'));
  });

  test("renders tables with a header row", () => {
    const html = mdToHtml("| A | B |\n|---|---|\n| 1 | 2 |");
    assert.ok(html.includes("<thead><tr><th>A</th><th>B</th></tr></thead>"));
    assert.ok(html.includes("<tbody><tr><td>1</td><td>2</td></tr></tbody>"));
  });

  test("does not style inside code spans", () => {
    assert.equal(mdToHtml("`**x**` and **y**"), "<p><code>**x**</code> and <strong>y</strong></p>");
  });
});

describe("pyRepr", () => {
  test("matches Python repr", () => {
    assert.equal(pyRepr(true), "True");
    assert.equal(pyRepr(null), "None");
    assert.equal(pyRepr("it's"), `"it's"`);
    assert.equal(pyRepr([1, "a", false]), "[1, 'a', False]");
    assert.equal(pyRepr({ a: 2 }), "{'a': 2}");
  });
});
