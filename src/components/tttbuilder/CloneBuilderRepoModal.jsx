import React, { useState, useEffect } from "react";
import { X, Github, Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * CloneBuilderRepoModal — generates a new, standalone, open-source GitHub repo
 * containing just the TTT Builder (copied from the app's source repo) and links
 * the user to it. Backed by the createTttBuilderRepo backend function.
 */
export default function CloneBuilderRepoModal({ open, onClose }) {
  const [sourceRepo, setSourceRepo] = useState(() => {
    try { return localStorage.getItem("ttt_clone_source") || ""; } catch { return ""; }
  });
  const [targetRepo, setTargetRepo] = useState("ttt-builder");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setResult(null); setError(""); } }, [open]);

  if (!open) return null;

  const submit = async () => {
    setError(""); setLoading(true); setResult(null);
    try {
      const res = await base44.functions.invoke("createTttBuilderRepo", {
        sourceRepo: sourceRepo.trim(),
        targetRepo: targetRepo.trim() || "ttt-builder",
      });
      if (res.data?.success) {
        setResult(res.data);
        try { localStorage.setItem("ttt_clone_source", sourceRepo.trim()); } catch {}
      } else {
        setError(res.data?.error || "Failed to generate repo");
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.data?.error || err?.message || "Failed to generate repo";
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
          <h2 className="font-bold text-white text-base">Clone TTT Builder repo</h2>
          <button onClick={onClose} className="ml-auto text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {!result ? (
          <div className="space-y-4">
            <p className="text-[11px] text-white/50 leading-relaxed">
              Generates the canonical open-source TTT Builder repo — the platform code itself, copied from your app's GitHub repo. Anyone can clone it locally and bring their own keys. This is for the TTT Builder platform, not for individual apps you build.
            </p>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Your app's GitHub repo <span className="text-white/30">(owner/repo — where the TTT Builder files live)</span></label>
              <input
                value={sourceRepo}
                onChange={(e) => setSourceRepo(e.target.value)}
                placeholder="your-org/your-app-repo"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">New repo name</label>
              <input
                value={targetRepo}
                onChange={(e) => setTargetRepo(e.target.value)}
                placeholder="ttt-builder"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold transition-colors">Cancel</button>
              <button
                onClick={submit}
                disabled={loading || !sourceRepo.trim()}
                className="flex-1 h-10 rounded-xl bg-[#70C7BA] text-black text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Github className="w-4 h-4" /> Generate repo</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-[#70C7BA] mx-auto mb-3" />
            <p className="font-bold text-white mb-1">Repo generated!</p>
            <p className="text-xs text-white/40 mb-4">
              {result.copiedFiles} builder files + {result.authoredFiles} docs pushed to <code className="text-[#70C7BA]/70">{result.repo}</code>
            </p>
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-[#70C7BA] hover:underline mb-4">
              <ExternalLink className="w-3.5 h-3.5" /> Open {result.repo}
            </a>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-left">
              <div className="text-[10px] text-white/40 mb-1">Clone command</div>
              <code className="text-[11px] text-white/80 break-all">git clone {result.cloneUrl}</code>
            </div>
            <button onClick={onClose} className="mt-5 w-full h-9 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold transition-colors">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}