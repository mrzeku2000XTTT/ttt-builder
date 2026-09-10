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
    <div className="grid grid-cols-3 gap-0.5 w-full bg-[#f4f6f3] rounded-full p-0.5">
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
            className={`flex items-center justify-center gap-1 h-8 rounded-full text-[11px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-40 ${
              active ? "bg-white text-[#10231c] shadow-sm" : "text-[#5a6b64] hover:text-[#10231c]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}