import React, { useState } from "react";
import { Cpu } from "lucide-react";
import { getLocalProviders, LOCAL_MODEL_PREFIX } from "./localLlm";
import OpenModelsTab from "./OpenModelsTab";

export const BUILDER_MODELS = [
  { id: "ttt_agent_1", label: "TTT Agent 1 ⚡" },
  { id: "automatic", label: "Auto (best available)" },
  { id: "claude_opus_4_8", label: "Claude Opus 4.8" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { id: "claude_sonnet_4_6", label: "Claude Sonnet 4.6" },
  { id: "gpt_5_6_sol", label: "GPT-5.6 Sol" },
  { id: "gpt_5_4", label: "GPT-5.4" },
  { id: "gemini_3_1_pro", label: "Gemini 3.1 Pro" },
  { id: "gemini_3_flash", label: "Gemini 3 Flash (fast)" },
  { id: "gpt_5_mini", label: "GPT-5 Mini (fast)" },
];

const ADD_VALUE = "__add_local__";

export default function ModelSelector({ value, onChange, disabled }) {
  const [mgrOpen, setMgrOpen] = useState(false);
  const [, forceTick] = useState(0);
  const local = getLocalProviders();

  const handleChange = (v) => {
    if (v === ADD_VALUE) {
      setMgrOpen(true);
      return; // keep current selection
    }
    onChange(v);
  };

  return (
    <>
      <label className="flex items-center gap-1.5 h-8 pl-2 pr-1 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer">
        <Cpu className="w-3.5 h-3.5 flex-shrink-0" />
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="bg-transparent outline-none text-[11px] font-bold text-white/70 cursor-pointer disabled:opacity-40 max-w-[150px]"
        >
          <optgroup label="Hosted">
            {BUILDER_MODELS.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#161b22] text-white">{m.label}</option>
            ))}
          </optgroup>
          {local.length > 0 && (
            <optgroup label="Open / Local">
              {local.map((p) => (
                <option key={p.id} value={`${LOCAL_MODEL_PREFIX}${p.id}`} className="bg-[#161b22] text-white">
                  {p.label}
                </option>
              ))}
            </optgroup>
          )}
          <option value={ADD_VALUE} className="bg-[#161b22] text-white">+ Add open model...</option>
        </select>
      </label>
      <OpenModelsTab
        open={mgrOpen}
        onClose={() => { setMgrOpen(false); forceTick((t) => t + 1); }}
      />
    </>
  );
}