import React, { useState } from "react";
import { Globe, X, Loader2, Wand2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Lets the user paste any website URL → backend scrapes it (screenshot + HTML + design tokens)
// → we feed it to the builder as a clone request.
export default function CloneUrlButton({ onClone, disabled }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    const u = url.trim();
    if (!u) return;
    setBusy(true);
    setErr("");
    try {
      let full = u;
      if (!/^https?:\/\//i.test(full)) full = "https://" + full;
      const res = await base44.functions.invoke("uiClonerScrape", { url: full });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      onClone({
        url: data.url || full,
        title: data.title || "",
        description: data.description || "",
        screenshot: data.screenshot_url || data.og_image || "",
        html: data.html || "",
        colors: data.design_tokens?.colors?.hex || [],
        fonts: data.design_tokens?.fonts || [],
        navLinks: data.nav_links || [],
      });
      setUrl("");
      setOpen(false);
    } catch (e) {
      setErr(e.message || "Scrape failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-blue-500/15 border border-blue-400/40 text-blue-200 text-[11px] font-bold hover:bg-blue-500/25 disabled:opacity-40 transition-colors"
        title="Clone any website by URL"
      >
        <Globe className="w-3 h-3" /> Clone URL
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
          onClick={(e) => e.target === e.currentTarget && !busy && setOpen(false)}
        >
          <div className="bg-[#161b22] border border-white/10 rounded-2xl w-full max-w-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-blue-300" />
              <h3 className="font-bold text-sm text-white">Clone any website</h3>
              <button onClick={() => !busy && setOpen(false)} className="ml-auto text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-white/40 mb-3">
              Paste a URL. TTT Builder scrapes the site (layout, colors, fonts, screenshot) and rebuilds it as a Kaspa-ready app.
            </p>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="https://example.com"
              autoFocus
              className="w-full h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-sm text-white/80 outline-none focus:border-blue-400/50"
            />
            {err && <p className="text-[11px] text-red-400 mt-2">{err}</p>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => !busy && setOpen(false)}
                disabled={busy}
                className="flex-1 h-10 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!url.trim() || busy}
                className="flex-1 h-10 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-500/90 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4" /> Clone & Build</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}