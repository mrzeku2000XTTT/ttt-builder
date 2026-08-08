// Real AI images inside generated apps.
// Agents write a marker like  src="TTT_IMAGE[a neon kaspa dragon, dark background]"
// and we replace every marker with a real generated image URL after the build.
import { base44 } from "@/api/base44Client";

export const IMAGE_RULE = `

IMAGES — YOU CAN GENERATE REAL ARTWORK:
- Whenever the app needs a hero image, logo, avatar, product shot, illustration, texture or background photo, write the marker TTT_IMAGE[<detailed prompt>] exactly where the URL goes. Examples:
  <img src="TTT_IMAGE[a glowing teal kaspa crystal floating over a dark grid, 3d render, cinematic]" alt="Hero" />
  style="background-image:url('TTT_IMAGE[abstract dark teal mesh gradient, subtle noise]')"
- The marker is replaced with a real generated image URL after the build, so it works in plain HTML, CSS and JSX.
- Prompts must be specific (subject, style, lighting, mood, colours). Reuse the SAME marker text when you want the SAME image twice.
- Budget: at most 6 image markers per build. Never use placeholder services (placehold.co, picsum, via.placeholder) and never invent an image URL.`;

const MARKER = /TTT_IMAGE\[([^\]]{3,400})\]/g;

/** Replaces every TTT_IMAGE[...] marker across all files with a real generated image. */
export async function resolveImages(files, onProgress) {
  const prompts = [];
  files.forEach(f => {
    [...String(f.content).matchAll(MARKER)].forEach(m => {
      if (!prompts.includes(m[1])) prompts.push(m[1]);
    });
  });
  if (!prompts.length) return files;

  const urls = {};
  for (const p of prompts.slice(0, 6)) {
    onProgress?.({ kind: "image", path: p.slice(0, 60) });
    try {
      const res = await base44.integrations.Core.GenerateImage({ prompt: p });
      if (res?.url) urls[p] = res.url;
    } catch {
      /* keep the marker out of the UI even if generation fails */
    }
  }

  return files.map(f => ({
    ...f,
    content: String(f.content).replace(MARKER, (_, p) => urls[p] || ""),
  }));
}