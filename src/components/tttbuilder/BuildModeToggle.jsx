import React from "react";
import { FileCode, Atom } from "lucide-react";

const MODES = [
  { id: "html", label: "HTML", icon: FileCode, hint: "Vanilla HTML/CSS/JS — renders instantly in Preview" },
  { id: "react", label: "React", icon: Atom, hint: "Real npm project (Vite/React/Node) — runs in the Live sandbox" },
];

export default function BuildModeToggle({ value, onChange, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-0.5 w-full bg-[#f4f6f3] rounded-full p-0.5">
      {MODES.map(m => {
        const Icon = m.icon;
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            title={m.hint}
            disabled={disabled}
            onClick={() => onChange(m.id)}
            className={`flex items-center justify-center gap-1.5 h-8 rounded-full text-[11px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-40 ${
              active ? "bg-white text-[#10231c] shadow-sm" : "text-[#5a6b64] hover:text-[#10231c]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {m.label}
          </button>
        );
      })}
    </div>
  );
}