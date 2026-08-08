import React, { useState, useEffect } from "react";
import { X, Github, Loader2, CheckCircle, ExternalLink, RefreshCw, Copy, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

const DEFAULT_REPO_URL = "https://github.com/mrzeku2000XTTT/ttt-builder";

/**
 * CloneBuilderRepoModal — shows the public canonical TTT Builder repo link
 * (so anyone can view/clone it) and lets an admin SYNC the latest builder code
 * into that repo with one click. Backed by the createTttBuilderRepo backend
 * function (now a one-commit sync, update-in-place).
 */
export default function CloneBuilderRepoModal({ open, onClose }) {
  const [repoUrl, setRepoUrl] = useState(() => {
    try { return localStorage.getItem("ttt_builder_repo_url") || DEFAULT_REPO_URL; } catch { return DEFAULT_REPO_URL; }
  });
  const [sourceRepo, setSourceRepo] = useState(() => {
    try { return localStorage.getItem("ttt_clone_source") || ""; } catch { return ""; }
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!open) return;
    setResult(null); setError(""); setCopied(false);
    base44.auth.me().then(u => setIsAdmin(u?.role === "admin")).catch(() => setIsAdmin(false));
  }, [open]);

  if (!open) return null;

  const cloneCmd = `git clone ${repoUrl.replace(/\/$/, "")}.git`;

  const copyClone = () => {
    try { navigator.clipboard.writeText(cloneCmd); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  const sync = async () => {
    setError(""); setLoading(true); setResult(null);
    try {
      const res = await base44.functions.invoke("createTttBuilderRepo", {
        sourceRepo: sourceRepo.trim(),
        targetRepo: "ttt-builder",
      });
      if (res.data?.success) {
        setResult(res.data);
        if (res.data.url) {
          setRepoUrl(res.data.url);
          try { localStorage.setItem("ttt_builder_repo_url", res.data.url); } catch {}
        }
        try { localStorage.setItem("ttt_clone_source", sourceRepo.trim()); } catch {}
      } else {
        setError(res.data?.error || "Sync failed");
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.data?.error || err?.message || "Sync failed";
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center gap-2 mb-5">
          <Github className="w-5 h-5 text-[#70C7BA]" />
          <h2 className="font-bold text-white text-base">TTT Builder repo</h2>
          <button onClick={onClose} className="ml-auto text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {/* Public clone link — always visible */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Public repo — clone to run locally</div>
          <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#70C7BA] hover:underline mb-3">
            <ExternalLink className="w-3.5 h-3.5" /> {repoUrl.replace("https://github.com/", "")}
          </a>
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2">
            <code className="text-[11px] text-white/70 break-all flex-1">{cloneCmd}</code>
            <button onClick={copyClone} className="text-white/40 hover:text-white flex-shrink-0" title="Copy clone command">
              {copied ? <Check className="w-3.5 h-3.5 text-[#70C7BA]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-white/30 mt-2 leading-relaxed">
            Clone it, run <code className="text-white/50">npm install</code> then <code className="text-white/50">npm run dev</code>, add your own open model — full step-by-step in the repo README.
          </p>
        </div>

        {/* Sync section (admin only) */}
        {isAdmin && !result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync latest builder code to the canonical repo</span>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Your app's GitHub repo <span className="text-white/30">(owner/repo — leave blank to auto-detect)</span></label>
              <input
                value={sourceRepo}
                onChange={(e) => setSourceRepo(e.target.value)}
                placeholder="auto-detect from your repos"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold transition-colors">Cancel</button>
              <button
                onClick={sync}
                disabled={loading}
                className="flex-1 h-10 rounded-xl bg-[#70C7BA] text-black text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing…</> : <><RefreshCw className="w-4 h-4" /> Sync latest</>}
              </button>
            </div>
          </div>
        )}
        {result && (
          <div className="text-center py-3">
            <CheckCircle className="w-10 h-10 text-[#70C7BA] mx-auto mb-3" />
            <p className="font-bold text-white mb-1">Synced!</p>
            <p className="text-xs text-white/40 mb-3">
              {result.totalFiles} files pushed to <code className="text-[#70C7BA]/70">{result.repo}</code>
            </p>
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-[#70C7BA] hover:underline mb-3">
              <ExternalLink className="w-3.5 h-3.5" /> Open repo
            </a>
            <button onClick={onClose} className="block w-full mt-3 h-9 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold transition-colors">Close</button>
          </div>
        )}
        {!isAdmin && (
          <p className="text-center text-[11px] text-white/30 leading-relaxed">
            This repo is maintained by the TTT platform owner. Clone it to run the builder locally with your own keys.
          </p>
        )}
      </div>
    </div>
  );
}