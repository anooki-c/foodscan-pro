"use client";

import { useEffect, useState } from "react";
import { fetchPublicConfig } from "@/lib/services/api";
import styles from "../pages.module.css";

export default function OcrPage() {
  const [cfg, setCfg] = useState<{ ocrEnabled: boolean } | null>(null);

  useEffect(() => {
    fetchPublicConfig().then(setCfg);
  }, []);

  return (
    <div>
      <div className={styles.pageTitle}>
        <h1>OCR 配置</h1>
        <p>优先级：第三方 OCR → 本地 OCR → AI Vision（可选）</p>
      </div>

      <div className={styles.tabs}>
        <span className={`${styles.tab} ${styles.tabActive}`}>第三方 OCR</span>
        <span className={styles.tab}>本地 OCR</span>
        <span className={styles.tab}>AI Vision</span>
      </div>

      <div className={`${styles.grid} ${styles.cols2}`}>
        <div className={styles.card}>
          <h3>第三方 OCR</h3>
          <div className={styles.statList}>
            <div className={styles.statLine}><span className={styles.k}>服务商</span><span className={styles.v}>{cfg?.ocrEnabled ? "provider-a" : "未配置"}</span></div>
            <div className={styles.statLine}><span className={styles.k}>超时时间</span><span className={styles.v}>10s</span></div>
            <div className={styles.statLine}><span className={styles.k}>置信度阈值</span><span className={styles.v}>80%</span></div>
            <div className={styles.statLine}><span className={styles.k}>状态</span><span className={styles.v}><span className={`${styles.tag} ${cfg?.ocrEnabled ? styles.tagOn : styles.tagOff}`}>{cfg?.ocrEnabled ? "启用" : "停用"}</span></span></div>
          </div>
          <p className={styles.sub}>在 app/.env.local 中配置 OCR_ENABLED=true 与 OCR_API_URL / OCR_API_KEY 后启用。</p>
        </div>
        <div className={styles.card}>
          <h3>本地 OCR</h3>
          <div className={styles.statList}>
            <div className={styles.statLine}><span className={styles.k}>模型</span><span className={styles.v}>PaddleOCR V3</span></div>
            <div className={styles.statLine}><span className={styles.k}>置信度阈值</span><span className={styles.v}>80%</span></div>
            <div className={styles.statLine}><span className={styles.k}>运行状态</span><span className={styles.v}>正常</span></div>
            <div className={styles.statLine}><span className={styles.k}>状态</span><span className={styles.v}><span className={`${styles.tag} ${styles.tagOn}`}>启用</span></span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
