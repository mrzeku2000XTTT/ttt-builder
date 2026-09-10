/** OpenAI-compatible chat proxy — bypasses browser CORS for xAI / DeepSeek / OpenAI. */
export const config = { maxDuration: 60 };
import { resolveLlmApiKey, hasGrokAuth } from "../llmAuth.js";
const ALLOWED = [
  "api.x.ai",
  "api.openai.com",
  "api.anthropic.com",
  "api.deepseek.com",
  "openrouter.ai",
  "api.groq.com",
  "generativelanguage.googleapis.com",
  "api.together.xyz",
  "api.mistral.ai",
  "api.fireworks.ai",
  "api.cerebras.ai",
  "api.perplexity.ai",
  "api.hyperbolic.xyz",
];

function hostOk(baseUrl) {
  try {
    const h = new URL(String(baseUrl || "")).hostname.toLowerCase();
    return ALLOWED.some((a) => h === a || h.endsWith("." + a));
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") return res.status(200).json({ grok: hasGrokAuth() });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const baseUrl = String(body.baseUrl || "").replace(/\/+$/, "");
  if (!hostOk(baseUrl)) {
    return res.status(400).json({ error: "Provider host is not allowed" });
  }
  const apiKey = resolveLlmApiKey(body.apiKey);
  const payload = {
    model: body.model,
    messages: body.messages,
    temperature: body.temperature ?? 0.3,
    max_tokens: body.max_tokens ?? 16384,
  };
  if (body.jsonMode) payload.response_format = { type: "json_object" };
  try {
    const r = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: "Bearer " + apiKey } : {}),
      },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    res.status(r.status).setHeader("Content-Type", "application/json").send(text);
  } catch (e) {
    res.status(502).json({ error: e.message || "upstream failed" });
  }
}
