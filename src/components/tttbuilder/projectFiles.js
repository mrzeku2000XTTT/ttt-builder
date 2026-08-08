// Virtual multi-file project helpers for TTT Builder

export const norm = (p) => String(p || "").replace(/^\.?\//, "").trim();

export const sortFiles = (files) =>
  [...files].sort((a, b) => {
    if (a.path === "index.html") return -1;
    if (b.path === "index.html") return 1;
    return a.path.localeCompare(b.path);
  });

export const fileLang = (path) => {
  const ext = path.split(".").pop().toLowerCase();
  if (ext === "css") return "css";
  if (ext === "js" || ext === "mjs") return "javascript";
  if (ext === "json") return "json";
  if (ext === "html") return "html";
  return "text";
};

/**
 * Bundles a virtual file tree into a single self-contained HTML document
 * so it can run inside a sandboxed iframe (no network access).
 */
export function bundleProject(files) {
  const map = {};
  files.forEach((f) => { map[norm(f.path)] = f.content || ""; });

  let html = map["index.html"];
  if (!html) return "";

  // Inline <link rel="stylesheet" href="...">
  html = html.replace(/<link[^>]*href=["']([^"']+)["'][^>]*>/gi, (tag, href) => {
    if (!/stylesheet/i.test(tag)) return tag;
    const css = map[norm(href)];
    return css !== undefined ? `<style>\n${css}\n</style>` : tag;
  });

  // Inline <script src="...">
  html = html.replace(/<script([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi, (tag, pre, src, post) => {
    const js = map[norm(src)];
    if (js === undefined) return tag;
    const isModule = /type=["']module["']/i.test(pre + post);
    return `<script${isModule ? ' type="module"' : ""}>\n${js}\n</script>`;
  });

  return html;
}

/** Resolves a relative import from `fromPath` to a concrete project path. */
const resolveImport = (fromPath, spec) => {
  const stack = fromPath.split("/").slice(0, -1);
  spec.split("/").forEach((p) => {
    if (p === "." || p === "") return;
    if (p === "..") stack.pop();
    else stack.push(p);
  });
  return norm(stack.join("/"));
};

/**
 * Every relative import in the project that has no matching file.
 * A single missing module (e.g. src/App.jsx) makes the whole build fail to render.
 */
export function findMissingImports(files) {
  const paths = new Set(files.map((f) => norm(f.path)));
  const missing = new Map(); // path -> importer
  files.forEach((f) => {
    if (!/\.(js|jsx|ts|tsx)$/.test(f.path)) return;
    const specs = [
      ...[...f.content.matchAll(/(?:from|import)\s*["'](\.[^"']+)["']/g)].map((m) => m[1]),
    ];
    specs.forEach((spec) => {
      const base = resolveImport(f.path, spec);
      const candidates = /\.\w+$/.test(base)
        ? [base]
        : [`${base}.jsx`, `${base}.js`, `${base}.ts`, `${base}.tsx`, `${base}/index.jsx`, `${base}/index.js`];
      if (candidates.some((c) => paths.has(c))) return;
      const target = /\.\w+$/.test(base) ? base : `${base}.jsx`;
      if (!missing.has(target)) missing.set(target, f.path);
    });
  });
  return [...missing].map(([path, importer]) => ({ path, importer }));
}

/** LLMs sometimes emit literal "\u2014" text instead of the character. Decode it. */
const decodeEscapes = (s) =>
  s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

/** Applies the agent's file operations to the current tree. */
export function applyFileOps(current, ops) {
  const next = [...current];
  (ops?.files || []).forEach((f) => {
    const path = norm(f.path);
    if (!path || typeof f.content !== "string") return;
    const content = decodeEscapes(f.content);
    const idx = next.findIndex((x) => x.path === path);
    if (idx >= 0) next[idx] = { path, content };
    else next.push({ path, content });
  });
  const deleted = (ops?.deleted_files || []).map(norm);
  return sortFiles(next.filter((f) => !deleted.includes(f.path)));
}

export const FILE_OPS_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "Short friendly explanation of what changed" },
    thinking: {
      type: "array",
      description: "3-6 short first-person reasoning steps describing how you planned and built this (scope decision, data source, file structure, tricky parts). One sentence each.",
      items: { type: "string" },
    },
    files: {
      type: "array",
      description: "Full contents of every file created or modified",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
    deleted_files: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "files"],
};