import React, { useState } from "react";
import { ChevronRight, Brain, FolderOpen } from "lucide-react";
import AgentRunPanel from "./AgentRunPanel";
import ActivityTimeline from "./ActivityTimeline";

function Collapsible({ icon: Icon, label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] font-bold text-white/40 hover:text-white/80 transition-colors"
      >
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`} />
        <Icon className="w-3 h-3" />
        {label}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const thinking = message.thinking || [];
  const files = message.files || [];

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap bg-[#70C7BA]/20 text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] w-full rounded-2xl px-4 py-3 text-sm bg-white/[0.04] border border-white/5 text-white/80">
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

        {message.activity?.length > 0 && <ActivityTimeline items={message.activity} />}

        {message.agents?.length > 0 && <AgentRunPanel plan={message.plan} agents={message.agents} />}

        {thinking.length > 0 && (
          <Collapsible icon={Brain} label={`Thoughts (${thinking.length})`}>
            <ol className="space-y-1.5">
              {thinking.map((t, i) => (
                <li key={i} className="flex gap-2 text-[11px] text-white/45 leading-relaxed">
                  <span className="text-[#70C7BA]/60 font-bold">{i + 1}.</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </Collapsible>
        )}

        {files.length > 0 && (
          <Collapsible icon={FolderOpen} label={`${files.length} file${files.length > 1 ? "s" : ""} written`}>
            <ul className="space-y-1">
              {files.map(f => (
                <li key={f} className="text-[11px] font-mono text-white/40 truncate">{f}</li>
              ))}
            </ul>
          </Collapsible>
        )}
      </div>
    </div>
  );
}