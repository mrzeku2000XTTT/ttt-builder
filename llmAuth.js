import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Server-only. Never send this to the browser or write it into the Vite client bundle. */
export function resolveLlmApiKey(bodyKey) {
  const fromBody = String(bodyKey || "").trim();
  if (fromBody) return fromBody;
  const env = String(
    process.env.XAI_API_KEY || process.env.VITE_XAI_API_KEY || process.env.LLM_API_KEY || ""
  ).trim();
  if (env) return env;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".grok", "auth.json"), "utf8"));
    for (const rec of Object.values(raw || {})) {
      if (rec && typeof rec.key === "string" && rec.key.length > 20) return rec.key;
    }
  } catch { /* no Grok login on this machine */ }
  return "";
}

export function hasGrokAuth() {
  return !!resolveLlmApiKey("");
}
