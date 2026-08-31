"use client";

import { useState } from "react";
import AppBar from "@/components/AppBar";
import Button from "@/components/Button";
import { fetchProductByBarcode } from "@/lib/services/api";
import { useAnalysisStore } from "@/store/analysis";
import styles from "./page.module.css";

export default function ScanPage() {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleScan = async () => {
    const code = barcode.replace(/[^\d]/g, "");
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
      useAnalysisStore
        .getState()
        .setDraftIngredients([]);
      window.location.href = "/confirm?source=barcode";
      return;
    }

    useAnalysisStore
      .getState()
      .setDraftIngredients(result.ingredients);
    window.location.href = "/confirm?source=barcode";
  };

  return (
    <div className={styles.page}>
      <AppBar showBack onBack={() => (window.location.href = "/")} title="条形码查询" />

      <main className={styles.scroll}>
        <div className={styles.card}>
          <div className={styles.scanVisual}>
            <div className={styles.scanBox}>
              <span className={`${styles.corner} ${styles.tl}`} />
              <span className={`${styles.corner} ${styles.tr}`} />
              <span className={`${styles.corner} ${styles.bl}`} />
              <span className={`${styles.corner} ${styles.br}`} />
              <div className={styles.scanLine} />
            </div>
            <p>扫码需摄像头权限，此处可直接输入条码数字查询</p>
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
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
          />

          {error && <div className={styles.error}>{error}</div>}

          <Button fullWidth onClick={handleScan} disabled={loading}>
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
              onClick={() => (window.location.href = "/confirm?source=ocr")}
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
