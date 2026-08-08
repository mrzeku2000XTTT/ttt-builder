import { base44 } from "@/api/base44Client";

/**
 * Hidden elaboration pass: turns a short user prompt into a precise build brief.
 * Stays strictly inside the user's intent — it clarifies, it never adds new topics.
 */
export async function enhancePrompt(rawPrompt, { buildMode = "html", hasProject = false } = {}) {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a senior product engineer turning a short request into a precise build brief for a code-generating agent.

USER REQUEST: "${rawPrompt}"
TARGET STACK: ${buildMode === "react" ? "React + Vite npm project" : "vanilla HTML/CSS/JS"}
CONTEXT: ${hasProject ? "modifying an existing project" : "building from scratch"}

RULES:
- Stay EXACTLY inside the user's intent. Never introduce extra topics, extra entities or extra data the user did not ask for. If they asked for a Kaspa dashboard, the brief covers Kaspa only — no other coins.
- Spell out: the sections/screens, the concrete data each one shows, where that data comes from (name the real public API endpoint when the data is real-world), the interactions, and the visual direction.
- Require live data with loading, error and last-updated states whenever real-world numbers are involved. No mock values.
- Be concrete and compact: 120-200 words, plain prose or short bullets. No preamble, no headings, no code.

Return only the improved brief.`,
    response_json_schema: {
      type: "object",
      properties: { brief: { type: "string" } },
      required: ["brief"],
    },
  });

  const brief = typeof res === "string" ? res : res?.brief || res?.response?.brief;
  return (brief || rawPrompt).trim();
}