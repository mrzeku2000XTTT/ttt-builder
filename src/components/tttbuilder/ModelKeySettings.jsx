import React, { useState } from "react";
import { KeyRound, Eye, EyeOff, ChevronDown, ChevronUp, Cpu, ShieldCheck, Save, Check, EyeOff as HideIcon, Eye as UnhideIcon } from "lucide-react";
import { BUILDER_MODELS } from "./ModelSelector";
import {
  HOSTED_MODEL_REGISTRY,
  PROVIDER_BASE_URLS,
  getHostedModelKey,
  setHostedModelKey,
  getHostedModelBaseUrl,
  setHostedModelBaseUrl,
  getHostedModelName,
  setHostedModelName,
  getHiddenModels,
  setHiddenModel,
} from "./localLlm";

export default function ModelKeySettings({ model, onChangeModel, loading }) {
  const [expanded, setExpanded] = useState(null);
  const [showKey, setShowKey] = useState({});
  const [hidden, setHidden] = useState(() => getHiddenModels());
  const [saved, setSaved] = useState(false);

  // Draft state — buffered from localStorage, saved on button press.
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
    // If hiding the currently selected model, fall back to TTT Agent 1
    if (!isCurrentlyHidden && model === id) {
      onChangeModel("ttt_agent_1");
    }
  };

  const handleUrlPreset = (id, preset) => {
    const reg = HOSTED_MODEL_REGISTRY[id];
    const currentModel = draft[id]?.model || reg.model;
    // Strip any existing provider prefix, then re-apply the new one
    const baseName = currentModel.replace(/^(anthropic\/|openai\/|google\/)/, "");
    const newModel = preset.modelPrefix + baseName;
    setDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], baseUrl: preset.baseUrl, model: newModel },
    }));
  };

  return (
    <div className="space-y-1.5">
      {/* Built-in note */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#70C7BA]/8 border border-[#70C7BA]/20 mb-1">
        <ShieldCheck className="w-3.5 h-3.5 text-[#70C7BA] flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-white/60 leading-relaxed">
          <b className="text-white/80">TTT Agent 1</b> uses the built-in Base44 engine — no key needed. All other models call the provider <b>directly from your browser</b>. Keys are stored locally, never sent to Base44. Click <EyeOff className="w-2.5 h-2.5 inline" /> to hide models you don't use — they disappear from the input picker.
        </p>
      </div>

      {BUILDER_MODELS.map((m) => {
        const isBuiltin = m.id === "ttt_agent_1" || m.id === "automatic";
        const reg = HOSTED_MODEL_REGISTRY[m.id];
        const active = model === m.id;
        const isExpanded = expanded === m.id;
        const isHidden = hidden.includes(m.id);
        const d = draft[m.id] || {};
        const hasKey = !isBuiltin && !!d.key;
        const urlOptions = reg ? (PROVIDER_BASE_URLS[reg.provider] || []) : [];

        // Hidden models show as a compact greyed-out row with an unhide button
        if (isHidden) {
          return (
            <div key={m.id} className="rounded-lg border border-white/[0.04] bg-white/[0.01] opacity-50">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                <span className="text-xs text-white/40 truncate flex-1">{m.label}</span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/40 flex-shrink-0">
                  HIDDEN
                </span>
                <button
                  onClick={() => toggleHide(m.id)}
                  className="text-white/30 hover:text-[#70C7BA] p-1 flex-shrink-0"
                  title="Show in picker"
                >
                  <UnhideIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        }

        return (
          <div
            key={m.id}
            className={`rounded-lg border transition-colors ${
              active ? "border-[#70C7BA]/40 bg-[#70C7BA]/8" : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            {/* Row header — click to select */}
            <div className="flex items-center gap-1.5 px-2.5 py-2">
              <button
                onClick={() => !loading && onChangeModel(m.id)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-[#70C7BA]" : "bg-white/20"}`} />
                <span className={`text-xs font-bold truncate ${active ? "text-white" : "text-white/60"}`}>
                  {m.label}
                </span>
                {isBuiltin ? (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#70C7BA]/20 text-[#70C7BA] flex-shrink-0">
                    BUILT-IN
                  </span>
                ) : hasKey ? (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                    KEY SET
                  </span>
                ) : (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400/80 flex-shrink-0">
                    NO KEY
                  </span>
                )}
              </button>

              {/* Hide toggle for non-builtin models */}
              {!isBuiltin && (
                <button
                  onClick={() => toggleHide(m.id)}
                  className="text-white/30 hover:text-white/60 p-1 flex-shrink-0"
                  title="Hide from picker"
                >
                  <HideIcon className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Expand toggle for external models */}
              {!isBuiltin && reg && (
                <button
                  onClick={() => setExpanded(isExpanded ? null : m.id)}
                  className="text-white/30 hover:text-white/60 p-1 flex-shrink-0"
                  title="Configure API key"
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Expanded key config */}
            {!isBuiltin && isExpanded && reg && (
              <div className="px-2.5 pb-2.5 space-y-2.5 border-t border-white/[0.04] pt-2">
                {/* API key */}
                <div className="relative">
                  <KeyRound className="w-3 h-3 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showKey[m.id] ? "text" : "password"}
                    value={d.key || ""}
                    onChange={(e) => updateDraft(m.id, "key", e.target.value)}
                    placeholder={`${reg.provider} API key…`}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-8 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/40 font-mono"
                  />
                  <button
                    onClick={() => setShowKey((s) => ({ ...s, [m.id]: !s[m.id] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    type="button"
                  >
                    {showKey[m.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>

                {/* URL preset picker — choose endpoint per provider */}
                {urlOptions.length > 0 && (
                  <div>
                    <div className="text-[9px] text-white/40 mb-1 font-medium">Endpoint</div>
                    <div className="flex gap-1">
                      {urlOptions.map((opt) => {
                        const isActiveUrl = (d.baseUrl || reg.baseUrl) === opt.baseUrl;
                        return (
                          <button
                            key={opt.baseUrl}
                            type="button"
                            onClick={() => handleUrlPreset(m.id, opt)}
                            className={`flex-1 px-2 py-1.5 rounded text-[9px] font-bold transition-colors border ${
                              isActiveUrl
                                ? "bg-[#70C7BA]/20 text-[#70C7BA] border-[#70C7BA]/40"
                                : "bg-white/5 text-white/50 border-white/10 hover:text-white/70"
                            }`}
                            title={opt.baseUrl}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-white/30 leading-relaxed mt-1">
                      {urlOptions.find((o) => (d.baseUrl || reg.baseUrl) === o.baseUrl)?.note || "Pick an endpoint — the model name auto-updates to match."}
                    </p>
                  </div>
                )}

                {/* Base URL + model name (manual override) */}
                <div>
                  <div className="text-[9px] text-white/40 mb-1 font-medium">Base URL &amp; model name</div>
                  <div className="flex gap-1.5">
                    <input
                      value={d.baseUrl || ""}
                      onChange={(e) => updateDraft(m.id, "baseUrl", e.target.value)}
                      placeholder={reg.baseUrl}
                      className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white/70 placeholder:text-white/30 outline-none focus:border-[#70C7BA]/40 font-mono"
                    />
                    <input
                      value={d.model || ""}
                      onChange={(e) => updateDraft(m.id, "model", e.target.value)}
                      placeholder={reg.model}
                      className="w-28 flex-shrink-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white/70 placeholder:text-white/30 outline-none focus:border-[#70C7BA]/40 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Save button */}
      <div className="flex items-center gap-2 pt-2">
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
          Keys &amp; hidden models saved locally in your browser
        </span>
      </div>
    </div>
  );
}