"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchOffStats, checkOffConnection, forceOffUpdate } from "@/lib/services/api";
import ConfirmDialog from "@/components/ConfirmDialog";
import styles from "../pages.module.css";

function fmtTime(ts: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function OffPage() {
  const [enabled, setEnabled] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [cachedCount, setCachedCount] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState("");
  const [err, setErr] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const reload = useCallback(async () => {
    const stats = await fetchOffStats();
    setEnabled(stats.enabled);
    setApiUrl(stats.apiUrl);
    setCachedCount(stats.cachedCount);
    setLastFetchedAt(stats.lastFetchedAt);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const checkUpdate = async () => {
    setChecking(true);
    setErr("");
    setResult("");
    const res = await checkOffConnection();
    setChecking(false);
    if (!res.ok) {
      setErr(res.error ?? "检查失败");
      return;
    }
    setResult(res.note ?? "");
    reload();
  };

  const forceUpdate = async () => {
    setUpdating(true);
    setErr("");
    setResult("");
    const res = await forceOffUpdate();
    setUpdating(false);
    if (!res.ok) {
      setErr(res.error ?? "更新失败");
      return;
    }
    setResult(res.note ?? "");
    reload();
  };

  return (
    <div>
      <div className={styles.pageTitle}>
        <h1>OFF 数据更新</h1>
        <p>实时查询模式 · 本地 SQLite 缓存（1 小时 TTL），可随时强制刷新</p>
      </div>

      <div className={`${styles.grid} ${styles.cols4}`}>
        <div className={styles.card}>
          <div className={styles.label}>查询模式</div>
          <div className={styles.value} style={{ fontSize: 20 }}>实时 + 缓存</div>
          <div className={styles.sub}>按条码请求 OFF API</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>缓存条目</div>
          <div className={styles.value}>{cachedCount}</div>
          <div className={styles.sub}>SQLite · 1 小时 TTL</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>数据源状态</div>
          <div className={styles.value} style={{ fontSize: 20 }}>{enabled ? "启用" : "停用"}</div>
          <div className={styles.sub}>{apiUrl}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>最近抓取</div>
          <div className={styles.value} style={{ fontSize: 20 }}>{fmtTime(lastFetchedAt).slice(11)}</div>
          <div className={styles.sub}>{fmtTime(lastFetchedAt).slice(0, 10)}</div>
        </div>
      </div>

      <div className={`${styles.card} ${styles.sectionGap}`}>
        <h3>更新操作</h3>
        <div className={styles.statList}>
          <div className={styles.statLine}><span className={styles.k}>数据源</span><span className={styles.v}>{apiUrl}</span></div>
          <div className={styles.statLine}><span className={styles.k}>缓存策略</span><span className={styles.v}>按条码缓存 1 小时，命中直接返回</span></div>
        </div>
        <div className={styles.statusRow}>
          <button className={styles.btnSm} onClick={checkUpdate} disabled={checking || !enabled}>
            {checking ? "检查中…" : "检查更新（连通性探测）"}
          </button>
          <button className={styles.btnSm} onClick={() => setConfirmOpen(true)} disabled={updating}>
            {updating ? "更新中…" : "立即强制更新（清空缓存）"}
          </button>
        </div>
        {!enabled && <p className={styles.sub} style={{ color: "var(--color-status-additive-fg)" }}>OFF 数据源已停用，请在「食品数据源」页启用。</p>}
        {result && <p className={styles.sub}>{result}</p>}
        {err && <p className={styles.sub} style={{ color: "var(--color-status-additive-fg)" }}>{err}</p>}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="清空 OFF 本地缓存？"
        description="下次按条码查询会重新从 OFF 拉取数据（1 小时 TTL）。"
        confirmText="清空缓存"
        danger
        onConfirm={() => {
          setConfirmOpen(false);
          void forceUpdate();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
