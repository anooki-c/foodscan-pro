/**
 * 轻提示 Toast（单例，非 React 组件）
 * 替代 window.alert，样式对齐整体 UI（毛玻璃 + 主题色）。
 * 用法：toast("已保存"); toast("出错了", "error");
 */

type ToastType = "success" | "error";

let host: HTMLDivElement | null = null;

export function toast(msg: string, type: ToastType = "success") {
  if (typeof window === "undefined") return;

  if (!host) {
    host = document.createElement("div");
    host.style.cssText =
      "position:fixed;top:24px;left:50%;transform:translateX(-50%);" +
      "z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;" +
      "pointer-events:none;width:max-content;max-width:90vw;";
    document.body.appendChild(host);
  }

  const el = document.createElement("div");
  el.style.cssText =
    "display:flex;align-items:center;gap:10px;max-width:100%;" +
    "padding:12px 18px;border-radius:16px;" +
    "background:rgba(255,255,255,0.86);" +
    "-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);" +
    "border:1px solid rgba(255,255,255,0.65);" +
    "box-shadow:0 12px 32px rgba(31,27,46,0.16);" +
    "font:500 13px/20px var(--font-body);color:var(--color-text-primary);" +
    "opacity:0;transform:translateY(-10px) scale(0.98);" +
    "transition:opacity .25s var(--ease-standard),transform .25s var(--ease-standard);";

  const icon = document.createElement("span");
  icon.className = "material-symbols-rounded";
  icon.style.cssText =
    "font-size:18px;flex-shrink:0;" +
    (type === "success" ? "color:var(--ring-natural);" : "color:#E5484D;");
  icon.textContent = type === "success" ? "check_circle" : "error";

  const text = document.createElement("span");
  text.textContent = msg;

  el.append(icon, text);
  host.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateY(0) scale(1)";
  });

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-10px) scale(0.98)";
    setTimeout(() => el.remove(), 280);
  }, 2600);
}
