import React, { useState } from "react";
import { Brain, FilePlus2, FilePen, BookOpen, ChevronDown, ChevronRight } from "lucide-react";

const KIND = {
  thought: { icon: Brain, label: (it) => `Thought for ${it.seconds || 1}s`, color: "text-white/40" },
  read: { icon: BookOpen, label: (it) => `Read ${it.path}`, color: "text-white/40" },
  wrote: { icon: FilePlus2, label: (it) => `Wrote ${it.path}`, color: "text-[#70C7BA]" },
  edited: { icon: FilePen, label: (it) => `Edited ${it.path}`, color: "text-amber-300/80" },
};

function Thought({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Brain className="w-3 h-3" />
        Thought for {item.seconds || 1}s
      </button>
      {open && item.text && (
        <p className="mt-1 ml-5 pl-2 border-l border-white/10 text-[11px] text-white/45 leading-relaxed whitespace-pre-wrap">
          {item.text}
        </p>
      )}
    </div>
  );
}

export default function ActivityTimeline({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {items.map((it, i) => {
        if (it.kind === "thought") return <Thought key={i} item={it} />;
        const meta = KIND[it.kind] || KIND.read;
        const Icon = meta.icon;
        return (
          <div key={i} className={`flex items-center gap-1.5 text-[11px] ${meta.color}`}>
            <Icon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{meta.label(it)}</span>
          </div>
        );
      })}
    </div>
  );
}