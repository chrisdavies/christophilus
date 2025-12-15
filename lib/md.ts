// Simple Markdown parser with syntax highlighting
// No dependencies - just TypeScript

export interface Post {
  title: string;
  date: string;
  slug: string;
  html: string;
}

// Syntax highlighters by language
const highlighters: Record<string, (code: string) => string> = {
  js: highlightJS,
  javascript: highlightJS,
  ts: highlightJS,
  typescript: highlightJS,
  clj: highlightClojure,
  clojure: highlightClojure,
  rb: highlightRuby,
  ruby: highlightRuby,
  html: highlightHTML,
  xml: highlightHTML,
  css: highlightCSS,
  scss: highlightCSS,
  sh: highlightBash,
  bash: highlightBash,
  shell: highlightBash,
  sql: highlightSQL,
  json: highlightJSON,
  fsharp: highlightFSharp,
  "f#": highlightFSharp,
  fs: highlightFSharp,
  ocaml: highlightOCaml,
  ml: highlightOCaml,
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function span(cls: string, text: string): string {
  return `<span class="hl-${cls}">${esc(text)}</span>`;
}

// Generic regex-based highlighter
function highlight(code: string, rules: [RegExp, string][]): string {
  const tokens: { start: number; end: number; cls: string; text: string }[] = [];

  for (const [regex, cls] of rules) {
    const re = new RegExp(regex.source, "g" + (regex.flags.includes("m") ? "m" : ""));
    let match;
    while ((match = re.exec(code)) !== null) {
      tokens.push({
        start: match.index,
        end: match.index + match[0].length,
        cls,
        text: match[0],
      });
    }
  }

  // Sort by start position, longer matches first for same position
  tokens.sort((a, b) => a.start - b.start || b.end - a.end);

  // Remove overlapping tokens (keep first/longer)
  const filtered: typeof tokens = [];
  let lastEnd = 0;
  for (const t of tokens) {
    if (t.start >= lastEnd) {
      filtered.push(t);
      lastEnd = t.end;
    }
  }

  // Build result
  let result = "";
  let pos = 0;
  for (const t of filtered) {
    if (t.start > pos) {
      result += esc(code.slice(pos, t.start));
    }
    result += span(t.cls, t.text);
    pos = t.end;
  }
  result += esc(code.slice(pos));

  return result;
}

function highlightJS(code: string): string {
  return highlight(code, [
    [/\/\/.*$/m, "comment"],
    [/\/\*[\s\S]*?\*\//m, "comment"],
    [/"(?:[^"\\]|\\.)*"/g, "string"],
    [/'(?:[^'\\]|\\.)*'/g, "string"],
    [/`(?:[^`\\]|\\.)*`/g, "string"],
    [/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|true|false|null|undefined|void)\b/g, "keyword"],
    [/\b\d+\.?\d*\b/g, "number"],
  ]);
}

function highlightClojure(code: string): string {
  return highlight(code, [
    [/;.*$/m, "comment"],
    [/"(?:[^"\\]|\\.)*"/g, "string"],
    [/\b(def|defn|defmacro|let|fn|if|do|loop|recur|quote|var|throw|try|catch|finally|new|set!|ns|require|use|import|in-ns|refer|true|false|nil)\b/g, "keyword"],
    [/:\w+/g, "keyword"],
    [/\b\d+\.?\d*\b/g, "number"],
  ]);
}

function highlightRuby(code: string): string {
  return highlight(code, [
    [/#.*$/m, "comment"],
    [/"(?:[^"\\]|\\.)*"/g, "string"],
    [/'(?:[^'\\]|\\.)*'/g, "string"],
    [/\b(def|end|class|module|if|else|elsif|unless|case|when|while|until|for|do|begin|rescue|ensure|raise|return|yield|super|self|true|false|nil|and|or|not|require|include|extend|attr_accessor|attr_reader|attr_writer)\b/g, "keyword"],
    [/:\w+/g, "string"],
    [/@\w+/g, "keyword"],
    [/\b\d+\.?\d*\b/g, "number"],
  ]);
}

function highlightHTML(code: string): string {
  return highlight(code, [
    [/<!--[\s\S]*?-->/g, "comment"],
    [/"[^"]*"/g, "string"],
    [/'[^']*'/g, "string"],
    [/<\/?[\w-]+/g, "keyword"],
    [/\/?>/g, "keyword"],
    [/\b[\w-]+(?==)/g, "number"],
  ]);
}

function highlightCSS(code: string): string {
  return highlight(code, [
    [/\/\*[\s\S]*?\*\//g, "comment"],
    [/"[^"]*"/g, "string"],
    [/'[^']*'/g, "string"],
    [/[.#][\w-]+/g, "keyword"],
    [/@[\w-]+/g, "keyword"],
    [/\b\d+\.?\d*(px|em|rem|%|vh|vw|s|ms)?\b/g, "number"],
    [/#[0-9a-fA-F]{3,8}\b/g, "string"],
  ]);
}

function highlightBash(code: string): string {
  return highlight(code, [
    [/#.*$/m, "comment"],
    [/"(?:[^"\\]|\\.)*"/g, "string"],
    [/'[^']*'/g, "string"],
    [/\$\w+/g, "keyword"],
    [/\$\{[^}]+\}/g, "keyword"],
    [/\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|export|source|alias|cd|echo|pwd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|chmod|chown|sudo)\b/g, "keyword"],
  ]);
}

function highlightSQL(code: string): string {
  return highlight(code, [
    [/--.*$/m, "comment"],
    [/'(?:[^'\\]|\\.)*'/g, "string"],
    [/\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|DROP|ALTER|ADD|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|DEFAULT|CHECK|CONSTRAINT|CASCADE|TRUE|FALSE)\b/gi, "keyword"],
    [/\b\d+\.?\d*\b/g, "number"],
  ]);
}

function highlightJSON(code: string): string {
  return highlight(code, [
    [/"(?:[^"\\]|\\.)*"\s*:/g, "keyword"],
    [/"(?:[^"\\]|\\.)*"/g, "string"],
    [/\b(true|false|null)\b/g, "keyword"],
    [/\b-?\d+\.?\d*\b/g, "number"],
  ]);
}

function highlightFSharp(code: string): string {
  return highlight(code, [
    [/\/\/.*$/m, "comment"],
    [/\(\*[\s\S]*?\*\)/g, "comment"],
    [/"(?:[^"\\]|\\.)*"/g, "string"],
    [/\b(let|rec|in|fun|function|match|with|if|then|else|elif|for|while|do|done|type|of|module|open|namespace|true|false|null|mutable|new|inherit|override|abstract|member|static|private|public|internal)\b/g, "keyword"],
    [/\b\d+\.?\d*\b/g, "number"],
  ]);
}

function highlightOCaml(code: string): string {
  return highlight(code, [
    [/\(\*[\s\S]*?\*\)/g, "comment"],
    [/"(?:[^"\\]|\\.)*"/g, "string"],
    [/\b(let|rec|in|fun|function|match|with|if|then|else|for|while|do|done|type|of|module|open|struct|end|sig|val|true|false|begin|and|or|not|mod)\b/g, "keyword"],
    [/\b\d+\.?\d*\b/g, "number"],
  ]);
}

function highlightCode(code: string, lang: string): string {
  const highlighter = highlighters[lang.toLowerCase()];
  if (highlighter) {
    return highlighter(code);
  }
  return esc(code);
}

// Parse markdown to HTML
export function parseMarkdown(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      const code = codeLines.join("\n");
      const highlighted = highlightCode(code, lang);
      html.push(`<pre><code class="lang-${lang || "text"}">${highlighted}</code></pre>`);
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = parseInline(headingMatch[2]);
      html.push(`<h${level}>${text}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      html.push("<hr>");
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith(">") || (lines[i].trim() && quoteLines.length > 0 && !lines[i].startsWith("#")))) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      const quoteContent = parseMarkdown(quoteLines.join("\n"));
      html.push(`<blockquote>${quoteContent}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^[-*+]\s/, "")));
        i++;
      }
      html.push(`<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\d+\.\s/, "")));
        i++;
      }
      html.push(`<ol>${items.map((item) => `<li>${item}</li>`).join("")}</ol>`);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph - collect consecutive non-empty lines
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith("#") && !lines[i].startsWith("```") && !lines[i].startsWith(">") && !/^[-*+]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      html.push(`<p>${parseInline(paraLines.join("\n"))}</p>`);
    }
  }

  return html.join("\n");
}

// Parse inline markdown (bold, italic, code, links, images)
function parseInline(text: string): string {
  // Escape HTML first
  let result = esc(text);

  // Images: ![alt](url)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Links: [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Inline code: `code`
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold: **text** or __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic: *text* or _text_
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  result = result.replace(/(?<!\w)_([^_]+)_(?!\w)/g, "<em>$1</em>");

  // Line breaks
  result = result.replace(/\n/g, "<br>");

  return result;
}

// Extract metadata from filename and content
export function parsePost(filename: string, content: string): Post {
  // Extract date and slug from filename: YYYY-MM-DD-slug.md
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
  const date = match ? match[1] : "";
  const slug = match ? match[2] : filename.replace(/\.md$/, "");

  // Extract title from first h1
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : slug;

  // Parse markdown to HTML
  const html = parseMarkdown(content);

  return { title, date, slug, html };
}
