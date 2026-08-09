// TTT Agent 1 orchestration — plans a build, then dispatches specialist
// subagents in a PARALLEL DAG. Up to 10 agents fire at once; each local-model
// agent chains up to 7 calls (digest→plan→detail→write→continue×3), giving
// 224K effective context (>200K target) per agent, with 10 Qwen inferences
// in flight simultaneously — "10 Qwens per second."
//
// Principles (per https://x.com/0xheycat/status/2078687584872796383):
//  - Durable handoff:  each chain link passes a compressed digest forward,
//                      never raw 32K context — so the agent never starts blank.
//  - Smallest slice:   the planner splits work into the FEWEST agents that can
//                      own non-overlapping file sets; no agent rewrites another's.
//  - No blind retries: a failed agent's files go to the Repair Agent with the
//                      failure reason — not retried identically.
//  - Evidence-based:   the File Reviewer reads the ACTUAL written files and
//                      reverts unrelated changes — done is proven, not claimed.
//
import { base44 } from "@/api/base44Client";
import { applyFileOps, FILE_OPS_SCHEMA, norm, findMissingImports } from "./projectFiles";
import { invokeLLMWithRetry } from "./llmRetry";
import { isChainableLocal, chainedAgentCall } from "./chainLocal";

// Hard cap on concurrent agents. 10 = 10 simultaneous LLM calls (one per agent).
// Local models that chain will have 10 × (chain depth) total calls, but only
// 10 in flight at any instant — Ollama's OLLAMA_NUM_PARALLEL should be ≥ 10.
const MAX_PARALLEL_AGENTS = 10;

/** Models sometimes wrap structured output in `response`, or return JSON with trailing junk. */
export function parseResult(raw) {
  let result = raw;
  if (result && !Array.isArray(result.files) && result.response !== undefined) {
    result = result.response;
  }
  if (typeof result === "string") {
    const cleaned = result.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
    try {
      result = JSON.parse(cleaned);
    } catch {
      // Trailing characters after the JSON object — slice to the balanced end.
      const start = cleaned.indexOf("{");
      let depth = 0, inStr = false, esc = false, end = -1;
      for (let i = start; i < cleaned.length; i++) {
        const c = cleaned[i];
        if (esc) { esc = false; continue; }
        if (c === "\\") { esc = true; continue; }
        if (c === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === "{") depth++;
        else if (c === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
      }
      if (end === -1) throw new Error("The model returned malformed JSON. Try again with a shorter prompt.");
      result = JSON.parse(cleaned.slice(start, end));
    }
  }
  return result;
}

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    plan: { type: "string", description: "One short sentence describing the overall build plan" },
    agents: {
      type: "array",
      description: "One entry per specialist subagent. Keep it TIGHT: 1-2 agents for a small change or simple app, 3-4 for a medium app, up to 10 for a large multi-feature app where each agent owns a non-overlapping file set. Order them so dependencies come first. More agents = more parallelism (up to 10 concurrent LLM calls).",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short agent name, e.g. 'Wallet Engineer', 'Design System', 'Send Flow'" },
          goal: { type: "string", description: "One sentence describing what this agent must deliver" },
          files: { type: "array", items: { type: "string" }, description: "Exact file paths this agent owns and will write" },
          instructions: { type: "string", description: "Detailed build instructions for this agent: behaviour, data sources, exported names, styling" },
        },
        required: ["name", "goal", "files", "instructions"],
      },
    },
    contract: { type: "string", description: "The shared contract every agent must respect: file names, global/exported function names, CSS class prefixes, state shape, design tokens." },
    reasoning: { type: "string", description: "Your first-person reasoning: what the user is really asking for, the issues you spotted, and why you split the work this way. 3-6 sentences." },
  },
  required: ["plan", "agents", "contract"],
};

/** Subagents sometimes import a CSS file no agent wrote — create it so Vite doesn't hard-fail. */
function stubMissingCssImports(files) {
  const paths = new Set(files.map(f => f.path));
  const out = [...files];
  files.forEach(f => {
    if (!/\.(js|jsx|ts|tsx)$/.test(f.path)) return;
    const dir = f.path.split("/").slice(0, -1);
    [...f.content.matchAll(/import\s+["'](\.[^"']+\.css)["']/g)].forEach(m => {
      const rel = m[1].split("/").filter(p => p !== ".");
      const stack = [...dir];
      rel.forEach(p => (p === ".." ? stack.pop() : stack.push(p)));
      const target = norm(stack.join("/"));
      if (!paths.has(target)) {
        paths.add(target);
        out.push({ path: target, content: `/* auto-created: imported by ${f.path} */\n` });
      }
    });
  });
  return out;
}

