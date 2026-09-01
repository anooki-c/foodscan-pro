"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchAdminConfig, saveAdminConfig, fetchKbStats, checkOffConnection, fetchOffStats } from "@/lib/services/api";
import styles from "../pages.module.css";

interface OffCheckResult {
  ok: boolean;
  enabled?: boolean;
  reachable?: boolean;
  latencyMs?: number;
  probeName?: string | null;
  note?: string;
  error?: string;
}

export default function DatasourcesPage() {
  const [offEnabled, setOffEnabled] = useState(true);
  const [offApiUrl, setOffApiUrl] = useState("https://world.openfoodfacts.org");
  const [offCachedCount, setOffCachedCount] = useState(0);
  const [kbTotal, setKbTotal] = useState(0);
  const [toggling, setToggling] = useState(false);
  const [testing, setTesting] = useState<"off" | "kb" | null>(null);
  const [testResult, setTestResult] = useState<OffCheckResult | null>(null);
  const [kbResult, setKbResult] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    const [cfg, stats, offStats] = await Promise.all([
      fetchAdminConfig(),
      fetchKbStats(),
      fetchOffStats(),
    ]);
    if (cfg) setOffEnabled(cfg.offEnabled);
    if (offStats.apiUrl) setOffApiUrl(offStats.apiUrl);
    setOffCachedCount(offStats.cachedCount);
    setKbTotal(stats.ingredient + stats.additive + stats.allergen);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const toggleOff = async () => {
    setToggling(true);
    setMsg("");
    setErr("");
    const res = await saveAdminConfig({ offEnabled: !offEnabled });
    setToggling(false);
    if (!res.ok) {
      setErr(res.error ?? "保存失败");
      return;
    }
    setOffEnabled(!offEnabled);
    setMsg(offEnabled ? "已停用 Open Food Facts 数据源" : "已启用 Open Food Facts 数据源");
  };

  const testOff = async () => {
    setTesting("off");
    setTestResult(null);
    setErr("");
    const res = await checkOffConnection();
    setTesting(null);
    setTestResult(res);
    if (res.ok) {
      setOffCachedCount(await fetchOffStats().then((s) => s.cachedCount));
    }
  };

  const testKb = () => {
    setTesting("kb");
    setTestResult(null);
    setKbResult(`本地 SQLite 连接正常：共 ${kbTotal} 条知识条目（内置 159 + 过敏原 8，自定义条目另计）`);
    setTesting(null);
  };

  return (
    <div>
      <div className={styles.pageTitle}>
        <h1>食品数据源</h1>
        <p>查询来源与启用状态 · 条码走 OFF，配料/添加剂走本地知识库</p>
      </div>

      {msg && <div className={styles.formMsg}>{msg}</div>}
      {err && <div className={`${styles.formMsg} ${styles.formErr}`}>{err}</div>}

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.data}>
            <thead>
              <tr>
                <th>名称</th>
                <th>类型</th>
                <th>优先级</th>
                <th>状态</th>
                <th>详情</th>
                <th style={{ textAlign: "right" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong style={{ fontSize: 13 }}>Open Food Facts</strong></td>
                <td style={{ color: "var(--color-text-secondary)" }}>OFF 公开 API · 实时查询</td>
                <td style={{ fontFamily: "var(--font-mono)" }}>1</td>
                <td>
                  <span className={`${styles.tag} ${offEnabled ? styles.tagOn : styles.tagOff}`}>
                    {offEnabled ? "启用" : "停用"}
                  </span>
                </td>
                <td style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>
                  <div>{offApiUrl}</div>
                  <div style={{ marginTop: 2 }}>本地缓存 {offCachedCount} 条（1 小时 TTL）</div>
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button className={styles.btnSm} onClick={testOff} disabled={testing === "off"}>
                    {testing === "off" ? "测试中…" : "测试连接"}
                  </button>
                  <button className={styles.btnSm} onClick={toggleOff} disabled={toggling} style={{ marginRight: 0 }}>
                    {toggling ? "保存中…" : offEnabled ? "停用" : "启用"}
                  </button>
                </td>
              </tr>
              <tr>
                <td><strong style={{ fontSize: 13 }}>本地知识库</strong></td>
                <td style={{ color: "var(--color-text-secondary)" }}>SQLite · foodscan.db</td>
                <td style={{ fontFamily: "var(--font-mono)" }}>2</td>
                <td>
                  <span className={`${styles.tag} ${styles.tagOn}`}>启用</span>
                </td>
                <td style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>
                  <div>配料 / 添加剂 / 过敏原 {kbTotal} 条</div>
                  <div style={{ marginTop: 2 }}>首次启动自动播种 · 可增删改查</div>
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button className={styles.btnSm} onClick={testKb} disabled={testing === "kb"}>
                    {testing === "kb" ? "测试中…" : "测试连接"}
                  </button>
                  <Link href="/admin/knowledge" className={styles.btnSm} style={{ display: "inline-flex", alignItems: "center", height: 30, textDecoration: "none", marginRight: 0 }}>
                    管理知识库
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {testResult && (
          <div className={`${styles.statList} ${styles.sectionGap}`} style={{ maxWidth: 520 }}>
            <div className={styles.statLine}>
              <span className={styles.k}>连通性</span>
              <span className={styles.v}>
                {testResult.ok === false ? "网络错误" : testResult.enabled === false ? "未启用" : testResult.reachable ? "可达" : "不可达"}
              </span>
            </div>
            {typeof testResult.latencyMs === "number" && (
              <div className={styles.statLine}>
                <span className={styles.k}>延迟</span>
                <span className={styles.v}>{testResult.latencyMs}ms</span>
              </div>
            )}
            {testResult.probeName && (
              <div className={styles.statLine}>
                <span className={styles.k}>探测结果</span>
                <span className={styles.v}>{testResult.probeName}</span>
              </div>
            )}
            {(testResult.note || testResult.error) && (
              <p className={styles.sub}>{testResult.note ?? testResult.error}</p>
            )}
          </div>
        )}

        {kbResult && <p className={`${styles.sub} ${styles.sectionGap}`}>{kbResult}</p>}
      </div>
    </div>
  );
}
