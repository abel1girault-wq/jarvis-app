export function renderMarkdown(text: string): string {
  let h = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Code blocks
  h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="language-${lang || "text"}">${code.trim()}</code></pre>`);

  // Inline code
  h = h.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // Headers
  h = h.replace(/^### (.+)$/gm, "<h3>$1</h3>")
       .replace(/^## (.+)$/gm, "<h2>$1</h2>")
       .replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold/italic
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
       .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
       .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>")
       .replace(/__(.+?)__/g, "<strong>$1</strong>")
       .replace(/_([^_\n]+?)_/g, "<em>$1</em>");

  // Links
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // HR
  h = h.replace(/^---+$/gm, "<hr>");

  // Blockquote
  h = h.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered lists
  h = h.replace(/((?:^[*\-+] .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n").map((l) => `<li>${l.replace(/^[*\-+] /, "")}</li>`).join("");
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  h = h.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n").map((l) => `<li>${l.replace(/^\d+\. /, "")}</li>`).join("");
    return `<ol>${items}</ol>`;
  });

  // Paragraphs
  const blocks = ["<h1>","<h2>","<h3>","<ul>","<ol>","<pre>","<blockquote>","<hr>"];
  const lines = h.split("\n");
  const out: string[] = []; let inP = false;
  for (const line of lines) {
    const isBlock = blocks.some((b) => line.trimStart().startsWith(b));
    if (isBlock) { if (inP) { out.push("</p>"); inP = false; } out.push(line); }
    else if (line.trim() === "") { if (inP) { out.push("</p>"); inP = false; } }
    else { if (!inP) { out.push("<p>"); inP = true; } else out.push(" "); out.push(line); }
  }
  if (inP) out.push("</p>");
  return out.join("\n");
}