export async function orchestrateBuild({ baseRules, userPrompt, history, files, model, onProgress, fileUrls = [], attachmentNote = "" }) {
  // "ttt_agent_1" is a UI alias — resolve to the real model id before any LLM call.
  if (model === "ttt_agent_1") model = "claude_opus_4_8";
  const projectDump = files.length
    ? `Existing project files (paths only):\n${files.map(f => f.path).join("\n")}`
    : "No existing files — this is a new project.";

  const t0 = Date.now();
  const since = (t) => Math.max(1, Math.round((Date.now() - t) / 1000));

  // 1. PLAN
  onProgress?.({ type: "plan" });
  files.forEach(f => onProgress?.({ type: "activity", item: { kind: "read", path: f.path } }));
  const planRaw = await invokeLLMWithRetry({
    system: baseRules,
    prompt: `You are TTT Agent 1, the ORCHESTRATOR. Do NOT write code now. Break this build into specialist subagents that each own a small set of files.

Rules for the plan:
- FEWEST AGENTS POSSIBLE for the scope — but use MORE agents for parallelism on large builds. Hard cap: 10 agents. A simple app (a game, a small dashboard, a landing page) is 1-2 agents; a medium app is 3-4; a large multi-feature app can use up to 10, each owning a non-overlapping file set. More agents = more parallel LLM calls = faster build.
- Only add an agent when the work genuinely cannot be written by the previous one. Each agent can own 3-6 files.
- The "contract" MUST list the exact, complete set of files that will exist. Nobody may import a path that is not in that list — a missing import crashes the whole build.
- The "contract" is law: exact file paths, exact global/exported function names, CSS variable + class naming, and the shared state shape, so the separately-written files fit together perfectly.
- Put shared foundations (styles, state, api layer) before the features that consume them, and the entry point (index.html / src/main.jsx) last.
- DAG PARALLELISM: agents run concurrently — they cannot see each other's output. The contract must be complete enough that each agent can write its files independently.

${projectDump}

${history ? `Conversation so far:\n${history}\n` : ""}
${attachmentNote}
User request: ${userPrompt}`,
    model,
    file_urls: fileUrls.length ? fileUrls : undefined,
    response_json_schema: PLAN_SCHEMA,
  });

  const plan = parseResult(planRaw);
  const agents = (plan?.agents || []).filter(a => a?.name && Array.isArray(a.files)).slice(0, MAX_PARALLEL_AGENTS);
  if (!agents.length) throw new Error("The orchestrator produced no plan. Try again.");

  onProgress?.({ type: "activity", item: { kind: "thought", seconds: since(t0), text: plan.reasoning || plan.plan } });
  onProgress?.({ type: "planned", plan: plan.plan, agents: agents.map(a => ({ name: a.name, goal: a.goal, files: a.files, status: "queued" })) });

  // 2. DISPATCH
  let working = files;
  const touched = [];
  const log = [];
  const failedFiles = []; // files owed by agents that failed — handed to the Repair Agent

  // 2. DISPATCH — run ALL subagents in PARALLEL (DAG). Up to 10 agents fire
  // simultaneously — 10 concurrent LLM calls. Local models that chain will have
  // 10 × (3-4 chain links) total calls, but only 10 in flight at any instant.
  // Each agent gets the ORIGINAL project files as context (they run concurrently,
  // so they can't see each other's output) and writes only its own files per
  // the shared contract. The Repair Agent fixes cross-agent import gaps after.
  if (agents.length > 1) {
    onProgress?.({ type: "activity", item: { kind: "thought", seconds: 1, text: `DAG dispatch: ${agents.length} agents firing in parallel (${isChainableLocal(model) ? "local chain mode" : "hosted mode"})…` } });
  }
  const existingPaths = new Set(files.map(f => f.path));
  const wantsWallet = /wallet|balance|seed|send kas|receive|transaction/i.test(userPrompt);
  const sharedContext = files
    .filter(f => wantsWallet || !f.path.includes("kaspa-wallet.js"))
    .map(f => `--- FILE: ${f.path} ---\n${f.content.slice(0, f.path.includes("kaspa-wallet.js") ? 30000 : 3500)}`)
    .join("\n\n");

  const agentResults = await Promise.allSettled(
    agents.map(async (agent, i) => {
      const tAgent = Date.now();
      onProgress?.({ type: "agent_start", index: i, name: agent.name });

      const agentPrompt = (retryNote) => `${retryNote}
You are "${agent.name}", a specialist subagent inside TTT Agent 1's build team.

OVERALL BUILD: ${plan.plan}
USER REQUEST: ${userPrompt}
${attachmentNote}

SHARED CONTRACT — obey it exactly, other agents depend on it:
${plan.contract}

YOUR ASSIGNMENT: ${agent.goal}
YOU OWN ONLY THESE FILES — return their FULL final content and nothing else:
${agent.files.join("\n")}

INSTRUCTIONS:
${agent.instructions}

${sharedContext ? `Existing project files (reference only — do NOT rewrite them):\n${sharedContext}` : ""}

Return the file operations for YOUR files only. Complete, production-ready, no placeholders, no TODOs.`;

      let ops = null, lastErr = null;
      for (let attempt = 0; attempt < 2 && !ops; attempt++) {
        try {
          let raw;
          // Local models (Qwen, Llama, etc.) chain 3-4 calls to reach ~128K
          // effective context — each link digests and hands off to the next.
          // Hosted models (Agent 1, GPT, Gemini) have 200K ctx and skip the chain.
          if (isChainableLocal(model)) {
            raw = await chainedAgentCall({
              system: baseRules,
              agentPrompt: agentPrompt(attempt === 0 ? "" : "\nIMPORTANT: your previous response was malformed JSON. Return ONLY the structured file operations — valid JSON, no markdown fences, no commentary.\n"),
              model,
              fileUrls,
              responseJsonSchema: FILE_OPS_SCHEMA,
              files: working,
              onProgress,
            });
          } else {
            raw = await invokeLLMWithRetry({
              system: baseRules,
              prompt: agentPrompt(attempt === 0 ? "" : "\nIMPORTANT: your previous response was malformed JSON. Return ONLY the structured file operations — valid JSON, no markdown fences, no commentary.\n"),
              model,
              file_urls: fileUrls.length ? fileUrls : undefined,
              response_json_schema: FILE_OPS_SCHEMA,
            });
          }
          ops = parseResult(raw);
        } catch (err) {
          lastErr = err;
        }
      }
      return { index: i, agent, ops, lastErr, tAgent };
    })
  );

  // Merge all agent results in order — apply file ops sequentially so the
  // final file set is deterministic regardless of which agent finished first.
  for (const settled of agentResults) {
    const { index: i, agent, ops, lastErr, tAgent } = settled.status === "fulfilled"
      ? settled.value
      : { index: -1, agent: null, ops: null, lastErr: settled.reason, tAgent: Date.now() };

    if (!ops) {
      onProgress?.({ type: "agent_done", index: i, status: "failed", files: [] });
      onProgress?.({ type: "activity", item: { kind: "thought", seconds: since(tAgent), text: `${agent?.name || `Agent ${i}`} failed (${lastErr?.message}). Repair Agent will write its files: ${(agent?.files || []).join(", ")}` } });
      log.push(`${agent?.name || `Agent ${i}`}: failed (${lastErr?.message}) — files handed to Repair Agent`);
      (agent?.files || []).forEach(p => failedFiles.push(norm(p)));
      continue;
    }

    working = applyFileOps(working, ops);
    const wrote = (ops?.files || []).map(f => norm(f.path));
    onProgress?.({ type: "activity", item: { kind: "thought", seconds: since(tAgent), text: `${agent.name}: ${ops?.summary || agent.goal}` } });
    wrote.forEach(p => onProgress?.({ type: "activity", item: { kind: existingPaths.has(p) ? "edited" : "wrote", path: p } }));
    wrote.forEach(p => { if (!touched.includes(p)) touched.push(p); });
    log.push(`${agent.name}: ${ops?.summary || "done"}`);
    onProgress?.({ type: "agent_done", index: i, status: "done", files: wrote });
  }

  working = stubMissingCssImports(working);

  // 3. REPAIR — a single missing module (src/App.jsx, a page, a component) makes the
  // whole project fail to render, so write anything the team imported but never created.
  for (let round = 0; round < 2; round++) {
    const written = new Set(working.map(f => f.path));
    const owed = failedFiles
      .filter(p => !written.has(p))
      .map(p => ({ path: p, importer: "build plan (its agent failed)" }));
    const missing = [
      ...owed,
      ...findMissingImports(working).filter(m => !/\.css$/.test(m.path) && !owed.some(o => o.path === m.path)),
    ];
    if (!missing.length) break;

    const tRepair = Date.now();
    onProgress?.({ type: "activity", item: { kind: "thought", seconds: 1, text: `Repair Agent: ${missing.length} imported file(s) were never written — creating them: ${missing.map(m => m.path).join(", ")}` } });

    const context = working
      .filter(f => f.path !== "scripts/kaspa-wallet.js" && f.path !== "public/kaspa-wallet.js")
      .map(f => `--- FILE: ${f.path} ---\n${f.content.slice(0, 3500)}`)
      .join("\n\n");

    try {
      const raw = await invokeLLMWithRetry({
        system: baseRules,
        prompt: `You are the REPAIR AGENT. The build team imported files that were never written, so the app currently fails to render.

OVERALL BUILD: ${plan.plan}
USER REQUEST: ${userPrompt}
${attachmentNote}
SHARED CONTRACT:
${plan.contract}

WRITE THESE MISSING FILES — full, final, production-ready content, matching how they are already imported and used:
${missing.map(m => `${m.path}  (imported by ${m.importer})`).join("\n")}

Rules:
- Default-export the component/module under the name it is imported as, and accept the props the importer passes.
- These are NOT stubs: build the real, complete, fully designed implementation the project needs, consistent with the existing files' styling and structure.
- Do not rewrite or return any other file.

Existing project files:
${context}`,
        model,
        file_urls: fileUrls.length ? fileUrls : undefined,
        response_json_schema: FILE_OPS_SCHEMA,
      });
      const ops = parseResult(raw);
      working = applyFileOps(working, ops);
      const wrote = (ops?.files || []).map(f => norm(f.path));
      wrote.forEach(p => {
        onProgress?.({ type: "activity", item: { kind: "wrote", path: p } });
        if (!touched.includes(p)) touched.push(p);
      });
      log.push(`Repair Agent: created ${wrote.length} missing file(s)`);
      onProgress?.({ type: "activity", item: { kind: "thought", seconds: since(tRepair), text: `Repair Agent: wrote ${wrote.join(", ")}` } });
      working = stubMissingCssImports(working);
    } catch (err) {
      log.push(`Repair Agent: failed (${err.message})`);
      break;
    }
  }

  // 4. FILE REVIEWER — an extra agent that views every touched file and
  // REVERTS any file the user did not actually ask to change. This enforces
  // surgical editing: only files the user's request targets should change.
  const originalPaths = new Set(files.map(f => f.path));
  const modifiedExisting = touched.filter(p => originalPaths.has(p));
  if (modifiedExisting.length) {
    const tReview = Date.now();
    onProgress?.({ type: "activity", item: { kind: "thought", seconds: 1, text: `File Reviewer: checking ${modifiedExisting.length} modified file(s) for unwanted changes…` } });
    try {
      const reviewRaw = await invokeLLMWithRetry({
        system: baseRules,
        prompt: `You are the FILE REVIEWER. Your job is to protect files the user did NOT ask to change.

USER REQUEST: ${userPrompt}

The builder modified these EXISTING files:
${modifiedExisting.map(p => {
  const before = files.find(f => f.path === p);
  const after = working.find(f => f.path === p);
  return `--- ${p} ---\nBEFORE (${before?.content?.length || 0} chars):\n${(before?.content || "").slice(0, 1500)}\n\nAFTER (${after?.content?.length || 0} chars):\n${(after?.content || "").slice(0, 1500)}`;
}).join("\n\n")}

Based on the user's request, which of these files should be REVERTED to their original content because the user did not ask to change them? Only revert files where the change is clearly unrelated to the request. If a file's change is related to the request (even indirectly), keep it.

Return JSON: { "revert": ["path1", "path2"], "reasoning": "one sentence" }`,
        model,
        response_json_schema: {
          type: "object",
          properties: {
            revert: { type: "array", items: { type: "string" }, description: "File paths to revert to original content" },
            reasoning: { type: "string" },
          },
        },
      });
      const review = parseResult(reviewRaw);
      const revertPaths = (review?.revert || []).map(norm).filter(p => originalPaths.has(p));
      if (revertPaths.length) {
        const reverted = [];
        working = working.map(f => {
          if (revertPaths.includes(f.path)) {
            const orig = files.find(o => o.path === f.path);
            if (orig) { reverted.push(f.path); return orig; }
          }
          return f;
        });
        // Remove reverted paths from touched so the UI doesn't claim they changed
        revertPaths.forEach(p => { const idx = touched.indexOf(p); if (idx >= 0) touched.splice(idx, 1); });
        log.push(`File Reviewer: reverted ${reverted.length} file(s) — ${review?.reasoning || ""}`);
        onProgress?.({ type: "activity", item: { kind: "thought", seconds: since(tReview), text: `File Reviewer: reverted ${reverted.join(", ")} — ${review?.reasoning || ""}` } });
      } else {
        log.push("File Reviewer: all changes are relevant to the request — nothing reverted");
        onProgress?.({ type: "activity", item: { kind: "thought", seconds: since(tReview), text: `File Reviewer: all changes are relevant — nothing reverted` } });
      }
    } catch (err) {
      log.push(`File Reviewer: skipped (${err.message})`);
    }
  }

  return {
    files: working,
    touched,
    summary: plan.plan,
    thinking: log,
    agents: agents.map(a => ({ name: a.name, goal: a.goal, files: a.files })),
  };
}