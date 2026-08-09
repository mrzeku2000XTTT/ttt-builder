import React, { useState, useRef, useEffect } from "react";
import { X, Plus, Trash2, KeyRound, ChevronDown, ChevronRight, ExternalLink, Globe, Search, Check } from "lucide-react";
import { getLocalProviders, saveLocalProvider, removeLocalProvider, PROVIDER_PRESETS } from "./localLlm";

/**
 * ProviderPicker — custom searchable dropdown for 30+ LLM providers.
 * Replaces the native <select> which is too long for mobile.
 */
function ProviderPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = PROVIDER_PRESETS.find((p) => p.provider === value) || PROVIDER_PRESETS[0];

  const groups = [
    { label: "CORS-friendly (browser)", filter: (p) => p.cors && p.region !== "Local" && p.region !== "Custom" },
    { label: "Western (may need proxy)", filter: (p) => !p.cors && p.region !== "China" && p.region !== "Local" && p.region !== "Custom" },
    { label: "Chinese (international)", filter: (p) => p.region === "Global" && (p.provider.includes("qwen") || p.provider.includes("moonshot") || p.provider.includes("zhipu") || p.provider.includes("minimax")) },
    { label: "Chinese (China endpoints)", filter: (p) => p.region === "China" },
    { label: "Local / Self-hosted", filter: (p) => p.region === "Local" || p.region === "Custom" },
  ];

  const q = query.toLowerCase().trim();
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      items: PROVIDER_PRESETS.filter((p) => g.filter(p) && (!q || p.label.toLowerCase().includes(q) || p.provider.includes(q))),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-[#70C7BA]/40"
      >
        <span className="truncate font-medium">{selected.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-white/40 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/15 rounded-lg shadow-2xl overflow-hidden">
          {/* Search */}
          <div className="relative border-b border-white/10">
            <Search className="w-3 h-3 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search providers…"
              className="w-full bg-transparent pl-7 pr-3 py-2 text-[11px] text-white placeholder:text-white/30 outline-none"
            />
          </div>
          {/* List */}
          <div className="max-h-[200px] overflow-y-auto overscroll-contain">
            {filteredGroups.map((g) => (
              <div key={g.label}>
                <div className="px-2.5 py-1 text-[9px] font-bold text-white/30 uppercase tracking-wider sticky top-0 bg-[#1a1a1a]">
                  {g.label}
                </div>
                {g.items.map((p) => (
                  <button
                    key={p.provider}
                    type="button"
                    onClick={() => { onChange(p.provider); setOpen(false); setQuery(""); }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 text-left text-[11px] transition-colors ${
                      p.provider === value
                        ? "bg-[#007bff] text-white"
                        : "text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex-1 truncate">{p.label}</span>
                    {p.provider === value && <Check className="w-3 h-3 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <div className="px-3 py-4 text-[10px] text-white/30 text-center">No providers found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * OpenModelsTab — manage bring-your-own-key LLM providers.
 * Model-first: paste any model string (e.g. nvidia/nemotron-3-super-120b-a12b:free)
 * and the provider is auto-detected. Keys are stored only in the browser.
 */
export default function OpenModelsTab({ open, onClose, onAdded }) {
  const [list, setList] = useState(() => getLocalProviders());
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [nickname, setNickname] = useState("");
  const [provider, setProvider] = useState("openrouter");
  const [baseUrl, setBaseUrl] = useState(PROVIDER_PRESETS[0].baseUrl);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [err, setErr] = useState("");

  if (!open) return null;

  const refresh = () => setList(getLocalProviders());

  const autoDetectProvider = (modelStr) => {
    const s = modelStr.toLowerCase();
    if (s.startsWith("gemini") || s.startsWith("gemma")) return "google";
    if (s.startsWith("llama-") || s.startsWith("meta-llama") || s.startsWith("mixtral") || s.includes("groq")) return "groq";
    if (s.startsWith("deepseek")) return "deepseek";
    if (s.startsWith("mistral") || s.startsWith("codestral") || s.startsWith("pixtral")) return "mistral";
    if (s.startsWith("qwen") || s.includes("qwen")) return "qwen_intl";
    if (s.startsWith("kimi") || s.includes("moonshot")) return "moonshot_intl";
    if (s.startsWith("glm") || s.includes("zhipu") || s.includes("chatglm")) return "zhipu_intl";
    if (s.startsWith("minimax") || s.includes("minimax")) return "minimax_intl";
    if (s.startsWith("baichuan")) return "baichuan";
    if (s.startsWith("yi-") || s.startsWith("yi_")) return "yi";
    if (s.startsWith("step")) return "stepfun";
    if (s.startsWith("doubao")) return "doubao";
    if (s.startsWith("hunyuan")) return "hunyuan";
    if (s.startsWith("ernie")) return "ernie";
    if (s.startsWith("spark") || s.startsWith("generalv")) return "spark";
    if (s.startsWith("grok")) return "xai";
    if (s.includes("/")) return "openrouter";
    return provider;
  };

  const onModelChange = (val) => {
    setModel(val);
    const detected = autoDetectProvider(val);
    if (detected !== provider) {
      setProvider(detected);
      const pr = PROVIDER_PRESETS.find((x) => x.provider === detected);
      if (pr) setBaseUrl(pr.baseUrl);
    }
  };

  const onPresetChange = (p) => {
    setProvider(p);
    const pr = PROVIDER_PRESETS.find((x) => x.provider === p);
    if (pr) setBaseUrl(pr.baseUrl);
  };

  const add = () => {
    setErr("");
    if (!model.trim()) { setErr("Enter a model name."); return; }
    if (!baseUrl.trim()) { setErr("Enter a base URL."); return; }
    const preset = PROVIDER_PRESETS.find((p) => p.provider === provider) || PROVIDER_PRESETS[0];
    const entry = saveLocalProvider({
      provider,
      label: nickname.trim() || model.trim(),
      model: model.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
    });
    setNickname(""); setModel(""); setApiKey("");
    refresh();
    onAdded?.(entry);
  };

  const preset = PROVIDER_PRESETS.find((p) => p.provider === provider) || PROVIDER_PRESETS[0];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#161b22] border border-white/10 rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] overflow-y-auto overscroll-contain">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-5 h-5 text-[#70C7BA] flex-shrink-0" />
          <h2 className="font-bold text-white text-sm sm:text-base">Open Models - Bring Your Own</h2>
          <button onClick={onClose} className="ml-auto text-white/40 hover:text-white flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>

        <div className="text-[10px] sm:text-[11px] text-white/60 mb-3 px-2.5 py-2 rounded-lg bg-[#70C7BA]/10 border border-[#70C7BA]/20 leading-relaxed">
          Keys are stored <b>only in this browser</b> (localStorage) and sent directly to the provider. They never touch Base44 or any other server. Paste any model name — the provider is auto-detected.
        </div>

        {provider === "ollama" && (
          <div className="text-[10px] sm:text-[11px] text-amber-200/80 mb-3 px-2.5 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 leading-relaxed">
            <b>Parallel mode:</b> TTT Builder fires all subagents at once. To make Ollama actually run them concurrently (not queue them), start it with <code className="text-amber-300">OLLAMA_NUM_PARALLEL=4 ollama serve</code> (or higher if your CPU/GPU can handle it). This lets the same qwen model power multiple agents simultaneously.
          </div>
        )}

        {list.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {list.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[#70C7BA] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{p.label}</div>
                  <div className="text-[10px] text-white/40 truncate">{p.model} - {p.baseUrl}</div>
                </div>
                <button onClick={() => { removeLocalProvider(p.id); refresh(); }} className="text-white/40 hover:text-red-400 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 border-t border-white/10 pt-3">
          <div className="text-xs font-bold text-white/70">Add a model</div>
          <input
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder="Paste any model, e.g. nvidia/nemotron-3-super-120b-a12b:free"
            className="w-full bg-white/5 border border-[#70C7BA]/30 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/60"
            autoFocus
          />
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname (e.g. Free Key, Paid Key, Work)"
            className="w-full bg-white/5 border border-[#70C7BA]/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/60"
          />
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            placeholder={provider === "ollama" ? "API key (not needed for local Ollama)" : "API key"}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none"
          />

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white/80 transition-colors mt-1"
          >
            {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Advanced (provider & base URL)
          </button>

          {showAdvanced && (
            <div className="space-y-2 pt-1">
              {/* Custom searchable provider picker — fits mobile */}
              <ProviderPicker value={provider} onChange={onPresetChange} />
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="Base URL"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2.5 text-xs text-white placeholder:text-white/30 outline-none font-mono"
              />
              <p className="text-[10px] text-white/40 leading-relaxed">{preset.note}</p>
              {/* Key link */}
              {preset.keyUrl && (
                <a
                  href={preset.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#70C7BA] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Get API key from {preset.label}
                </a>
              )}
              {/* OpenRouter alternative */}
              {preset.provider !== "openrouter" && preset.provider !== "ollama" && preset.provider !== "custom" && (
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#70C7BA] hover:underline flex items-center gap-1"
                >
                  <Globe className="w-3 h-3" /> Or use this model via OpenRouter (CORS-friendly)
                </a>
              )}
            </div>
          )}

          {err && <p className="text-[10px] text-red-400">{err}</p>}
          <button
            onClick={add}
            className="w-full h-10 rounded-lg bg-[#70C7BA] text-black text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#70C7BA]/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add model
          </button>
        </div>
      </div>
    </div>
  );
}