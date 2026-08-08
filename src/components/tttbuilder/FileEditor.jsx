import React from "react";
import { fileLang } from "./projectFiles";

export default function FileEditor({ file, onChange }) {
  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/25 text-xs">
        Select a file to view its code
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 flex-shrink-0">
        <span className="font-mono text-[11px] text-white/70 truncate">{file.path}</span>
        <span className="text-[9px] uppercase tracking-wide text-white/25">{fileLang(file.path)}</span>
      </div>
      <textarea
        value={file.content}
        onChange={(e) => onChange(file.path, e.target.value)}
        spellCheck={false}
        className="flex-1 w-full bg-[#080c10] text-[11px] font-mono text-green-300/80 leading-relaxed p-4 outline-none resize-none"
      />
    </div>
  );
}