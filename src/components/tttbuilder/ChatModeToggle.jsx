import React from "react";
import { Hammer, ClipboardList, MessageCircle } from "lucide-react";

// Build / Plan / Discuss mode toggle — controls whether the builder writes code,
// only plans (no code), or just answers questions. Mirrors Base44's mode system.
const MODES = [
  { id: "build", label: "Build", icon: Hammer, hint: "Write & edit code" },
  { id: "plan", label: "Plan", icon: ClipboardList, hint: "Plan only — no code" },
  { id: "discuss", label: "Discuss", icon: MessageCircle, hint: "Answer questions" },
];

export default function ChatModeToggle({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5 border border-white/10">
      {MODES.map(m => {
        const Icon = m.icon;
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            disabled={disabled}
            title={m.hint}
            className={`flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-bold transition-colors disabled:opacity-40 ${
              active ? "bg-[#70C7BA] text-black" : "text-white/50 hover:text-white"
            }`}
          >
            <Icon className="w-3 h-3" />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}