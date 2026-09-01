"use client";

import { useEffect, useRef, useState } from "react";
import AppBar from "@/components/AppBar";
import Button from "@/components/Button";
import { fetchProductByBarcode } from "@/lib/services/api";
import { useAnalysisStore } from "@/store/analysis";
import styles from "./page.module.css";

/** BarcodeDetector 最小类型（部分 TS lib.dom 尚未收录） */
interface DetectorCode {
  rawValue: string;
}
interface Detector {
  detect(video: HTMLVideoElement): Promise<DetectorCode[]>;
}

/** 食品条码常见格式 */
const DETECT_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

export default function ScanPage() {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<Detector | null>(null);
  const rafRef = useRef(0);

  // 组件卸载时释放摄像头
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  /** 查询 OFF；preset 供摄像头扫码命中后直接传入 */
  const handleScan = async (preset?: string) => {
    const code = (preset ?? barcode).replace(/[^\d]/g, "");
    if (!code) {
      setError("请输入条码数字");
      return;
    }
    setLoading(true);
    setError("");
    const result = await fetchProductByBarcode(code);
    setLoading(false);

    if (!result.found || !result.product || !result.ingredients?.length) {
      setError(
        "未找到该产品，请尝试拍摄配料表或手动输入。可点击下方按钮继续。"
      );
      // 仍允许继续：把空产品预填，用户到确认页手动新增
      useAnalysisStore.getState().setDraftIngredients([]);
      window.location.href = "/confirm?source=barcode";
      return;
    }

    useAnalysisStore.getState().setDraftIngredients(result.ingredients);
    window.location.href = "/confirm?source=barcode";
  };

  /** 实时检测循环：命中条码即停止并查询 */
  const detectLoop = async () => {
    const detector = detectorRef.current;
    const video = videoRef.current;
    if (!detector || !video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }
    try {
      const codes = await detector.detect(video);
      const hit = codes.find((c) => /^\d{8,14}$/.test(c.rawValue));
      if (hit) {
        const code = hit.rawValue;
        stopCamera();
        setBarcode(code);
        void handleScan(code);
        return;
      }
    } catch {
      // 单帧检测失败可忽略，继续下一帧
    }
    rafRef.current = requestAnimationFrame(detectLoop);
  };

  const startCamera = async () => {
    if (scanning) return;
    setError("");
    if (typeof window === "undefined") return;

    const w = window as unknown as {
      BarcodeDetector?: new (opts?: { formats?: string[] }) => Detector;
    };
    if (!w.BarcodeDetector) {
      setError(
        "当前浏览器不支持摄像头扫码，请直接输入条码数字，或换用 Chrome / Edge 浏览器。"
      );
      return;
    }

    // 部分浏览器不接受 formats 参数，构造失败时用默认参数重试
    let detector: Detector;
    try {
      detector = new w.BarcodeDetector({ formats: DETECT_FORMATS });
    } catch {
      detector = new w.BarcodeDetector();
    }
    detectorRef.current = detector;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
        rafRef.current = requestAnimationFrame(detectLoop);
      }
    } catch {
      setError(
        "无法访问摄像头：请检查浏览器权限设置（需允许摄像头），或直接手动输入条码。"
      );
    }
  };

  return (
    <div className={styles.page}>
      <AppBar
        showBack
        onBack={() => (window.location.href = "/")}
        title="条形码查询"
      />

      <main className={styles.scroll}>
        <div className={styles.card}>
          <div className={styles.scanVisual}>
            <div
              className={`${styles.scanBox} ${scanning ? styles.scanBoxLive : ""}`}
              onClick={() => void startCamera()}
              role="button"
              tabIndex={0}
              aria-label="调起摄像头扫码"
              onKeyDown={(e) => e.key === "Enter" && void startCamera()}
            >
              {scanning && (
                <video
                  ref={videoRef}
                  className={styles.video}
                  playsInline
                  muted
                />
              )}
              <span className={`${styles.corner} ${styles.tl}`} />
              <span className={`${styles.corner} ${styles.tr}`} />
              <span className={`${styles.corner} ${styles.bl}`} />
              <span className={`${styles.corner} ${styles.br}`} />
              {!scanning && <div className={styles.scanLine} />}
            </div>
            <p>
              {scanning
                ? "对准商品条码，自动识别…"
                : "点击扫描框调起摄像头；也可直接输入条码数字查询"}
            </p>
            {scanning && (
              <button className={styles.stopCam} onClick={stopCamera}>
                关闭摄像头
              </button>
            )}
          </div>

          <label className={styles.label} htmlFor="barcode">
            条形码数字
          </label>
          <input
            id="barcode"
            className={styles.input}
            type="text"
            inputMode="numeric"
            placeholder="例如 3017624010701"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleScan()}
          />

          {error && <div className={styles.error}>{error}</div>}

          <Button fullWidth onClick={() => void handleScan()} disabled={loading}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
              {loading ? "progress_activity" : "search"}
            </span>
            {loading ? "查询中…" : "查询"}
          </Button>

          <div className={styles.actions}>
            <Button
              variant="ghost"
              size="md"
              style={{ flex: 1 }}
              onClick={() => (window.location.href = "/confirm?source=manual")}
            >
              手动输入配料
            </Button>
            <Button
              variant="ghost"
              size="md"
              style={{ flex: 1 }}
              onClick={() => (window.location.href = "/scan/photo")}
            >
              拍摄 / 上传
            </Button>
          </div>

          <p className={styles.note}>
            条码查询使用 Open Food Facts 公开数据。数据来源与更新时间会在确认页展示，识别结果仍需确认。
          </p>
        </div>
      </main>
    </div>
  );
}
