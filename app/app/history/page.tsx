"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppBar from "@/components/AppBar";
import Button from "@/components/Button";
import Chip from "@/components/Chip";
import GlassCard from "@/components/GlassCard";
import TabBar from "@/components/TabBar";
import { syncHistoryFromServer, useAnalysisStore } from "@/store/analysis";
import styles from "./page.module.css";

const THUMB_GRADIENT_FALLBACK = "linear-gradient(135deg,#B39DDB,#7E57C2)";

type HistoryFilter = "all" | "additive" | "allergen";

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "additive", label: "含添加剂" },
  { key: "allergen", label: "含过敏原" },
];

export default function HistoryPage() {
  const history = useAnalysisStore((s) => s.history);
  const removeHistory = useAnalysisStore((s) => s.removeHistory);
  const toggleCompare = useAnalysisStore((s) => s.toggleCompare);

  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("all");

  // 进入历史页即从服务端拉取最新记录（跨端同步；store 内 30s 冷却防抖）
  useEffect(() => {
    void syncHistoryFromServer();
  }, []);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return history.filter((h) => {
      if (filter === "additive" && !h.ingredients.some((i) => i.category === "additive")) return false;
      if (filter === "allergen" && !h.ingredients.some((i) => (i.allergens?.length ?? 0) > 0)) return false;
      if (kw && !h.product.name.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [history, keyword, filter]);

  return (
    <div className={styles.page}>
      <AppBar title="历史记录" />

      <main className={styles.scroll}>
        <div className={styles.searchBox}>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--color-text-tertiary)" }}>
            search
          </span>
          <input
            placeholder="搜索食品名称…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--color-text-tertiary)" }}>
            tune
          </span>
        </div>

        <div className={styles.filterRow}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`${styles.filterChip} ${filter === f.key ? styles.active : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <h2>{history.length === 0 ? "还没有分析记录" : "没有匹配的记录"}</h2>
            <p>
              {history.length === 0
                ? "试试从首页开始第一次分析"
                : "换个关键词或筛选条件试试"}
            </p>
            <Button onClick={() => (window.location.href = "/")}>去首页</Button>
          </div>
        ) : (
          <div className={styles.historyList}>
            {filtered.map((h) => (
              <GlassCard key={h.id} className={styles.historyCard}>
                <Link href={`/result/${h.id}`} className={styles.historyMain}>
                  <div
                    className={styles.historyThumb}
                    style={{ background: THUMB_GRADIENT_FALLBACK }}
                  >
                    <span className="material-symbols-rounded">inventory_2</span>
                  </div>
                  <div className={styles.historyMeta}>
                    <div className={styles.historyName}>{h.product.name}</div>
                    <div className={styles.historyStats}>
                      <span className={styles.historyTime}>
                        {h.ingredients.length} 项 · {new Date(h.confirmedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <div className={styles.historyChips}>
                        <Chip category="natural">{h.ingredients.filter((i) => i.category === "natural").length} 项</Chip>
                        {h.ingredients.some((i) => i.category === "additive") && (
                          <Chip category="additive">
                            {h.ingredients.filter((i) => i.category === "additive").length} 项
                          </Chip>
                        )}
                        {h.ingredients.some((i) => i.allergens?.length) && (
                          <Chip variant="allergen">
                            {h.ingredients.reduce((n, i) => n + (i.allergens?.length ?? 0), 0)} 项
                          </Chip>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
                <div className={styles.actions}>
                  <button className={styles.miniBtnPrimary} onClick={() => (window.location.href = `/result/${h.id}`)}>
                    详情
                  </button>
                  <button
                    className={styles.miniBtn}
                    onClick={() => {
                      useAnalysisStore.getState().setDraftIngredients(h.ingredients);
                      window.location.href = `/confirm?source=edit&id=${h.id}`;
                    }}
                  >
                    编辑配料表
                  </button>
                  <button
                    className={styles.miniBtn}
                    onClick={() => {
                      toggleCompare(h.id);
                      window.location.href = "/compare";
                    }}
                  >
                    + 对比
                  </button>
                  <button className={styles.miniBtnDanger} onClick={() => removeHistory(h.id)}>
                    删除
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </main>

      <TabBar />
    </div>
  );
}
