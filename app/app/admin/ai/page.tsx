"use client";

import { useEffect, useState } from "react";
import { fetchPublicConfig } from "@/lib/services/api";
import styles from "../pages.module.css";

export default function AiPage() {
  const [cfg, setCfg] = useState<{ aiEnabled: boolean } | null>(null);

  useEffect(() => {
    fetchPublicConfig().then(setCfg);
  }, []);

  return (
    <div>
      <div className={styles.pageTitle}>
        <h1>AI 配置</h1>
        <p>关闭时，配料解读与 AI Vision 均不调用</p>
      </div>

      <div className={`${styles.grid} ${styles.cols2}`}>
        <div className={styles.card}>
          <h3>AI 配料解读</h3>
          <div className={styles.statList}>
            <div className={styles.statLine}><span className={styles.k}>启用状态</span><span className={styles.v}><span className={`${styles.tag} ${cfg?.aiEnabled ? styles.tagOn : styles.tagOff}`}>{cfg?.aiEnabled ? "启用" : "关闭"}</span></span></div>
            <div className={styles.statLine}><span className={styles.k}>Provider</span><span className={styles.v}>{cfg?.aiEnabled ? "openai-compatible" : "—"}</span></div>
            <div className={styles.statLine}><span className={styles.k}>调用范围</span><span className={styles.v}>仅基于用户确认配料</span></div>
            <div className={styles.statLine}><span className={styles.k}>约束</span><span className={styles.v}>禁止编造 / 禁止医疗判断</span></div>
          </div>
          <p className={styles.sub}>在 app/.env.local 中配置 AI_ENABLED=true 与 AI_API_URL / AI_API_KEY 后启用。</p>
        </div>
        <div className={styles.card}>
          <h3>AI Vision（可选兜底）</h3>
          <div className={styles.statList}>
            <div className={styles.statLine}><span className={styles.k}>启用状态</span><span className={styles.v}><span className={`${styles.tag} ${styles.tagOff}`}>关闭</span></span></div>
            <div className={styles.statLine}><span className={styles.k}>调用次数</span><span className={styles.v}>0</span></div>
            <div className={styles.statLine}><span className={styles.k}>成功 / 失败</span><span className={styles.v}>0 / 0</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
