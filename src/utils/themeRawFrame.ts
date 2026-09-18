export const THEME_RAW_MESSAGE_TYPE = "lite-theme-raw";
export const THEME_RAW_SANDBOX = "allow-scripts";

export function themeRawLoaderSrcDoc(parentOrigin: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:transparent}</style></head><body><script>(function(){
  var parentOrigin = ${JSON.stringify(parentOrigin)};
  var allowedType = ${JSON.stringify(THEME_RAW_MESSAGE_TYPE)};
  window.addEventListener("message", function(event) {
    if (event.source !== window.parent) return;
    if (event.origin !== parentOrigin) return;
    var data = event.data;
    if (!data || data.type !== allowedType || typeof data.html !== "string") return;
    var frame = document.createElement("iframe");
    frame.setAttribute("sandbox", ${JSON.stringify(THEME_RAW_SANDBOX)});
    frame.setAttribute("title", "Theme raw content");
    frame.style.cssText = "position:fixed;inset:0;width:100%;height:100%;border:0;";
    frame.srcdoc = data.html;
    document.body.replaceChildren(frame);
  });
})();</script></body></html>`;
}
