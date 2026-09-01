"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppBar from "@/components/AppBar";
import Button from "@/components/Button";
import Chip from "@/components/Chip";
import GlassCard from "@/components/GlassCard";
import CompositionRing from "@/components/CompositionRing";
import IngredientDetailSheet from "@/components/IngredientDetailSheet";
import AdditiveDetailSheet from "@/components/AdditiveDetailSheet";
import { useAnalysisStore } from "@/store/analysis";
import { fetchAiSummary, saveScanRecord } from "@/lib/services/api";
import type { Ingredient } from "@/lib/types";
import styles from "./page.module.css";

/** AI 解读结果缓存（按分析记录 id，命中即不再调用 AI，节约 token） */
const AI_CACHE_PREFIX = "foodscan-ai-summary:";

function readAiCache(id: string): string | null {
  try {
    return localStorage.getItem(AI_CACHE_PREFIX + id);
  } catch {
    return null;
  }
}

function writeAiCache(id: string, summary: string) {
  try {
    localStorage.setItem(AI_CACHE_PREFIX + id, summary);
  } catch {
    // 隐私模式或容量满时静默忽略
  }
}

export default function ResultPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const analysis = useAnalysisStore((s) => s.getAnalysisById(id ?? ""));
  const toggleCompare = useAnalysisStore((s) => s.toggleCompare);

  // 详情弹窗状态
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [selectedAdditive, setSelectedAdditive] = useState<Ingredient | null>(null);
  // AI 解读状态（真实 API + mock 兜底）
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  // 分享反馈提示
  const [shareTip, setShareTip] = useState("");

  const handleShare = async () => {
    if (!analysis) return;
    const text = `${analysis.product.name} · ${analysis.ingredients.length} 项配料\n${analysis.ingredients
      .map((i) => i.finalText)
      .join("、")}`;
    const url = window.location.href;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: analysis.product.name, text, url });
        return;
      } catch (e) {
        // 用户取消分享不视为错误
        if ((e as Error)?.name === "AbortError") return;
      }
    }

    // 兜底：复制到剪贴板
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareTip("配料信息已复制到剪贴板");
    } catch {
      setShareTip("分享失败，请手动复制链接");
    }
    setTimeout(() => setShareTip(""), 2500);
  };

  const loadAi = useCallback(
    async (force = false) => {
      if (!analysis) return;
      // 非强制刷新时优先复用缓存，0 token
      if (!force) {
        const cached = readAiCache(analysis.id);
        if (cached) {
          setAiSummary(cached);
          return;
        }
      }
      setAiLoading(true);
      const result = await fetchAiSummary({
        productName: analysis.product.name,
        ingredients: analysis.ingredients.map((i) => i.finalText),
        additiveTypes: Object.keys(analysis.additiveStats),
        allergens: Object.keys(analysis.allergenStats),
      });
      const summary = result ?? analysis.aiSummary ?? null;
      setAiSummary(summary);
      if (summary) writeAiCache(analysis.id, summary);
      setAiLoading(false);
    },
    [analysis]
  );

  useEffect(() => {
    // 不再自动调用 AI：改为手动触发（节约 token）；有缓存则直接展示
    setAiSummary(analysis?.aiSummary ?? null);
    if (analysis) {
      const cached = readAiCache(analysis.id);
      if (cached) setAiSummary(cached);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.id]);

  // 扫描历史持久化（analysis_id 唯一，重复访问幂等）
  useEffect(() => {
    if (!analysis) return;
    saveScanRecord({
      analysisId: analysis.id,
      productName: analysis.product.name,
      barcode: analysis.product.barcode ?? "",
      dataSource: analysis.product.dataSource ?? "",
      ingredientCount: analysis.ingredients.length,
      snapshot: {
        product: analysis.product,
        ingredients: analysis.ingredients.map((i) => ({
          originalText: i.originalText,
          finalText: i.finalText,
          category: i.category,
          additiveType: i.additiveType,
          allergens: i.allergens,
        })),
        confirmedAt: analysis.confirmedAt,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.id]);

  if (!analysis) {
    return (
      <div className={styles.page}>
        <AppBar showBack title="分析结果" onBack={() => (window.location.href = "/")} />
        <div className={styles.empty}>
          <h2>未找到该分析记录</h2>
          <Button onClick={() => (window.location.href = "/")}>返回首页</Button>
        </div>
      </div>
    );
  }

  const ings = analysis.ingredients;
  const natural = ings.filter((i) => i.category === "natural").length;
  const processed = ings.filter((i) => i.category === "processed").length;
  const additive = ings.filter((i) => i.category === "additive").length;
  const allergen = ings.reduce((n, i) => n + (i.allergens?.length ?? 0), 0);

  const additives = ings.filter((i) => i.category === "additive");
  const allergens = ings.filter((i) => (i.allergens?.length ?? 0) > 0);

  const segments = [
    { key: "natural", label: "天然 / 基础原料", value: natural, color: "var(--ring-natural)" },
    { key: "processed", label: "加工原料", value: processed, color: "var(--ring-processed)" },
    { key: "additive", label: "食品添加剂", value: additive, color: "var(--ring-additive)" },
    { key: "allergen", label: "潜在过敏原", value: allergen, color: "var(--ring-allergen)" },
  ].filter((s) => s.value > 0);

  return (
    <div className={styles.page}>
      <AppBar
        showBack
        onBack={() => (window.location.href = "/")}
        title="分析结果"
        right={
          <button className={styles.iconBtn} onClick={() => { toggleCompare(analysis.id); }} aria-label="加入对比">
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>compare_arrows</span>
          </button>
        }
      />

      <main className={styles.scroll}>
        <div className={styles.productHead}>
          <h1>{analysis.product.name}</h1>
          <div className={styles.meta}>
            <span>{analysis.product.brand ? `品牌：${analysis.product.brand}` : ""}</span>
            {analysis.product.spec && <span>{analysis.product.spec}</span>}
            <span className={styles.sourceChip}>来源：{analysis.product.dataSource}</span>
            <span className={styles.sourceChip}>{analysis.product.updatedAt}</span>
          </div>
        </div>

        {/* 概览 */}
        <GlassCard className={styles.overview}>
          <div className={styles.overviewHead}>
            <h2>成分构成概览</h2>
            <span className={styles.note}>分类信息 · 不评价好坏</span>
          </div>
          <CompositionRing
            centerNum={ings.length}
            centerLabel="配料"
            segments={segments}
          />
        </GlassCard>

        {/* 配料表 */}
        <GlassCard className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>配料表</h2>
            <span className={styles.count}>按确认后顺序 · 共 {ings.length} 项</span>
          </div>
          {ings.map((ing, idx) => (
            <button
              type="button"
              className={styles.ingRow}
              key={ing.id}
              onClick={() => setSelectedIngredient(ing)}
            >
              <span className={styles.idx}>{String(idx + 1).padStart(2, "0")}</span>
              <div className={styles.ingInfo}>
                <div className={styles.ingName}>{ing.finalText}</div>
                <div className={styles.tags}>
                  {ing.category && <Chip category={ing.category} />}
                  {ing.allergens?.map((a) => (
                    <Chip key={a} variant="allergen">{a}</Chip>
                  ))}
                </div>
              </div>
              <span className={`${styles.chev} material-symbols-rounded`} style={{ fontSize: 18 }}>
                chevron_right
              </span>
            </button>
          ))}
        </GlassCard>

        {/* 添加剂分析 */}
        <GlassCard className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>食品添加剂</h2>
            <span className={styles.count}>共 {additives.length} 种</span>
          </div>
          <div className={styles.additiveStats}>
            {Object.entries(analysis.additiveStats).map(([type, n]) => (
              <span key={type} className={styles.statChip}>
                {type} {n}
              </span>
            ))}
          </div>
          {additives.map((ing) => (
            <button
              type="button"
              className={styles.ingRow}
              key={ing.id}
              onClick={() => setSelectedAdditive(ing)}
            >
              <span className={styles.idx}>·</span>
              <div className={styles.ingInfo}>
                <div className={styles.ingName}>{ing.finalText}</div>
                <div className={styles.tags}>
                  <Chip variant="role">{ing.additiveType ?? "添加剂"}</Chip>
                </div>
              </div>
              <span className={`${styles.chev} material-symbols-rounded`} style={{ fontSize: 18 }}>
                chevron_right
              </span>
            </button>
          ))}
        </GlassCard>

        {/* 潜在过敏原 */}
        <GlassCard className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>潜在过敏原</h2>
            <span className={styles.count}>{allergens.length} 类</span>
          </div>
          {allergens.map((ing) => (
            <div key={ing.id} className={styles.allergenBlock}>
              <div className={styles.allergenHead}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>warning</span>
                <span className={styles.allergenName}>{ing.allergens?.join(" / ")}</span>
              </div>
              <div className={styles.allergenSrc}>来源：{ing.finalText}</div>
            </div>
          ))}
          <p className={styles.allergenNote}>
            配料中包含可能属于常见过敏原类别的成分，请相关人群注意。请以食品包装上的过敏原声明及专业建议为准。
          </p>
        </GlassCard>

        {/* AI 解读 */}
        <div className={styles.aiBlock}>
          <div className={styles.aiHead}>
            <span className={styles.aiPill}>AI</span>
            <span style={{ font: "600 13px/20px var(--font-display)" }}>配料解读</span>
            <span
              className={`${styles.aiRefresh} material-symbols-rounded ${aiLoading ? styles.aiSpinning : ""}`}
              onClick={() => void loadAi(true)}
              role="button"
              aria-label="生成 AI 解读"
            >
              refresh
            </span>
          </div>
          {aiLoading ? (
            <p>AI 正在解读配料…</p>
          ) : (
            <p>
              {aiSummary ??
                "还没有 AI 解读。点击右上角刷新按钮按需生成，基础配料信息已可直接查看。"}
            </p>
          )}
          <p className={styles.aiNote}>AI 基于已确认配料与知识库进行解释，不构成医疗或营养建议。</p>
        </div>
      </main>

      {shareTip && <div className={styles.shareTip}>{shareTip}</div>}

      <div className={styles.actionBar}>
        <Button variant="secondary" size="lg" onClick={() => void handleShare()}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>share</span>
          分享
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            useAnalysisStore.getState().setDraftIngredients(analysis.ingredients);
            window.location.href = `/confirm?source=edit&id=${analysis.id}`;
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>edit_note</span>
          编辑配料表
        </Button>
        <Button
          variant="primary"
          size="lg"
          style={{ flex: 1 }}
          onClick={() => { toggleCompare(analysis.id); window.location.href = "/compare"; }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>compare_arrows</span>
          加入对比
        </Button>
      </div>

      {/* 配料详情 BottomSheet */}
      <IngredientDetailSheet
        open={!!selectedIngredient}
        ingredient={selectedIngredient}
        position={
          selectedIngredient
            ? ings.findIndex((i) => i.id === selectedIngredient.id) + 1
            : 0
        }
        onClose={() => setSelectedIngredient(null)}
      />

      {/* 添加剂详情 BottomSheet */}
      <AdditiveDetailSheet
        open={!!selectedAdditive}
        additive={selectedAdditive}
        position={
          selectedAdditive
            ? ings.findIndex((i) => i.id === selectedAdditive.id) + 1
            : 0
        }
        onClose={() => setSelectedAdditive(null)}
      />
    </div>
  );
}
