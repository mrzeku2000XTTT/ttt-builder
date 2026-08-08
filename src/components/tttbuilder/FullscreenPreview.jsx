import React from "react";
import { X } from "lucide-react";

// Fullscreen site preview modal — opens the built site edge-to-edge.
// For real (npm) projects we pass a live `url` (the E2B sandbox) so the
// actually-running app fills the screen. For static projects we fall back
// to `srcDoc` of the bundled HTML.
export default function FullscreenPreview({ html, url, onClose }) {
  if (!html && !url) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 backdrop-blur-xl border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-white/60 flex-shrink-0">Fullscreen Preview</span>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#70C7BA] hover:underline truncate max-w-[50vw]">
              {url}
            </a>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <iframe
        src={url || undefined}
        srcDoc={url ? undefined : html}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
        className="flex-1 w-full border-0 bg-white"
        title="Fullscreen Site Preview"
      />
    </div>
  );
}