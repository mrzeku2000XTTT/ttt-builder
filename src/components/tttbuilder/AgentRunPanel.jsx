import React from "react";
import { Loader2, Check, X, Bot } from "lucide-react";

const ICON = {
  queued: <div className="w-3 h-3 rounded-full border border-white/20" />,
  running: <Loader2 className="w-3 h-3 animate-spin text-[#70C7BA]" />,
  done: <Check className="w-3 h-3 text-[#70C7BA]" />,
  failed: <X className="w-3 h-3 text-red-400" />,
};

export default function AgentRunPanel({ plan, agents = [] }) {
  if (!agents.length) return null;
  const done = agents.filter(a => a.status === "done").length;

  return (
    <div className="mt-2 rounded-xl border border-white/5 bg-black/20 p-2.5">
      <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold text-white/50">
        <Bot className="w-3 h-3 text-[#70C7BA]" />
        {agents.length} subagent{agents.length > 1 ? "s" : ""} · {done}/{agents.length} complete
      </div>
      {plan && <p className="text-[11px] text-white/35 mb-2 leading-relaxed">{plan}</p>}
      <ul className="space-y-1.5">
        {agents.map((a, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0">{ICON[a.status] || ICON.queued}</span>
            <div className="min-w-0">
              <div className={`text-[11px] font-bold truncate ${a.status === "running" ? "text-white" : "text-white/60"}`}>{a.name}</div>
              <div className="text-[10px] text-white/30 truncate">{(a.files || []).join(", ")}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}