"use client";

import { useRef, useState } from "react";
import AppBar from "@/components/AppBar";
import Button from "@/components/Button";
import { fetchOcr } from "@/lib/services/api";
import { useAnalysisStore } from "@/store/analysis";
import styles from "./page.module.css";

type Status = "idle" | "ready" | "loading";

/** 读取文件 → canvas 压缩 → base64（去掉 data: 前缀） */
async function compressToBase64(file: File): Promise<{ data: string; mime: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const MAX = 1600; // 最长边上限，控制上传体积
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("浏览器不支持图片压缩"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const mime = "image/jpeg";
        resolve({ data: canvas.toDataURL(mime, 0.85).split(",")[1] ?? "", mime });
      } catch {
        reject(new Error("图片压缩失败"));
      }
    };
    img.onerror = () => reject(new Error("图片解析失败，请换一张图片"));
    img.src = dataUrl;
  });
}

export default function PhotoScanPage() {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [previewUrl, setPreviewUrl] = useState("");
  const [prepared, setPrepared] = useState<{ data: string; mime: string } | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError("请选择 JPG / PNG / WEBP 格式的图片");
      return;
    }
    setError("");
    try {
      const out = await compressToBase64(file);
      setPrepared(out);
      setPreviewUrl(URL.createObjectURL(file));
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "图片处理失败");
    }
  };

  const startOcr = async () => {
    if (!prepared) return;
    setStatus("loading");
    setError("");
    const res = await fetchOcr(prepared.data, prepared.mime);
    if (!res.ok || !res.ingredients?.length) {
      setStatus("ready");
      setError(
        res.code === "OCR_NOT_CONFIGURED"
          ? "未配置 OCR 服务：请到后台「OCR 配置」页添加服务后重试，或改用下方手动输入。"
          : (res.error ?? "识别失败，请换一张更清晰的配料表图片重试。")
      );
      return;
    }
    // 识别成功 → 写入确认页草稿，进入人工核对
    useAnalysisStore.getState().setDraftIngredients(res.ingredients);
    window.location.href = "/confirm?source=ocr";
  };

  const reset = () => {
    setPreviewUrl("");
    setPrepared(null);
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

          {status !== "idle" && prepared && (
            <div className={styles.previewWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="待识别配料表" className={styles.preview} />
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
                  {status === "loading" ? "识别中…" : "开始识别"}
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
            图片仅用于本次识别，识别结果需在确认页人工核对后方可作为最终分析依据。
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
