"use client";

import Link from "next/link";
import AppBar from "@/components/AppBar";
import Button from "@/components/Button";
import Chip from "@/components/Chip";
import GlassCard from "@/components/GlassCard";
import TabBar from "@/components/TabBar";
import { useAnalysisStore } from "@/store/analysis";
import styles from "./page.module.css";

const THUMB_GRADIENTS: Record<string, string> = {
  "p-oat-milk": "linear-gradient(135deg, #A5D6A7 0%, #66BB6A 100%)",
  "p-energy": "linear-gradient(135deg, #F48FB1 0%, #EC407A 100%)",
};

export default function HistoryPage() {
  const history = useAnalysisStore((s) => s.history);
  const removeHistory = useAnalysisStore((s) => s.removeHistory);
  const toggleCompare = useAnalysisStore((s) => s.toggleCompare);

  return (
    <div className={styles.page}>
      <AppBar title="历史记录" />

      <main className={styles.scroll}>
        <div className={styles.searchBox}>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--color-text-tertiary)" }}>
            search
          </span>
          <input placeholder="搜索食品名称…" />
          <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--color-text-tertiary)" }}>
            tune
          </span>
        </div>

        <div className={styles.filterRow}>
          <button className={`${styles.filterChip} ${styles.active}`}>全部</button>
          <button className={styles.filterChip}>含添加剂</button>
          <button className={styles.filterChip}>含过敏原</button>
        </div>

        {history.length === 0 ? (
          <div className={styles.empty}>
            <h2>还没有分析记录</h2>
            <p>试试从首页开始第一次分析</p>
            <Button onClick={() => (window.location.href = "/")}>去首页</Button>
          </div>
        ) : (
          <div className={styles.historyList}>
            {history.map((h) => (
              <GlassCard key={h.id} className={styles.historyCard}>
                <Link href={`/result/${h.id}`} className={styles.historyMain}>
                  <div
                    className={styles.historyThumb}
                    style={{ background: THUMB_GRADIENTS[h.product.id] ?? "linear-gradient(135deg,#B39DDB,#7E57C2)" }}
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
                  <button className={styles.miniBtn} onClick={() => toggleCompare(h.id)}>
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
