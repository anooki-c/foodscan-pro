"use client";

import { useMemo } from "react";
import AppBar from "@/components/AppBar";
import Button from "@/components/Button";
import GlassCard from "@/components/GlassCard";
import { useAnalysisStore } from "@/store/analysis";
import styles from "./page.module.css";

export default function ComparePage() {
  const compare = useAnalysisStore((s) => s.compare);
  const history = useAnalysisStore((s) => s.history);
  const toggleCompare = useAnalysisStore((s) => s.toggleCompare);
  const clearCompare = useAnalysisStore((s) => s.clearCompare);

  const selected = useMemo(
    () => compare.ids.map((id) => history.find((h) => h.id === id)).filter(Boolean),
    [compare.ids, history]
  );

  if (selected.length === 0) {
    return (
      <div className={styles.page}>
        <AppBar showBack title="配料对比" onBack={() => (window.location.href = "/")} />
        <div className={styles.empty}>
          <span className="material-symbols-rounded" style={{ fontSize: 48, color: "var(--color-text-tertiary)" }}>
            compare_arrows
          </span>
          <h2>还没有对比的食品</h2>
          <p>在分析结果页点击&ldquo;加入对比&rdquo;（最多 5 个食品）</p>
          <Button onClick={() => (window.location.href = "/history")}>去历史记录选择</Button>
        </div>
      </div>
    );
  }

  const products = selected.map((a) => a!.product.name);

  // 统计矩阵：类型 -> 每列数字
  const statRows: { label: string; key: string; values: (number | string)[] }[] = [
    { label: "配料数量", key: "count", values: [] },
    { label: "食品添加剂", key: "additive", values: [] },
    { label: "潜在过敏原", key: "allergen", values: [] },
    { label: "防腐剂", key: "防腐剂", values: [] },
    { label: "甜味剂", key: "甜味剂", values: [] },
    { label: "增稠剂", key: "增稠剂", values: [] },
  ];

  selected.forEach((a) => {
    const ing = a!.ingredients;
    const additive = ing.filter((i) => i.category === "additive").length;
    const allergen = ing.reduce((n, i) => n + (i.allergens?.length ?? 0), 0);
    const byType = (t: string) => ing.filter((i) => i.additiveType === t).length;

    statRows[0].values.push(ing.length);
    statRows[1].values.push(additive);
    statRows[2].values.push(allergen);
    statRows[3].values.push(byType("防腐剂"));
    statRows[4].values.push(byType("甜味剂"));
    statRows[5].values.push(byType("增稠剂"));
  });

  // 顺序对比：每个食品取前 8 项，对齐到各自顺序
  const maxLen = Math.max(...selected.map((a) => a!.ingredients.length), 0);
  const diffRows: { idx: number; cells: { name: string; type: string }[] }[] = [];
  for (let r = 0; r < Math.min(maxLen, 8); r++) {
    const cells = selected.map((a) => {
      const ing = a!.ingredients[r];
      if (!ing) return { name: "—", type: "missing" };
      return { name: ing.finalText, type: "common" };
    });
    diffRows.push({ idx: r, cells });
  }

  return (
    <div className={styles.page}>
      <AppBar
        showBack
        onBack={() => (window.location.href = "/")}
        title={`配料对比 · ${selected.length}/5`}
        right={
          <span className={styles.clear} onClick={clearCompare}>
            清空
          </span>
        }
      />

      <main className={styles.scroll}>
        {/* 产品选择条 */}
        <div className={styles.productPicker}>
          {selected.map((a) => (
            <span key={a!.id} className={styles.productPill}>
              <span className={`${styles.close} material-symbols-rounded`} onClick={() => toggleCompare(a!.id)}>
                close
              </span>
              {a!.product.name}
            </span>
          ))}
          <button className={styles.addPill} onClick={() => (window.location.href = "/history")}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>add</span>
            添加食品
          </button>
        </div>

        {/* 统计矩阵 */}
        <div className={styles.sectionTitle}>
          <h2>分类统计</h2>
          <span className={styles.note}>统计不代表健康评分</span>
        </div>
        <div className={styles.hscroll}>
          <div className={styles.hscrollInner}>
            <GlassCard className={styles.matrixCard}>
              <table className={styles.matrixTable}>
                <thead>
                  <tr>
                    <th>类型</th>
                    {products.map((p) => (
                      <th key={p} className={styles.foodCol}>{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statRows.map((row) => (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className={i === 0 ? styles.foodCol : ""}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          </div>
        </div>

        {/* 顺序对比 */}
        <div className={styles.sectionTitle}>
          <h2>配料顺序对比</h2>
          <span className={styles.note}>按各自原始顺序</span>
        </div>
        <div className={styles.hscroll}>
          <div className={styles.hscrollInner}>
            <GlassCard className={styles.matrixCard}>
              <table className={styles.diffTable}>
                <thead>
                  <tr>
                    <th>序</th>
                    {products.map((p) => (
                      <th key={p} className={styles.foodCol}>{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {diffRows.map((row) => (
                    <tr key={row.idx}>
                      <td className={styles.idxCell}>{String(row.idx + 1).padStart(2, "0")}</td>
                      {row.cells.map((c, i) => (
                        <td key={i}>
                          <span className={c.type === "missing" ? styles.missing : styles.common}>
                            {c.name}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          </div>
        </div>

        <div className={styles.legend}>
          <span><span className={styles.legendDot} style={{ background: "var(--color-text-tertiary)" }} />共同成分</span>
          <span><span className={styles.legendDot} style={{ background: "transparent", border: "1px dashed var(--color-text-tertiary)" }} />缺少成分</span>
        </div>

        <div className={styles.noteCard}>
          <strong>说明：</strong>配料表顺序可用于观察配料组成差异，但不能仅凭顺序确定具体含量。统计结果不代表&ldquo;更健康&rdquo;或&ldquo;更不健康&rdquo;的评价。
        </div>
      </main>
    </div>
  );
}
