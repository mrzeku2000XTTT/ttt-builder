import React, { useRef, useState } from "react";
import { Paperclip, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

const isImage = (name) => /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);

export default function AttachButton({ attachments, onChange, disabled }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setBusy(true);
    const added = [];
    for (const file of picked) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      added.push({ name: file.name, url: file_url, image: isImage(file.name) });
    }
    onChange([...attachments, ...added]);
    setBusy(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
        title="Attach images or files (screenshots, designs, data)"
        className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-[#70C7BA]/15 border border-[#70C7BA]/40 text-[#70C7BA] hover:bg-[#70C7BA]/25 text-[11px] font-bold disabled:opacity-40 transition-colors"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
        Attach file
      </button>
      <input ref={inputRef} type="file" multiple onChange={pick} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.json,.csv,.html,.htm,.js,.jsx,.ts,.tsx,.css,.scss,.md,.markdown,.xml,.svg,.yaml,.yml,.sql,.py,.go,.rs,.java,.c,.cpp,.h,.sh,.toml" />

      {attachments.map((a, i) => (
        <span key={a.url + i} className="flex items-center gap-1.5 h-7 pl-1.5 pr-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/60">
          {a.image && <img src={a.url} alt="" className="w-4 h-4 rounded object-cover" />}
          <span className="max-w-[90px] truncate">{a.name}</span>
          <button
            type="button"
            onClick={() => onChange(attachments.filter((_, j) => j !== i))}
            className="p-0.5 text-white/40 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </>
  );
}