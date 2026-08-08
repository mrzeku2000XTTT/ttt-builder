import React, { useState } from "react";
import { Shield, ShieldAlert, ShieldCheck, Loader2, Wrench, RefreshCw, Lock, Eye, Code } from "lucide-react";

// Client-side vulnerability scanner for generated project files.
// Detects common issues: XSS sinks, hardcoded secrets, eval, innerHTML, etc.
// "Fix Issues" pushes a fix prompt to the builder agent.

const PATTERNS = [
  { id: "innerHTML", re: /\.innerHTML\s*=/, sev: "high", label: "innerHTML assignment", fix: "Use textContent or React's setHTML safely; avoid injecting unsanitized strings." },
  { id: "dangerouslySetInnerHTML", re: /dangerouslySetInnerHTML/, sev: "high", label: "dangerouslySetInnerHTML", fix: "Avoid dangerouslySetInnerHTML; sanitize any HTML before rendering." },
  { id: "eval", re: /\beval\s*\(/, sev: "critical", label: "eval() usage", fix: "Remove eval(); use JSON.parse or a safe parser instead." },
  { id: "document_write", re: /document\.write\s*\(/, sev: "high", label: "document.write()", fix: "Remove document.write(); use DOM APIs or React rendering." },
  { id: "hardcoded_secret", re: /(sk-|api[_-]?key|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}/i, sev: "critical", label: "Hardcoded secret/API key", fix: "Move secrets to env vars or server-side; never hardcode in client code." },
  { id: "http_url", re: /http:\/\/(?!localhost|127\.0\.0\.1)/, sev: "medium", label: "Insecure http:// URL", fix: "Use https:// for all external resources." },
  { id: "console_log", re: /console\.log\s*\(/, sev: "low", label: "console.log left in code", fix: "Remove debug console.log statements." },
  { id: "inline_onclick", re: /\bonclick\s*=/, sev: "medium", label: "Inline event handler", fix: "Use addEventListener or React onClick props instead of inline handlers." },
  { id: "localStorage_secret", re: /localStorage\.setItem\s*\(\s*["']?(secret|password|key|token)/i, sev: "high", label: "Secret in localStorage", fix: "Never store secrets in localStorage; use server-side storage." },
];

function scanFiles(files) {
  const issues = [];
  for (const f of files) {
    if (!f.content) continue;
    for (const p of PATTERNS) {
      const m = f.content.match(p.re);
      if (m) {
        const line = f.content.slice(0, m.index).split("\n").length;
        issues.push({
          id: `${f.path}:${p.id}:${m.index}`,
          file: f.path,
          line,
          severity: p.sev,
          label: p.label,
          fix: p.fix,
          snippet: f.content.split("\n")[line - 1]?.trim().slice(0, 120) || "",
        });
      }
    }
  }
  return issues;
}

const SEV_STYLE = {
  critical: { color: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/30", icon: ShieldAlert },
  high: { color: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: ShieldAlert },
  medium: { color: "#eab308", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: Eye },
  low: { color: "#70C7BA", bg: "bg-[#70C7BA]/10", border: "border-[#70C7BA]/30", icon: Code },
};

export default function SecurityPanel({ files, onFix, loading }) {
  const [issues, setIssues] = useState(null);
  const [scanning, setScanning] = useState(false);

  const runScan = () => {
    setScanning(true);
    // small delay so the UI shows the scan state
    setTimeout(() => {
      setIssues(scanFiles(files));
      setScanning(false);
    }, 400);
  };

  const fixAll = () => {
    if (!issues || !issues.length) return;
    const grouped = {};
    issues.forEach(i => { grouped[i.label] = grouped[i.label] || []; grouped[i.label].push(`${i.file}:${i.line}`); });
    const prompt = `Fix these security vulnerabilities found in the project. For each, apply the recommended fix WITHOUT changing any unrelated code:\n\n${
      Object.entries(grouped).map(([label, locs]) => {
        const p = PATTERNS.find(x => x.label === label);
        return `• ${label} (${locs.length}× at ${locs.slice(0, 5).join(", ")}${locs.length > 5 ? "…" : ""}) — ${p?.fix || "fix it"}`;
      }).join("\n")
    }\n\nReturn only the fixed files with full content.`;
    onFix(prompt);
  };

  const counts = issues ? {
    critical: issues.filter(i => i.severity === "critical").length,
    high: issues.filter(i => i.severity === "high").length,
    medium: issues.filter(i => i.severity === "medium").length,
    low: issues.filter(i => i.severity === "low").length,
  } : null;

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#70C7BA]" /> Security
          </h2>
          <p className="text-xs text-white/40">Scan your project for vulnerabilities and push fixes to the agent.</p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning || !files.length || loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#70C7BA]/15 border border-[#70C7BA]/40 text-[#70C7BA] hover:bg-[#70C7BA]/25 text-xs font-bold disabled:opacity-40 transition-colors flex-shrink-0"
        >
          {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {issues ? "Re-scan" : "Scan now"}
        </button>
      </div>

      {files.length === 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-center">
          <Shield className="w-8 h-8 mx-auto mb-2 text-white/20" />
          <p className="text-xs text-white/40">Build a project first, then scan it for vulnerabilities.</p>
        </div>
      )}

      {counts && (
        <div className="grid grid-cols-4 gap-2">
          {["critical", "high", "medium", "low"].map(s => {
            const st = SEV_STYLE[s];
            return (
              <div key={s} className={`${st.bg} border ${st.border} rounded-xl p-3 text-center`}>
                <div className="text-xl font-black" style={{ color: st.color }}>{counts[s]}</div>
                <div className="text-[10px] text-white/50 capitalize font-medium">{s}</div>
              </div>
            );
          })}
        </div>
      )}

      {issues && issues.length === 0 && (
        <div className="bg-[#70C7BA]/10 border border-[#70C7BA]/20 rounded-xl p-6 text-center">
          <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-[#70C7BA]" />
          <p className="text-sm font-bold text-white">No issues found</p>
          <p className="text-xs text-white/50 mt-1">Your project looks clean. Re-scan after changes.</p>
        </div>
      )}

      {issues && issues.length > 0 && (
        <>
          <button
            onClick={fixAll}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#70C7BA] text-black text-sm font-bold hover:bg-[#70C7BA]/90 disabled:opacity-40 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
            {loading ? "Agent is fixing…" : `Fix ${issues.length} issue${issues.length > 1 ? "s" : ""} with Agent`}
          </button>
          <div className="space-y-2">
            {issues.map(i => {
              const st = SEV_STYLE[i.severity];
              const Icon = st.icon;
              return (
                <div key={i.id} className={`${st.bg} border ${st.border} rounded-lg p-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: st.color }} />
                    <span className="text-xs font-bold text-white">{i.label}</span>
                    <span className="ml-auto text-[10px] text-white/40 font-mono">{i.file}:{i.line}</span>
                  </div>
                  <code className="block text-[10px] text-white/50 font-mono bg-black/30 rounded px-2 py-1 mb-1.5 truncate">{i.snippet}</code>
                  <p className="text-[11px] text-white/60">→ {i.fix}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-3.5 h-3.5 text-[#70C7BA]" />
          <span className="text-xs text-white/50 font-medium">Data privacy</span>
        </div>
        <p className="text-[11px] text-white/40 leading-relaxed">
          All project files, memory, and database data are stored locally in your browser and on your account only.
          Nothing is shared with other users. The builder only reads your own project files when generating.
        </p>
      </div>
    </div>
  );
}