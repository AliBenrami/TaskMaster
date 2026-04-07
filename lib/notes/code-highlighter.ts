import hljs from "highlight.js/lib/common";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function highlightCode(code: string) {
  if (code.trim().length === 0) {
    return escapeHtml(code);
  }

  return hljs.highlightAuto(code).value;
}
