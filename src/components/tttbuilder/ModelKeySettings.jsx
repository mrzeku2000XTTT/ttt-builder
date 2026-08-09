import React, { useState } from "react";
import { KeyRound, Eye, EyeOff, ChevronDown, ChevronUp, ShieldCheck, Save, Check, ExternalLink, Trash2, EyeOff as HideIcon, Plus } from "lucide-react";
import { BUILDER_MODELS } from "./ModelSelector";
import {
  HOSTED_MODEL_REGISTRY,
  PROVIDER_BASE_URLS,
  PROVIDER_PRESETS,
  getHostedModelKey,
  setHostedModelKey,
  getHostedModelBaseUrl,
  setHostedModelBaseUrl,
  getHostedModelName,
  setHostedModelName,
  getHiddenModels,
  setHiddenModel,
  getLocalProviders,
  removeLocalProvider,
  LOCAL_MODEL_PREFIX,
} from "./localLlm";
import OpenModelsTab from "./OpenModelsTab";

const ADD_CUSTOM = "__add_custom__";

export default function ModelKeySettings({ model, onChangeModel, loading }) {
  const [showKey, setShowKey] = useState(false);
  const [hidden, setHidden] = useState(() => getHiddenModels());
  const [saved, setSaved] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [localProviders, setLocalProviders] = useState(() => getLocalProviders());
  const [, forceTick] = useState(0);
  const refresh = () => { setLocalProviders(getLocalProviders()); forceTick((t) => t + 1); };

  // Draft state for hosted model keys — buffered, saved on button press.
  const [draft, setDraft] = useState(() => {
    const d = {};
    BUILDER_MODELS.forEach((m) => {
      if (m.id === "ttt_agent_1" || m.id === "automatic") return;
      d[m.id] = {
        key: getHostedModelKey(m.id),
        baseUrl: getHostedModelBaseUrl(m.id),
        model: getHostedModelName(m.id),
      };
    });
    return d;
  });

  const updateDraft = (id, field, val) =>
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], [field]: val } }));

  const handleSave = () => {
    Object.entries(draft).forEach(([id, v]) => {
      setHostedModelKey(id, v.key);
      setHostedModelBaseUrl(id, v.baseUrl);
      setHostedModelName(id, v.model);
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleHide = (id) => {
    const isCurrentlyHidden = hidden.includes(id);
    setHiddenModel(id, !isCurrentlyHidden);
    setHidden(getHiddenModels());
    if (!isCurrentlyHidden && model === id) onChangeModel("ttt_agent_1");
  };

  const handleUrlPreset = (id, preset) => {
    const reg = HOSTED_MODEL_REGISTRY[id];
    const currentModel = draft[id]?.model || reg.model;
    const baseName = currentModel.replace(/^(anthropic\/|openai\/|google\/)/, "");
    setDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], baseUrl: preset.baseUrl, model: preset.modelPrefix + baseName },
    }));
  };

  const handleSelect = (val) => {
    if (val === ADD_CUSTOM) { setAddOpen(true); return; }
    onChangeModel(val);
  };

  // Build dropdown groups
  const builtin = BUILDER_MODELS.filter((m) => m.id === "ttt_agent_1" || m.id === "automatic");
  const visibleHosted = BUILDER_MODELS.filter(
    (m) => m.id !== "ttt_agent_1" && m.id !== "automatic" && !hidden.includes(m.id)
  );

  // Current selection info
  const isBuiltin = model === "ttt_agent_1" || model === "automatic";
  const isHosted = !isBuiltin && typeof model === "string" && !model.startsWith(LOCAL_MODEL_PREFIX);
  const isLocal = typeof model === "string" && model.startsWith(LOCAL_MODEL_PREFIX);
  const hostedReg = isHosted ? HOSTED_MODEL_REGISTRY[model] : null;
  const localProvider = isLocal
    ? localProviders.find((p) => `${LOCAL_MODEL_PREFIX}${p.id}` === model)
    : null;
  const localPreset = localProvider
    ? PROVIDER_PRESETS.find((p) => p.provider === localProvider.provider)
    : null;
  const d = isHosted ? (draft[model] || {}) : {};
  const urlOptions = hostedReg ? (PROVIDER_BASE_URLS[hostedReg.provider] || []) : [];

  return (
    <div className="space-y-3">
      {/* Info note */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#70C7BA]/8 border border-[#70C7BA]/20">
        <ShieldCheck className="w-3.5 h-3.5 text-[#70C7BA] flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-white/60 leading-relaxed">
          <b className="text-white/80">TTT Agent 1</b> is built-in — no key needed. Pick any other model below and enter its API key. Keys are stored <b>locally in your browser</b> and sent directly to the provider. Click <HideIcon className="w-2.5 h-2.5 inline" /> to hide models you don't use.
        </p>
      </div>

      {/* Single dropdown */}
      <div className="relative">
        <select
          value={model}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={loading}
          className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-[#70C7BA]/40 cursor-pointer pr-8"
        >
          {builtin.map((m) => (
            <option key={m.id} value={m.id} className="bg-[#161b22]">{m.label}</option>
          ))}
          {visibleHosted.length > 0 && (
            <optgroup label="Hosted Models" className="bg-[#161b22]">
              {visibleHosted.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#161b22]">{m.label}</option>
              ))}
            </optgroup>
          )}
          {localProviders.length > 0 && (
            <optgroup label="Local / Custom LLMs" className="bg-[#161b22]">
              {localProviders.map((p) => (
                <option key={p.id} value={`${LOCAL_MODEL_PREFIX}${p.id}`} className="bg-[#161b22]">
                  {p.label}
                </option>
              ))}
            </optgroup>
          )}
          <option disabled className="bg-[#161b22]">──────────</option>
          <option value={ADD_CUSTOM} className="bg-[#161b22] text-[#70C7BA]">+ Add Custom LLM…</option>
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Hidden models summary (collapsible) */}
      {hidden.length > 0 && (
        <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <span className="text-[9px] text-white/30 self-center mr-1">Hidden:</span>
          {hidden.map((id) => {
            const m = BUILDER_MODELS.find((x) => x.id === id);
            if (!m) return null;
            return (
              <button
                key={id}
                onClick={() => toggleHide(id)}
                className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 hover:text-[#70C7BA] flex items-center gap-1"
              >
                {m.label} <EyeOff className="w-2 h-2" />
              </button>
            );
          })}
        </div>
      )}

      {/* Config panel — changes based on selected model */}
      {isBuiltin && (
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[10px] text-white/50 leading-relaxed">
          {model === "ttt_agent_1"
            ? "TTT Agent 1 is the built-in AI engine. No API key needed — it just works."
            : "Auto picks the best available model automatically. No API key needed."}
        </div>
      )}

      {isHosted && hostedReg && (
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2.5">
          {/* Header + hide toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/60">{hostedReg.label}</span>
            <button
              onClick={() => toggleHide(model)}
              className="text-white/30 hover:text-white/60 text-[9px] flex items-center gap-1"
            >
              <HideIcon className="w-3 h-3" /> Hide from picker
            </button>
          </div>

          {/* API key */}
          <div className="relative">
            <KeyRound className="w-3 h-3 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type={showKey ? "text" : "password"}
              value={d.key || ""}
              onChange={(e) => updateDraft(model, "key", e.target.value)}
              placeholder={`${hostedReg.provider} API key…`}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-8 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/40 font-mono"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              type="button"
            >
              {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          </div>

          {/* Endpoint picker */}
          {urlOptions.length > 0 && (
            <div>
              <div className="text-[9px] text-white/40 mb-1 font-medium">Endpoint</div>
              <div className="flex gap-1">
                {urlOptions.map((opt) => {
                  const isActive = (d.baseUrl || hostedReg.baseUrl) === opt.baseUrl;
                  return (
                    <button
                      key={opt.baseUrl}
                      type="button"
                      onClick={() => handleUrlPreset(model, opt)}
                      className={`flex-1 px-2 py-1.5 rounded text-[9px] font-bold transition-colors border ${
                        isActive
                          ? "bg-[#70C7BA]/20 text-[#70C7BA] border-[#70C7BA]/40"
                          : "bg-white/5 text-white/50 border-white/10 hover:text-white/70"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-white/30 leading-relaxed mt-1">
                {urlOptions.find((o) => (d.baseUrl || hostedReg.baseUrl) === o.baseUrl)?.note}
              </p>
            </div>
          )}

          {/* Base URL + model name */}
          <div className="flex gap-1.5">
            <input
              value={d.baseUrl || ""}
              onChange={(e) => updateDraft(model, "baseUrl", e.target.value)}
              placeholder={hostedReg.baseUrl}
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white/70 placeholder:text-white/30 outline-none focus:border-[#70C7BA]/40 font-mono"
            />
            <input
              value={d.model || ""}
              onChange={(e) => updateDraft(model, "model", e.target.value)}
              placeholder={hostedReg.model}
              className="w-28 flex-shrink-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white/70 placeholder:text-white/30 outline-none focus:border-[#70C7BA]/40 font-mono"
            />
          </div>

          {/* Key links — direct + OpenRouter */}
          <KeyLinks provider={hostedReg.provider} />
        </div>
      )}

      {isLocal && localProvider && (
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/60">{localProvider.label}</span>
            <button
              onClick={() => {
                removeLocalProvider(localProvider.id);
                refresh();
                onChangeModel("ttt_agent_1");
              }}
              className="text-red-400/60 hover:text-red-400 text-[9px] flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
          <div className="text-[9px] text-white/40 font-mono break-all">
            {localProvider.model} · {localProvider.baseUrl}
          </div>
          {/* Key links for local provider */}
          {localPreset?.keyUrl && (
            <a
              href={localPreset.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] text-[#70C7BA] hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-2.5 h-2.5" /> Get key from {localPreset.label}
            </a>
          )}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-[#70C7BA] hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-2.5 h-2.5" /> Or use via OpenRouter
          </a>
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={loading}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            saved ? "bg-emerald-500 text-white" : "bg-[#70C7BA] text-black hover:bg-[#70C7BA]/90"
          }`}
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? "Saved!" : "Save Preferences"}
        </button>
        <span className="text-[9px] text-white/30">
          Keys &amp; preferences saved locally in your browser
        </span>
      </div>

      <OpenModelsTab
        open={addOpen}
        onClose={() => { setAddOpen(false); refresh(); }}
        onAdded={(entry) => {
          onChangeModel(`${LOCAL_MODEL_PREFIX}${entry.id}`);
          setAddOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

// Key links — shows where to get keys for direct provider + OpenRouter
function KeyLinks({ provider }) {
  const directPreset = PROVIDER_PRESETS.find((p) => {
    if (provider === "anthropic") return p.provider === "anthropic";
    if (provider === "openai") return p.provider === "openai";
    if (provider === "google") return p.provider === "google";
    if (provider === "deepseek") return p.provider === "deepseek";
    return false;
  });

  return (
    <div className="flex flex-wrap gap-3 pt-1.5 border-t border-white/[0.04]">
      {directPreset?.keyUrl && (
        <a
          href={directPreset.keyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-[#70C7BA] hover:underline flex items-center gap-1"
        >
          <ExternalLink className="w-2.5 h-2.5" /> Get {directPreset.label} key (direct)
        </a>
      )}
      <a
        href="https://openrouter.ai/keys"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[9px] text-[#70C7BA] hover:underline flex items-center gap-1"
      >
        <ExternalLink className="w-2.5 h-2.5" /> Or get an OpenRouter key (CORS-friendly)
      </a>
    </div>
  );
}