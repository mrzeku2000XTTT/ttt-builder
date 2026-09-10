import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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

function llmProxy() {
  return {
    name: "llm-proxy",
    configureServer(server) {
      server.middlewares.use("/api/llm", async (req, res, next) => {
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== "POST") return next();
        const chunks = [];
        for await (const c of req) chunks.push(c);
        let body = {};
        try { body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch {}
        const baseUrl = String(body.baseUrl || "").replace(/\/+$/, "");
        if (!hostOk(baseUrl)) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Provider host is not allowed" }));
          return;
        }
        try {
          const apiKey = body.apiKey || process.env.XAI_API_KEY || process.env.VITE_XAI_API_KEY || "";
          const r = await fetch(baseUrl + "/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(apiKey ? { Authorization: "Bearer " + apiKey } : {}),
            },
            body: JSON.stringify({
              model: body.model,
              messages: body.messages,
              temperature: body.temperature ?? 0.3,
              max_tokens: body.max_tokens ?? 16384,
              ...(body.jsonMode ? { response_format: { type: "json_object" } } : {}),
            }),
          });
          const text = await r.text();
          res.statusCode = r.status;
          res.setHeader("Content-Type", "application/json");
          res.end(text);
        } catch (e) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: e.message || "upstream failed" }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), llmProxy()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
