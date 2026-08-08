import React, { useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, X, Maximize2 } from "lucide-react";

const isImage = (name) => /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);

// Wraps the chat input area with drag-drop + paste support for images/files.
// Also renders a fullscreen lightbox when an image attachment is clicked.
export default function ChatDropZone({ attachments, onChange, disabled, children }) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const dragDepth = useRef(0);

  const addFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(true);
    try {
      const added = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        added.push({ name: file.name || "pasted-image", url: file_url, image: isImage(file.name || "image.png") });
      }
      onChange([...attachments, ...added]);
    } catch (e) {
      console.error("upload failed", e);
    } finally {
      setBusy(false);
    }
  }, [attachments, onChange]);

  const onDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    if (disabled) return;
    addFiles(e.dataTransfer.files);
  };

  const onDragEnter = (e) => {
    e.preventDefault();
    if (disabled) return;
    dragDepth.current++;
    setDragOver(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    dragDepth.current--;
    if (dragDepth.current <= 0) { setDragOver(false); dragDepth.current = 0; }
  };

  const onPaste = (e) => {
    if (disabled) return;
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(it => it.kind === "file");
    if (!imageItems.length) return;
    e.preventDefault();
    const files = imageItems.map(it => it.getAsFile()).filter(Boolean);
    if (files.length) addFiles(files);
  };

  return (
    <>
      <div
        onDrop={onDrop}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onPaste={onPaste}
        className={`relative transition-colors ${dragOver ? "ring-2 ring-[#70C7BA]/60 bg-[#70C7BA]/5 rounded-xl" : ""}`}
      >
        {dragOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0d1117]/80 backdrop-blur-sm rounded-xl pointer-events-none">
            <div className="text-center">
              <Maximize2 className="w-6 h-6 mx-auto mb-1 text-[#70C7BA]" />
              <p className="text-xs font-bold text-[#70C7BA]">Drop files to attach</p>
            </div>
          </div>
        )}
        {busy && (
          <div className="absolute top-1 right-2 z-10 flex items-center gap-1 text-[10px] text-[#70C7BA]">
            <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
          </div>
        )}
        {children}

        {/* Attachment chips with fullscreen preview for images */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 px-1">
            {attachments.map((a, i) => (
              <span key={a.url + i} className="relative group flex items-center gap-1.5 h-8 pl-1 pr-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/60">
                {a.image ? (
                  <button
                    type="button"
                    onClick={() => setLightbox(a.url)}
                    className="relative w-6 h-6 rounded overflow-hidden flex-shrink-0"
                    title="Click to view fullscreen"
                  >
                    <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                    <Maximize2 className="absolute bottom-0 right-0 w-2.5 h-2.5 text-white/80 bg-black/50 rounded-sm p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ) : (
                  <span className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-[8px] flex-shrink-0">📄</span>
                )}
                <span className="max-w-[80px] truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => onChange(attachments.filter((_, j) => j !== i))}
                  className="p-0.5 text-white/40 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen image lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightbox}
            alt="Full preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}