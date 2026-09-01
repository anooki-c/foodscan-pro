"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchPublicConfig } from "@/lib/services/api";
import styles from "./pages.module.css";

export default function AdminDashboard() {
  const [cfg, setCfg] = useState<{ offEnabled: boolean; ocrEnabled: boolean; aiEnabled: boolean } | null>(null);

  useEffect(() => {
    fetchPublicConfig().then(setCfg);
  }, []);

  const cardLink: React.CSSProperties = {
    display: "block",
    textDecoration: "none",
    color: "inherit",
  };

  return (
    <div>
      <div className={styles.pageTitle}>
        <h1>Dashboard</h1>
        <p>系统运行状态与调用统计</p>
      </div>

      <div className={`${styles.grid} ${styles.cols4}`}>
        <div className={styles.card}>
          <div className={styles.label}>食品数据库</div>
          <div className={styles.value} style={{ color: "var(--ring-natural)" }}>正常</div>
          <div className={styles.statusRow}>
            <span className={`${styles.statusDot} ${styles.ok}`} />
            <span className={styles.statusText}>OFF v2026-08-30</span>
          </div>
        </div>
        <Link href="/admin/ocr" className={styles.card} style={cardLink}>
          <div className={styles.label}>OCR 服务</div>
          <div className={styles.value} style={{ color: cfg?.ocrEnabled ? "var(--ring-natural)" : "var(--color-text-tertiary)" }}>
            {cfg?.ocrEnabled ? "正常" : "未配置"}
          </div>
          <div className={styles.statusRow}>
            <span className={`${styles.statusDot} ${cfg?.ocrEnabled ? styles.ok : styles.off}`} />
            <span className={styles.statusText}>{cfg?.ocrEnabled ? "第三方 + 本地" : "回退本地模拟"} · 点击配置 →</span>
          </div>
        </Link>
        <Link href="/admin/ai" className={styles.card} style={cardLink}>
          <div className={styles.label}>AI 服务</div>
          <div className={styles.value} style={{ color: cfg?.aiEnabled ? "var(--ring-natural)" : "var(--color-text-tertiary)" }}>
            {cfg?.aiEnabled ? "正常" : "已关闭"}
          </div>
          <div className={styles.statusRow}>
            <span className={`${styles.statusDot} ${cfg?.aiEnabled ? styles.ok : styles.off}`} />
            <span className={styles.statusText}>{cfg?.aiEnabled ? "后台已启用" : "回退 mock 文案"} · 点击配置 →</span>
          </div>
        </Link>
        <div className={styles.card}>
          <div className={styles.label}>系统版本</div>
          <div className={styles.value}>V1.0.0</div>
          <div className={styles.statusRow}>
            <span className={styles.statusText}>知识库 V2 · OCR V3</span>
          </div>
        </div>
      </div>

      <div className={`${styles.grid} ${styles.cols2} ${styles.sectionGap}`}>
        <div className={styles.card}>
          <h3>调用统计</h3>
          <div className={styles.statList}>
            <div className={styles.statLine}><span className={styles.k}>OFF 查询（今日）</span><span className={styles.v}>实时</span></div>
            <div className={styles.statLine}><span className={styles.k}>OCR 调用</span><span className={styles.v}>{cfg?.ocrEnabled ? "实时" : "0（未启用）"}</span></div>
            <div className={styles.statLine}><span className={styles.k}>AI 调用</span><span className={styles.v}>{cfg?.aiEnabled ? "实时" : "0（未启用）"}</span></div>
          </div>
        </div>
        <div className={styles.card}>
          <h3>最近系统错误</h3>
          <div className={styles.statList}>
            <div className={styles.statLine}><span className={styles.k}>暂无错误</span><span className={styles.v}>—</span></div>
            <div className={styles.statLine}><span className={styles.k}>配置方式</span><span className={styles.v}>.env.local</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
