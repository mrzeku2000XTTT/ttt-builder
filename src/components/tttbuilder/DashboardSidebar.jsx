import React from "react";
import { Home, Code2, Server, Bot, Database, Brain, Settings, Shield, Anchor, ChevronRight, ChevronLeft } from "lucide-react";

const ITEMS = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "code", label: "Code", icon: Code2 },
  { id: "live", label: "Live", icon: Server },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "database", label: "Database", icon: Database },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "security", label: "Security", icon: Shield },
  { id: "anchors", label: "Anchors", icon: Anchor },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function DashboardSidebar({ active, onChange, fileCount = 0 }) {
  return (
    <div className="h-full flex flex-col bg-[#0f1419] border-r border-white/[0.06]">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#70C7BA] to-[#5a9d92] flex items-center justify-center">
            <span className="text-black font-black text-xs">D</span>
          </div>
          <span className="font-semibold text-sm text-white/90 tracking-tight">Dashboard</span>
          {active !== "overview" && (
            <button
              onClick={() => onChange("overview")}
              className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.03]"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-[#70C7BA]" : ""}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === "code" && fileCount > 0 && (
                <span className="text-[10px] text-white/30 font-bold">{fileCount}</span>
              )}
              {isActive && <ChevronRight className="w-3 h-3 text-white/30" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <div className="text-[10px] text-white/30 leading-relaxed">
          Keys generated locally.
          <br />
          Never sent to any server.
        </div>
      </div>
    </div>
  );
}