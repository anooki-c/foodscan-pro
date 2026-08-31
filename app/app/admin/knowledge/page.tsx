"use client";

import { useState } from "react";
import { fetchKnowledge } from "@/lib/services/api";
import styles from "../pages.module.css";

export default function KnowledgePage() {
  const [tab, setTab] = useState<"ingredient" | "additive" | "allergen">("additive");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult("");
    const res = await fetchKnowledge(query.trim(), tab === "additive" ? "additive" : "ingredient");
    setLoading(false);
    if (!res || res.type === "none") {
      setResult(`未找到「${query}」的资料。`);
    } else {
      setResult(
        `命中：${res.type === "additive" ? "添加剂" : "配料"}\n` +
        JSON.stringify(res.data, null, 2).slice(0, 400)
      );
    }
  };

  return (
    <div>
      <div className={styles.pageTitle}>
        <h1>知识库管理</h1>
        <p>配料库 · 添加剂库 · 过敏原库</p>
      </div>

      <div className={styles.tabs}>
        <span className={`${styles.tab} ${tab === "ingredient" ? styles.tabActive : ""}`} onClick={() => setTab("ingredient")}>配料库</span>
        <span className={`${styles.tab} ${tab === "additive" ? styles.tabActive : ""}`} onClick={() => setTab("additive")}>添加剂库</span>
        <span className={`${styles.tab} ${tab === "allergen" ? styles.tabActive : ""}`} onClick={() => setTab("allergen")}>过敏原库</span>
      </div>

      <div className={`${styles.grid} ${styles.cols3}`}>
        <div className={styles.card}>
          <div className={styles.label}>配料库</div>
          <div className={styles.value}>9</div>
          <div className={styles.sub}>当前内置</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>添加剂库</div>
          <div className={styles.value}>12</div>
          <div className={styles.sub}>当前内置</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>过敏原库</div>
          <div className={styles.value}>8</div>
          <div className={styles.sub}>8 大类</div>
        </div>
      </div>

      <div className={`${styles.card} ${styles.sectionGap}`}>
        <h3>快速查询</h3>
        <div className={styles.statusRow}>
          <input
            style={{
              flex: 1,
              height: 36,
              borderRadius: "var(--radius-default)",
              border: "1px solid var(--color-divider)",
              background: "var(--color-surface-container-lowest)",
              padding: "0 12px",
              font: "500 13px/1 var(--font-body)",
              color: "var(--color-text-primary)",
            }}
            placeholder={tab === "additive" ? "如：山梨酸钾、黄原胶" : "如：乳粉、小麦粉"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
          />
          <button className={styles.btnSm} onClick={lookup} disabled={loading}>
            {loading ? "查询中…" : "查询"}
          </button>
        </div>
        {result && (
          <pre
            className={styles.sub}
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "rgba(255,255,255,0.4)",
              borderRadius: "var(--radius-default)",
              padding: 12,
              marginTop: 12,
            }}
          >
            {result}
          </pre>
        )}
      </div>
    </div>
  );
}
