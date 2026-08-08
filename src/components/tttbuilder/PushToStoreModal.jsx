import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Store, Loader2, CheckCircle, X, Image as ImageIcon, Link2, Github, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PushToStoreModal({ open, onClose, liveUrl, defaultName, defaultDesc }) {
  const [appName, setAppName] = useState(defaultName || "");
  const [description, setDescription] = useState(defaultDesc || "");
  const [vercelUrl, setVercelUrl] = useState(liveUrl || "");
  const [githubUrl, setGithubUrl] = useState("");
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [category, setCategory] = useState("Builder");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) {
      setAppName(defaultName || "");
      setDescription(defaultDesc || "");
      setVercelUrl(liveUrl || "");
      setGithubUrl("");
      setIconFile(null);
      setIconPreview(null);
      setCategory("Builder");
      setResult(null);
    }
  }, [open, defaultName, defaultDesc, liveUrl]);

  const handleIconChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setIconPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const isValidUrl = (u) => {
    try { new URL(u); return true; } catch { return false; }
  };

  const publish = async () => {
    if (!appName.trim() || !vercelUrl.trim() || !isValidUrl(vercelUrl.trim())) return;
    setPublishing(true);
    try {
      let iconUrl = "";
      if (iconFile) {
        const iconRes = await base44.integrations.Core.UploadFile({ file: iconFile });
        iconUrl = iconRes.file_url;
      }

      const me = await base44.auth.me().catch(() => null);

      await base44.entities.AppProposal.create({
        app_name: appName.trim(),
        app_link: vercelUrl.trim(),
        github_url: githubUrl.trim() || "",
        icon_url: iconUrl,
        description: description.trim() || "Built with TTT Builder",
        category,
        submitter_email: me?.email || "anonymous",
        submitter_name: me?.username || me?.email?.split("@")[0] || "TTT Builder",
        status: "pending",
        audit_status: "pending",
        audit_verdict: "unknown",
      });

      setResult({ success: true, url: vercelUrl.trim() });
    } catch (err) {
      setResult({ success: false, error: err.message || "Failed to publish" });
    } finally {
      setPublishing(false);
    }
  };

  const canSubmit = appName.trim() && vercelUrl.trim() && isValidUrl(vercelUrl.trim());

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#1a1d1d] border border-white/10 rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-[#5eead4]" />
                <h2 className="font-bold text-white text-base">Push to App Store</h2>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!result ? (
              <div className="space-y-4">
                {/* Vercel URL */}
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Vercel deployment URL *</label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      value={vercelUrl}
                      onChange={(e) => setVercelUrl(e.target.value)}
                      placeholder="https://my-app.vercel.app"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#5eead4]/50"
                    />
                  </div>
                  <p className="text-[10px] text-white/30 mt-1">Paste your live Vercel URL — this gets iframed in the App Store.</p>
                </div>

                {/* GitHub source URL */}
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">GitHub source URL <span className="text-white/25">(recommended for audit)</span></label>
                  <div className="relative">
                    <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/user/repo"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#5eead4]/50"
                    />
                  </div>
                  <p className="text-[10px] text-white/30 mt-1">Open-source code is reviewed by AI judges for malware & phishing before approval.</p>
                </div>

                {/* Icon upload */}
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 hover:border-[#5eead4]/40 flex items-center justify-center overflow-hidden transition-colors">
                      {iconPreview ? (
                        <img src={iconPreview} alt="icon" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-white/30" />
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleIconChange} className="hidden" />
                  </label>
                  <div>
                    <p className="text-xs text-white/50">App icon</p>
                    <p className="text-[10px] text-white/30">PNG or JPG, square recommended</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">App name</label>
                  <input
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="My Kaspa App"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#5eead4]/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does your app do?"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#5eead4]/50 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#5eead4]/50"
                  >
                    {["Builder", "Tools", "Finance", "Games", "AI", "Creative", "Education", "Community", "Social", "Shop", "Security"].map((c) => (
                      <option key={c} value={c} className="bg-[#1a1d1d]">{c}</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl bg-[#5eead4]/8 border border-[#5eead4]/25 px-3 py-2.5 flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#5eead4] flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#5eead4]/90 leading-relaxed">
                    Submitted apps go through an <span className="font-bold">AI audit</span> — subagent judges scan your GitHub source & live URL for malware/phishing before an admin approves. Use <span className="font-semibold">Kaspa wallet auth</span>; Google/social logins won't work in the iframe embed.
                  </p>
                </div>

                <p className="text-[11px] text-white/30">
                  Your app will be submitted for <span className="text-[#5eead4]">Review</span>. You can view it anytime. An admin will verify and approve it to make it visible to all TTT users.
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={onClose}
                    className="flex-1 h-10 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={publish}
                    disabled={publishing || !canSubmit}
                    className="flex-1 h-10 rounded-xl bg-[#5eead4] text-black text-sm font-bold hover:bg-[#5eead4]/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  >
                    {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</> : <><Store className="w-4 h-4" /> Push to Store</>}
                  </button>
                </div>
              </div>
            ) : result.success ? (
              <div className="text-center py-4">
                <CheckCircle className="w-10 h-10 text-[#5eead4] mx-auto mb-3" />
                <p className="font-bold text-white mb-1">Submitted for Review!</p>
                <p className="text-xs text-white/40 mb-4">AI judges will audit your code & URL, then an admin approves. You'll see it in the store once approved.</p>
                <a href={result.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#5eead4] hover:underline mb-4 break-all">
                  <Link2 className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate max-w-[260px]">{result.url}</span>
                </a>
                <button onClick={onClose} className="w-full h-9 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold transition-colors">
                  Close
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-red-400 font-bold mb-2">Publish failed</p>
                <p className="text-xs text-white/40 mb-4">{result.error}</p>
                <button onClick={() => setResult(null)} className="w-full h-9 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold transition-colors">
                  Try again
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}