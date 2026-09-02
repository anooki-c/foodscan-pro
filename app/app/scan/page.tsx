"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@/components/AppBar";
import Button from "@/components/Button";
import { fetchProductByBarcode } from "@/lib/services/api";
import { useAnalysisStore } from "@/store/analysis";
import styles from "./page.module.css";

export default function ScanPage() {
  const router = useRouter();
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const stopRef = useRef(false);

  // 组件卸载时释放摄像头
  useEffect(() => {
    return () => {
      stopRef.current = true;
      void scannerRef.current?.stop().then(() => scannerRef.current?.clear());
      scannerRef.current = null;
    };
  }, []);

  const stopCamera = async () => {
    setScanning(false);
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        // 未启动时 stop 会抛错，忽略
      }
    }
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
      // 客户端导航：保留 zustand 内存态（整页跳转会丢失 draft）
      router.push("/confirm?source=barcode");
      return;
    }

    useAnalysisStore.getState().setDraftIngredients(result.ingredients);
    router.push("/confirm?source=barcode");
  };

  const startCamera = async () => {
    if (scanning) return;
    setError("");

    // getUserMedia 仅在安全上下文（HTTPS / localhost）可用
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError(
        "当前页面通过 HTTP 访问，浏览器禁止调用摄像头。请改用 HTTPS 访问本应用，或直接输入条码数字。"
      );
      return;
    }

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("scan-qr-region");
      scannerRef.current = scanner;
      setScanning(true);

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1,
        },
        (decodedText) => {
          const code = decodedText.replace(/[^\d]/g, "");
          if (!/^\d{8,14}$/.test(code)) return;
          void (async () => {
            await stopCamera();
            setBarcode(code);
            void handleScan(code);
          })();
        },
        () => {
          // 单帧未识别属正常，忽略
        }
      );
    } catch (err) {
      setScanning(false);
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.includes("NotAllowedError") || msg.includes("permission")
          ? "无法访问摄像头：请检查浏览器权限设置（需允许摄像头），或直接手动输入条码。"
          : msg.includes("NotFoundError")
            ? "未检测到可用摄像头，请确认设备已开启摄像头，或直接手动输入条码。"
            : "摄像头启动失败，请直接手动输入条码数字。"
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
              <div id="scan-qr-region" className={styles.video} />
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
              <button className={styles.stopCam} onClick={() => void stopCamera()}>
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
              onClick={() => router.push("/confirm?source=manual")}
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
