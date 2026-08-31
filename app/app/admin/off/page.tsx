"use client";

import { useState } from "react";
import styles from "../pages.module.css";

export default function OffPage() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState("");

  const checkUpdate = () => {
    setChecking(true);
    setResult("");
    // 真实场景：调后台 OFF 更新流程（下载 → 校验 → 导入 → 建索引 → 验证 → 切换）
    setTimeout(() => {
      setChecking(false);
      setResult("已检查：当前为最新版本 v2026-08-30，无需更新。");
    }, 1200);
  };

  return (
    <div>
      <div className={styles.pageTitle}>
        <h1>OFF 数据更新</h1>
        <p>下载 → 校验 → 导入 → 建索引 → 验证 → 切换新版本</p>
      </div>

      <div className={`${styles.grid} ${styles.cols4}`}>
        <div className={styles.card}>
          <div className={styles.label}>当前版本</div>
          <div className={styles.value}>v2026-08-30</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>产品数量</div>
          <div className={styles.value}>2.8M</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>数据大小</div>
          <div className={styles.value}>4.2 GB</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>上次更新</div>
          <div className={styles.value}>03:00</div>
        </div>
      </div>

      <div className={`${styles.card} ${styles.sectionGap}`}>
        <h3>更新配置</h3>
        <div className={styles.statList}>
          <div className={styles.statLine}><span className={styles.k}>自动更新</span><span className={styles.v}>已开启 · 每天</span></div>
          <div className={styles.statLine}><span className={styles.k}>更新时间</span><span className={styles.v}>凌晨 03:00</span></div>
        </div>
        <div className={styles.statusRow}>
          <button className={styles.btnSm} onClick={checkUpdate} disabled={checking}>
            {checking ? "检查中…" : "检查更新"}
          </button>
          <button className={styles.btnSm}>立即强制更新</button>
        </div>
        {result && <p className={styles.sub}>{result}</p>}
      </div>
    </div>
  );
}
