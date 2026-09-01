"use client";

import { useEffect, useState } from "react";
import { fetchScanRecords } from "@/lib/services/api";
import styles from "../pages.module.css";

interface ScanItem {
  id: number;
  analysisId: string;
  productName: string;
  barcode: string;
  dataSource: string;
  ingredientCount: number;
  createdAt: string;
}

export default function SystemPage() {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchScanRecords(5).then((res) => {
      setScans(res.items as unknown as ScanItem[]);
      setTotal(res.total);
    });
  }, []);

  return (
    <div>
      <div className={styles.pageTitle}>
        <h1>系统版本与更新日志</h1>
        <p>所有版本信息与变更记录</p>
      </div>

      <div className={styles.card}>
        <h3>版本</h3>
        <div className={styles.statList}>
          <div className={styles.statLine}><span className={styles.k}>Web 版本</span><span className={styles.v}>V1.1.0</span></div>
          <div className={styles.statLine}><span className={styles.k}>数据库</span><span className={styles.v}>SQLite · foodscan.db</span></div>
          <div className={styles.statLine}><span className={styles.k}>知识库</span><span className={styles.v}>SQLite 持久化</span></div>
          <div className={styles.statLine}><span className={styles.k}>OCR / AI</span><span className={styles.v}>后台可配置</span></div>
        </div>
      </div>

      <div className={`${styles.card} ${styles.sectionGap}`}>
        <h3>最近扫描（历史记录 · SQLite）</h3>
        {scans.length === 0 ? (
          <p className={styles.sub}>暂无扫描记录。完成一次扫码/拍摄识别后，结果页会自动写入历史。</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.data}>
              <thead>
                <tr>
                  <th>食品</th>
                  <th>来源</th>
                  <th>配料数</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong style={{ fontSize: 13 }}>{s.productName || "未命名食品"}</strong>
                      {s.barcode && (
                        <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}>
                          {s.barcode}
                        </span>
                      )}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>{s.dataSource || "手动确认"}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{s.ingredientCount}</td>
                    <td style={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{s.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 5 && <p className={styles.sub}>共 {total} 条历史记录</p>}
      </div>

      <div className={`${styles.card} ${styles.sectionGap}`}>
        <h3>更新日志</h3>
        <div className={styles.statList}>
          <div className={styles.statLine}><span className={styles.k}>V1.1.0 · 2026-09-01</span><span className={styles.v}>SQLite 持久化 + 知识库管理增删改查 + 扫描历史</span></div>
          <div className={styles.statLine}><span className={styles.k}>V1.0.0 · 2026-09-01</span><span className={styles.v}>接入真实 OFF API / OCR / AI</span></div>
          <div className={styles.statLine}><span className={styles.k}>V1.0.0-beta · 2026-08-31</span><span className={styles.v}>工程化落地 + 详情弹窗</span></div>
        </div>
      </div>
    </div>
  );
}
