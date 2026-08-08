// Bring-your-own LLM providers for TTT Builder — open-source / local model support.
// Keys live ONLY in this browser's localStorage and are sent directly to the
// provider's API. They never touch Base44 or any other server.
// This is what makes the builder open-sourceable: a cloner brings their own keys
// here and the whole build workflow runs without Base44 integration credits.

const STORAGE_KEY = "ttt_builder_local_llm";

export const LOCAL_MODEL_PREFIX = "local:";

// Presets a cloner can pick from, or they can add a custom OpenAI-compatible endpoint.
export const PROVIDER_PRESETS = [
  { provider: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", note: "Free + paid models (DeepSeek, Llama, Qwen, MiMo...). Get a key at openrouter.ai/keys. Browser-friendly CORS.", placeholderModel: "deepseek/deepseek-chat-v3.1:free" },
  { provider: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", note: "Get a key at platform.deepseek.com. (May need a CORS proxy when called from the browser.)", placeholderModel: "deepseek-chat" },
  { provider: "ollama", label: "Ollama (local)", baseUrl: "http://localhost:11434/v1", note: "Run models locally with Ollama (ollama.com). No key needed. Runs `ollama serve`.", placeholderModel: "llama3.1" },
  { provider: "custom", label: "Custom (OpenAI-compatible)", baseUrl: "", note: "Any OpenAI-compatible endpoint (LM Studio, vLLM, llama.cpp server, etc.)", placeholderModel: "my-model" },
];

export function getLocalProviders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function persist(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

export function saveLocalProvider(p) {
  const list = getLocalProviders();
  const entry = {
    id: p.id || `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    provider: p.provider || "custom",
    label: p.label || "",
    model: p.model || "",
    baseUrl: p.baseUrl || "",
    apiKey: p.apiKey || "",
  };
  list.push(entry);
  persist(list);
  return entry;
}

export function removeLocalProvider(id) {
  persist(getLocalProviders().filter(p => p.id !== id));
}

export function isLocalModelId(model) {
  return typeof model === "string" && model.startsWith(LOCAL_MODEL_PREFIX);
}

export function resolveLocalModel(modelId) {
  if (!isLocalModelId(modelId)) return null;
  const id = modelId.slice(LOCAL_MODEL_PREFIX.length);
  return getLocalProviders().find(p => p.id === id) || null;
}

// Build an OpenAI-compatible chat-completions request and call the provider directly
// from the browser. Returns a string, or a parsed object when response_json_schema is set.
export async function callLocalLlm(args) {
  const provider = resolveLocalModel(args.model);
  if (!provider) throw new Error("Open model not found. Add it in the model selector's Open Models tab.");
  const baseUrl = (provider.baseUrl || "").replace(/\/$/, "");
  if (!baseUrl) throw new Error(`"${provider.label}" has no base URL. Edit it in Open Models.`);

  let content = args.prompt || "";
  const jsonSchema = args.response_json_schema || null;
  if (jsonSchema) {
    content += `\n\nRespond with ONLY valid JSON (no markdown fences, no commentary) matching this schema:\n${JSON.stringify(jsonSchema)}`;
  }

  // OpenAI vision-style content parts. OpenRouter + OpenAI-compatible vision models
  // accept image_url; non-vision models will reject — the error surfaces to the user.
  const parts = [{ type: "text", text: content }];
  if (Array.isArray(args.file_urls)) {
    args.file_urls.forEach((u) => {
      if (typeof u === "string") parts.push({ type: "image_url", image_url: { url: u } });
    });
  }

  const headers = { "Content-Type": "application/json" };
  if (provider.apiKey) headers["Authorization"] = `Bearer ${provider.apiKey}`;
  if (provider.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://ttt.builder";
    headers["X-Title"] = "TTT Builder";
  }

  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: "user", content: parts }],
        temperature: 0.3,
      }),
    });
  } catch (err) {
    throw new Error(`Could not reach ${provider.label} (${baseUrl}). ${err.message || "network error"}. For browser CORS issues, use OpenRouter or a local Ollama server.`);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${provider.label} error ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const out = data?.choices?.[0]?.message?.content;
  const text = Array.isArray(out) ? out.map((p) => p.text || "").join("") : out;
  if (text == null) throw new Error(`${provider.label} returned no content`);

  if (jsonSchema) {
    const cleaned = String(text).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const start = cleaned.indexOf("{");
    let end = -1, depth = 0, inStr = false, esc = false;
    if (start >= 0) {
      for (let i = start; i < cleaned.length; i++) {
        const c = cleaned[i];
        if (esc) { esc = false; continue; }
        if (c === "\\") { esc = true; continue; }
        if (c === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === "{") depth++;
        else if (c === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
      }
    }
    const jsonStr = end > start ? cleaned.slice(start, end) : cleaned;
    try { return JSON.parse(jsonStr); }
    catch { throw new Error(`${provider.label} did not return valid JSON. Try a stronger model.`); }
  }
  return text;
}