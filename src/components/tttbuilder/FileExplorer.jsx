import React, { useState } from "react";
import { FileCode2, FileJson, FileText, Palette, Plus, Trash2, Folder } from "lucide-react";
import { norm, sortFiles } from "./projectFiles";

const iconFor = (path) => {
  const ext = path.split(".").pop().toLowerCase();
  if (ext === "css") return Palette;
  if (ext === "json") return FileJson;
  if (ext === "js" || ext === "mjs") return FileCode2;
  if (ext === "html") return FileText;
  return FileText;
};

export default function FileExplorer({ files, activePath, onSelect, onCreate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [newPath, setNewPath] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const p = norm(newPath);
    if (!p) return;
    onCreate(p);
    setNewPath("");
    setAdding(false);
  };

  return (
    <div className="w-40 sm:w-52 flex-shrink-0 border-r border-white/5 bg-[#0d1117] flex flex-col min-h-0">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5">
        <Folder className="w-3.5 h-3.5 text-[#70C7BA]" />
        <span className="text-[11px] font-bold text-white/70">Files</span>
        <button
          onClick={() => setAdding((v) => !v)}
          className="ml-auto w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5"
          title="New file"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="px-2 py-2 border-b border-white/5">
          <input
            autoFocus
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="styles/app.css"
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white placeholder:text-white/25 outline-none focus:border-[#70C7BA]/50"
          />
        </form>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {sortFiles(files).map((f) => {
          const Icon = iconFor(f.path);
          const active = f.path === activePath;
          return (
            <div
              key={f.path}
              onClick={() => onSelect(f.path)}
              className={`group flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer text-[11px] ${
                active ? "bg-[#70C7BA]/15 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0 text-[#70C7BA]/70" />
              <span className="truncate font-mono">{f.path}</span>
              {f.path !== "index.html" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(f.path); }}
                  className="ml-auto opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400"
                  title="Delete file"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        {files.length === 0 && (
          <p className="px-3 py-4 text-[10px] text-white/25 leading-relaxed">
            No files yet. Describe your app and the agent will create them.
          </p>
        )}
      </div>
    </div>
  );
}