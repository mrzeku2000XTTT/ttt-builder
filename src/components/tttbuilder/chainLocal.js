// Context chaining for local LLMs (Qwen, Llama, etc.) — DAG-style handoff.
//
// Problem: a single Qwen call has ~32K context. The system prompt alone is ~8K
// tokens, and real projects have 10-20K tokens of file context. One call can't
// hold it all, so output degrades or truncates.
//
// Solution: chain N calls. Each call does ONE job and hands a compressed
// "digest" forward to the next. The chain forms a DAG:
//
//   [Call 1: digest files]  ──>  [Call 2: plan chunk]  ──>  [Call 3: write files]
//        32K ctx in                    32K ctx in               32K ctx in
//        ~4K digest out                ~4K plan out              full code out
//
// Effective context: 32K × 3 = 96K of processing, approaching Agent 1's 200K.
// Each link only carries forward what the next link needs — never the raw 32K.

import { invokeLLMWithRetry } from "./llmRetry";
import { parseResult } from "./orchestrator";

const MAX_CHAIN_DEPTH = 4; // hard cap — 4 × 32K = 128K effective
const DIGEST_TOKEN_BUDGET = 3000; // chars — keeps the handoff small enough to fit next call

/**
 * Detect whether a model id is a local/BYO-key model that benefits from chaining.
 * Hosted models (claude, gpt, gemini, automatic) have 200K+ context and don't need it.
 */
export function isChainableLocal(model) {
  if (!model || model === "automatic") return false;
  if (model.startsWith("claude") || model.startsWith("gpt") || model.startsWith("gemini")) return false;
  if (model === "ttt_agent_1") return false;
  // Ollama, Groq, Together, OpenRouter, custom — all benefit from chaining.
  return true;
}

/**
 * Compress a file list into a compact digest the next chain link can use.
 * This is the "handoff" — it carries forward structure, not raw content.
 */
function digestFiles(files, focusPath = null) {
  if (!files.length) return "No existing files.";
  const lines = [];
  for (const f of files) {
    const content = f.content || "";
    // If a focus path is given, give that file more room; others get tight summaries.
    const budget = focusPath && f.path === focusPath ? 2000 : 400;
    const slice = content.slice(0, budget);
    const exports = [];
    // Extract export names so the next link knows the API surface.
    const exportMatches = [...content.matchAll(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/g)];
    if (exportMatches.length) exports.push(`exports: ${exportMatches.slice(0, 8).map(m => m[1]).join(", ")}`);
    const importMatches = [...content.matchAll(/import\s+(?:{[^}]+}|\w+)\s+from\s+["']([^"']+)["']/g)];
    if (importMatches.length) exports.push(`imports: ${importMatches.slice(0, 6).map(m => m[1]).join(", ")}`);
    lines.push(`--- ${f.path} (${content.length} chars) ${exports.join(" | ")} ---\n${slice}`);
  }
  return lines.join("\n\n").slice(0, 12000);
}

/**
 * Run a chained build for a single agent assignment using a local model.
 *
 * Chain links:
 *   1. DIGEST  — read all project files, produce a structural summary
 *   2. PLAN    — given the digest + contract + assignment, outline the code to write
 *   3. WRITE   — given the plan + digest + assignment, produce the file operations
 *   (4. CONTINUE — if WRITE truncated, continue from where it stopped)
 *
 * Returns the same shape as a single invokeLLMWithRetry call (raw response).
 */
