"use client";

import { useRef, useState } from "react";
import AppBar from "@/components/AppBar";
import Button from "@/components/Button";
import { fetchOcr } from "@/lib/services/api";
import { useAnalysisStore } from "@/store/analysis";
import styles from "./page.module.css";

type Status = "idle" | "ready" | "loading";

/** 相对坐标选区（0~1，相对预览图显示区域；裁剪时按原图像素换算） */
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 拖拽交互状态机 */
type DragState =
  | { mode: "draw"; startX: number; startY: number }
  | { mode: "move"; startX: number; startY: number; origRect: Rect }
  | { mode: "resize"; handle: string; startX: number; startY: number; origRect: Rect };

const MIN_SIZE = 0.03; // 选区最小宽高（相对比例），防止误触
const HANDLE_TOL = 0.055; // 控制点命中容差（相对比例）

/** 读取文件 → 原图 Image（用于预览与裁剪；不提前压缩，框选后按选区裁剪更清晰） */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片解析失败，请换一张图片"));
    };
    img.src = url;
  });
}

/** 按选区裁剪原图 → 压缩到最长边 1600 → base64（无选区时整图） */
async function cropAndCompress(
  img: HTMLImageElement,
  rect: Rect | null
): Promise<{ data: string; mime: string }> {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const sx = rect ? Math.round(rect.x * srcW) : 0;
  const sy = rect ? Math.round(rect.y * srcH) : 0;
  const sw = rect ? Math.max(1, Math.round(rect.w * srcW)) : srcW;
  const sh = rect ? Math.max(1, Math.round(rect.h * srcH)) : srcH;

  // 裁剪
  const crop = document.createElement("canvas");
  crop.width = sw;
  crop.height = sh;
  const ctx = crop.getContext("2d");
  if (!ctx) throw new Error("浏览器不支持图片处理");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  // 压缩（选区通常较小，长边一般不会超限）
  const MAX = 1600;
  const scale = Math.min(1, MAX / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const cctx = canvas.getContext("2d");
  if (!cctx) throw new Error("浏览器不支持图片压缩");
  cctx.drawImage(crop, 0, 0, w, h);
  const mime = "image/jpeg";
  const data = canvas.toDataURL(mime, 0.85).split(",")[1] ?? "";
  if (!data) throw new Error("图片压缩失败");
  return { data, mime };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export default function PhotoScanPage() {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [previewUrl, setPreviewUrl] = useState("");
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  /** 把指针事件坐标换算为相对预览区域的 0~1 坐标 */
  const toRel = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) return { x: 0, y: 0 };
    return {
      x: clamp((e.clientX - r.left) / r.width, 0, 1),
      y: clamp((e.clientY - r.top) / r.height, 0, 1),
    };
  };

  /** 命中 8 个控制点（nw/ne/sw/se/n/s/e/w） */
  const hitHandle = (p: { x: number; y: number }, r: Rect): string | null => {
    const hs: Array<[string, number, number]> = [
      ["nw", r.x, r.y],
      ["ne", r.x + r.w, r.y],
      ["sw", r.x, r.y + r.h],
      ["se", r.x + r.w, r.y + r.h],
      ["n", r.x + r.w / 2, r.y],
      ["s", r.x + r.w / 2, r.y + r.h],
      ["e", r.x + r.w, r.y + r.h / 2],
      ["w", r.x, r.y + r.h / 2],
    ];
    for (const [k, hx, hy] of hs) {
      if (Math.abs(p.x - hx) <= HANDLE_TOL && Math.abs(p.y - hy) <= HANDLE_TOL) return k;
    }
    return null;
  };

  /** 按 handle 方向调整选区大小 */
  const applyResize = (orig: Rect, handle: string, dx: number, dy: number): Rect => {
    let { x, y, w, h } = orig;
    if (handle.includes("e")) w = clamp(orig.w + dx, MIN_SIZE, 1 - orig.x);
    if (handle.includes("w")) {
      const nw = clamp(orig.w - dx, MIN_SIZE, orig.x + orig.w);
      x = orig.x + (orig.w - nw);
      w = nw;
    }
    if (handle.includes("s")) h = clamp(orig.h + dy, MIN_SIZE, 1 - orig.y);
    if (handle.includes("n")) {
      const nh = clamp(orig.h - dy, MIN_SIZE, orig.y + orig.h);
      y = orig.y + (orig.h - nh);
      h = nh;
    }
    return { x, y, w, h };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (status === "loading") return;
    const p = toRel(e);
    // 已有选区：优先命中控制点 → 调整；其次在框内 → 移动；否则清空重新画框
    if (rect) {
      const handle = hitHandle(p, rect);
      if (handle) {
        setDrag({ mode: "resize", handle, startX: p.x, startY: p.y, origRect: rect });
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      if (p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h) {
        setDrag({ mode: "move", startX: p.x, startY: p.y, origRect: rect });
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      setRect(null);
    }
    setDrag({ mode: "draw", startX: p.x, startY: p.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const p = toRel(e);
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;

    if (drag.mode === "draw") {
      const x = Math.min(drag.startX, p.x);
      const y = Math.min(drag.startY, p.y);
      setRect({ x, y, w: Math.abs(dx), h: Math.abs(dy) });
    } else if (drag.mode === "move") {
      const r = drag.origRect;
      setRect({
        x: clamp(r.x + dx, 0, 1 - r.w),
        y: clamp(r.y + dy, 0, 1 - r.h),
        w: r.w,
        h: r.h,
      });
    } else {
      setRect(applyResize(drag.origRect, drag.handle, dx, dy));
    }
  };

  const onPointerUp = () => {
    // 画框太小视为误触，清除选区（回到整图识别）
    setDrag((d) => {
      if (d?.mode === "draw") {
        setRect((r) => (r && (r.w < MIN_SIZE || r.h < MIN_SIZE) ? null : r));
      }
      return null;
    });
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError("请选择 JPG / PNG / WEBP 格式的图片");
      return;
    }
    setError("");
    try {
      const img = await loadImage(file);
      setSourceImg(img);
      setPreviewUrl(URL.createObjectURL(file));
      setRect(null);
      setDrag(null);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "图片处理失败");
    }
  };

  const startOcr = async () => {
    if (!sourceImg) return;
    setStatus("loading");
    setError("");
    try {
      const { data, mime } = await cropAndCompress(sourceImg, rect);
      const res = await fetchOcr(data, mime);
      if (!res.ok || !res.ingredients?.length) {
        setStatus("ready");
        let hint = "";
        if (res.code === "OCR_NOT_CONFIGURED") {
          hint = "未配置 OCR 服务：请到后台「OCR 配置」页添加服务后重试，或改用下方手动输入。";
        } else if (res.code === "OCR_EMPTY_RESULT") {
          hint = "未识别到文字：可能是框选区域不含文字，或图片不够清晰。可重新圈选后重试。";
        } else {
          hint = res.error ?? "识别失败，请换一张更清晰的配料表图片重试。";
        }
        setError(hint);
        return;
      }
      // 识别成功 → 写入确认页草稿，进入人工核对
      useAnalysisStore.getState().setDraftIngredients(res.ingredients);
      window.location.href = "/confirm?source=ocr";
    } catch (e) {
      setStatus("ready");
      setError(e instanceof Error ? e.message : "图片处理失败");
    }
  };

  const reset = () => {
    setPreviewUrl("");
    setSourceImg(null);
    setRect(null);
    setDrag(null);
    setStatus("idle");
    setError("");
  };

  return (
    <div className={styles.page}>
      <AppBar
        showBack
        onBack={() => (window.location.href = "/scan")}
        title="拍摄识别"
      />

      <main className={styles.scroll}>
        <div className={styles.card}>
          {status === "idle" && (
            <>
              <div className={styles.heroIcon}>
                <span className="material-symbols-rounded">photo_camera</span>
              </div>
              <h2 className={styles.title}>拍摄配料表</h2>
              <p className={styles.subtitle}>
                手机可直接调起相机拍摄包装上的配料表，桌面端支持选择或拖入图片。
              </p>

              <div className={styles.pickButtons}>
                <button
                  className={styles.pickBtn}
                  onClick={() => cameraRef.current?.click()}
                >
                  <span className="material-symbols-rounded">photo_camera</span>
                  拍照识别
                </button>
                <button
                  className={styles.pickBtn}
                  onClick={() => galleryRef.current?.click()}
                >
                  <span className="material-symbols-rounded">photo_library</span>
                  相册选择
                </button>
              </div>

              <div
                className={`${styles.dropZone} ${dragOver ? styles.dropActive : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  void handleFile(e.dataTransfer.files?.[0]);
                }}
              >
                <span className="material-symbols-rounded">image</span>
                或将图片拖到这里
              </div>
            </>
          )}

          {status !== "idle" && sourceImg && (
            <div className={styles.previewWrap}>
              {/* 框选舞台：img 撑满宽度、高度自适应，保证相对坐标与像素线性对应 */}
              <div
                ref={stageRef}
                className={styles.cropStage}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="待识别配料表" className={styles.cropImg} draggable={false} />
                {rect && (
                  <>
                    {/* 选区边框（box-shadow 大范围压暗外部）+ 8 个控制点 */}
                    <div className={styles.cropBox} style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }}>
                      {["nw", "ne", "sw", "se", "n", "s", "e", "w"].map((h) => (
                        <span key={h} className={`${styles.handle} ${styles[`handle_${h}`]}`} />
                      ))}
                    </div>
                  </>
                )}
                {!rect && (
                  <div className={styles.cropHint}>
                    <span className="material-symbols-rounded">crop_free</span>
                    拖拽框选配料表区域，减少无用信息
                  </div>
                )}
              </div>

              {rect && (
                <div className={styles.cropToolbar}>
                  <button className={styles.cropToolBtn} onClick={() => setRect(null)}>
                    <span className="material-symbols-rounded">backspace</span>
                    清除选区
                  </button>
                </div>
              )}

              <div className={styles.previewActions}>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={reset}
                  disabled={status === "loading"}
                >
                  重新选择
                </Button>
                <Button
                  fullWidth
                  size="md"
                  onClick={startOcr}
                  disabled={status === "loading"}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                    {status === "loading" ? "progress_activity" : "document_scanner"}
                  </span>
                  {status === "loading"
                    ? "识别中…"
                    : rect
                      ? "识别选中区域"
                      : "开始识别（整图）"}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className={styles.errorBox}>
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                error
              </span>
              <div>
                <p>{error}</p>
                <button
                  className={styles.linkBtn}
                  onClick={() => (window.location.href = "/confirm?source=manual")}
                >
                  改为手动输入配料 →
                </button>
              </div>
            </div>
          )}

          <p className={styles.note}>
            图片仅用于本次识别，识别结果需在确认页人工核对后方可作为最终分析依据。框选后可只识别选中区域，降低无关文字干扰。
          </p>
        </div>

        {/* 隐藏的文件输入：capture 触发移动端相机 */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </main>
    </div>
  );
}
