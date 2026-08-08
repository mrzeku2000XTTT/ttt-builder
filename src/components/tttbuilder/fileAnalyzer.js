// Analyzes attached files of ANY type and produces content the LLM can use.
// - Images → returned as file_urls (the LLM sees them directly via InvokeLLM)
// - Text files (txt, json, csv, html, js, jsx, ts, tsx, css, md, xml, svg) → fetched and inlined as text
// - PDF / docx / xlsx → extracted via ExtractDataFromUploadedFile
// - Videos → a thumbnail frame is captured via canvas and attached as an image

const TEXT_EXT = /\.(txt|json|csv|html?|js|jsx|ts|tsx|css|scss|md|markdown|xml|svg|yaml|yml|env|sql|py|go|rs|java|c|cpp|h|sh|toml)$/i;
const PDF_DOC_EXT = /\.(pdf|docx?|xlsx|xls|pptx?)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|avi|mkv|m4v)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp)$/i;

export const isImage = (name) => IMAGE_EXT.test(name || "");
export const isVideo = (name) => VIDEO_EXT.test(name || "");
export const isText = (name) => TEXT_EXT.test(name || "");
export const isPdfDoc = (name) => PDF_DOC_EXT.test(name || "");

// Capture a thumbnail frame from a video URL using an offscreen <video> + canvas.
function captureVideoThumbnail(url) {
  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.preload = "metadata";
      video.src = url;
      const cleanup = () => { video.src = ""; };
      video.onloadeddata = () => {
        try {
          video.currentTime = Math.min(1, (video.duration || 2) / 2);
        } catch { resolve(null); }
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 480;
          canvas.height = Math.round(480 * (video.videoHeight / video.videoWidth)) || 270;
          canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          cleanup();
          resolve(dataUrl);
        } catch { cleanup(); resolve(null); }
      };
      video.onerror = () => { cleanup(); resolve(null); };
      // Safety timeout
      setTimeout(() => resolve(null), 6000);
    } catch { resolve(null); }
  });
}

// Upload a data URL (canvas thumbnail) to Base44 storage so InvokeLLM can use it.
async function uploadDataUrl(dataUrl, name) {
  try {
    const { base44 } = await import("@/api/base44Client");
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], name || "video-thumb.jpg", { type: "image/jpeg" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  } catch { return null; }
}

// Main entry: analyze a list of attachments. Returns { fileUrls, note, analyzed }
// `onAnalyzing` is called per-file with {name, status} so the UI can show progress.
export async function analyzeAttachments(attachments, onAnalyzing) {
  const fileUrls = [];
  const textParts = [];
  let analyzed = 0;

  for (const a of attachments) {
    const name = a.name || "file";
    onAnalyzing?.({ name, status: "analyzing" });
    try {
      if (isImage(name)) {
        fileUrls.push(a.url);
        textParts.push(`[Attached image: ${name}] — reproduced faithfully in the build.`);
      } else if (isVideo(name)) {
        const thumb = await captureVideoThumbnail(a.url);
        let thumbUrl = null;
        if (thumb) thumbUrl = await uploadDataUrl(thumb, `${name}-thumb.jpg`);
        if (thumbUrl) {
          fileUrls.push(thumbUrl);
          textParts.push(`[Attached video: ${name}] — a thumbnail frame from the video is attached as an image. Reproduce the visual style / content shown in the frame.`);
        } else {
          textParts.push(`[Attached video: ${name}] — could not capture a frame. Treat as a video the user wants embedded or referenced.`);
        }
      } else if (isText(name)) {
        const res = await fetch(a.url);
        const text = await res.text();
        const trimmed = text.slice(0, 8000);
        textParts.push(`[Attached file: ${name}]\n\`\`\`\n${trimmed}\n\`\`\``);
      } else if (isPdfDoc(name)) {
        const { base44 } = await import("@/api/base44Client");
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: a.url,
          json_schema: { type: "object", properties: { content: { type: "string" } } },
        });
        const content = extracted?.output?.content || JSON.stringify(extracted?.output || "").slice(0, 8000);
        textParts.push(`[Attached document: ${name}]\n${String(content).slice(0, 8000)}`);
      } else {
        textParts.push(`[Attached file: ${name}] — (binary, type not directly readable; the user referenced it for context).`);
      }
      analyzed++;
      onAnalyzing?.({ name, status: "done" });
    } catch (err) {
      onAnalyzing?.({ name, status: "error", error: err?.message });
      textParts.push(`[Attached file: ${name}] — analysis failed: ${err?.message || "unknown error"}.`);
    }
  }

  const note = textParts.length
    ? `\nATTACHED FILE ANALYSIS — the user attached ${attachments.length} file(s). Their analyzed content is below. Use it faithfully in the build (reproduce layouts, data, structure, text). Do NOT say you couldn't open them.\n\n${textParts.join("\n\n")}\n`
    : "";

  return { fileUrls, note, analyzed };
}