export async function chainedAgentCall({ system, agentPrompt, model, fileUrls, responseJsonSchema, files, onProgress }) {
  const t0 = Date.now();
  const since = () => Math.max(1, Math.round((Date.now() - t0) / 1000));

  // ── LINK 1: DIGEST ──────────────────────────────────────────────
  // Give the digester the full file list (up to 32K) and ask for a compact
  // structural summary — exports, imports, data shape, styling tokens.
  onProgress?.({ type: "activity", item: { kind: "thought", seconds: 1, text: `Chain link 1/3: digesting project context…` } });

  const digestInput = files.length
    ? files.map(f => `--- FILE: ${f.path} ---\n${f.content.slice(0, 8000)}`).join("\n\n").slice(0, 28000)
    : "No existing files — new project.";

  let digest;
  try {
    const digestRaw = await invokeLLMWithRetry({
      system: "You are a CODE DIGESTER. Read the project files and produce a TIGHT structural summary. List each file's: purpose, exports, imports, key functions, state shape, CSS tokens. Be concise — this summary will be fed to the next agent who writes code. Max 3000 chars.",
      prompt: `Project files:\n${digestInput}\n\nProduce the structural digest now. One line per file, grouped by folder.`,
      model,
    });
    digest = typeof digestRaw === "string" ? digestRaw : (digestRaw?.response || JSON.stringify(digestRaw));
    if (digest.length > DIGEST_TOKEN_BUDGET * 4) digest = digest.slice(0, DIGEST_TOKEN_BUDGET * 4);
  } catch {
    // If digestion fails, fall back to a mechanical digest — better than nothing.
    digest = digestFiles(files);
  }

  onProgress?.({ type: "activity", item: { kind: "thought", seconds: since(), text: `Chain link 1/3 done — digest: ${digest.length} chars` } });

  // ── LINK 2: PLAN ─────────────────────────────────────────────────
  // Using the digest (not raw files), plan the code for this agent's files.
  onProgress?.({ type: "activity", item: { kind: "thought", seconds: 1, text: `Chain link 2/3: planning code structure…` } });

  let codePlan;
  try {
    const planRaw = await invokeLLMWithRetry({
      system: "You are a CODE PLANNER. Given a project digest and an agent assignment, outline the exact code you will write for each file: component structure, state, handlers, JSX layout, CSS classes. Do NOT write the full code — just the outline. Max 2500 chars.",
      prompt: `PROJECT DIGEST:\n${digest}\n\n${agentPrompt}\n\nOutline the code for YOUR files only.`,
      model,
    });
    codePlan = typeof planRaw === "string" ? planRaw : (planRaw?.response || JSON.stringify(planRaw));
  } catch {
    codePlan = "";
  }

  onProgress?.({ type: "activity", item: { kind: "thought", seconds: since(), text: `Chain link 2/3 done — plan: ${codePlan.length} chars` } });

  // ── LINK 3: WRITE ────────────────────────────────────────────────
  // Now write the actual file operations, using the digest + plan (not raw files).
  // This call has ~32K context: system (~8K) + digest (~3K) + plan (~2.5K) +
  // agentPrompt (~2K) = ~15.5K input, leaving ~16K for output.
  onProgress?.({ type: "activity", item: { kind: "thought", seconds: 1, text: `Chain link 3/3: writing files…` } });

  const writePrompt = `PROJECT DIGEST (structural summary of existing files):
${digest}

CODE PLAN (your outline for this assignment):
${codePlan}

${agentPrompt}

Now WRITE the complete file operations. Use the digest and plan above — do not re-read the raw files. Return the structured file operations.`;

  let raw = await invokeLLMWithRetry({
    system,
    prompt: writePrompt,
    model,
    file_urls: fileUrls?.length ? fileUrls : undefined,
    response_json_schema: responseJsonSchema,
  });

  // ── LINK 4 (optional): CONTINUE ──────────────────────────────────
  // If the write call produced truncated/incomplete JSON, chain one more link
  // that asks the model to finish, using the partial output as handoff.
  let depth = 3;
  let partial = null;
  try { partial = parseResult(raw); } catch { /* truncated — will try continue */ }

  while ((!partial || !partial?.files?.length) && depth < MAX_CHAIN_DEPTH) {
    onProgress?.({ type: "activity", item: { kind: "thought", seconds: since(), text: `Chain link ${depth + 1}: continuing (previous output incomplete)…` } });
    const partialText = typeof raw === "string" ? raw.slice(-4000) : "";
    raw = await invokeLLMWithRetry({
      system,
      prompt: `Your previous response was incomplete or malformed. Here is the tail of what you produced:\n${partialText}\n\n${agentPrompt}\n\nReturn the COMPLETE structured file operations now — valid JSON, no markdown fences.`,
      model,
      response_json_schema: responseJsonSchema,
    });
    try { partial = parseResult(raw); } catch { /* keep trying */ }
    depth++;
  }

  onProgress?.({ type: "activity", item: { kind: "thought", seconds: since(), text: `Chain complete (${depth} links)` } });
  return raw;
}