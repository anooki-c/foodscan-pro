"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppBar from "@/components/AppBar";
import Button from "@/components/Button";
import Chip from "@/components/Chip";
import BottomSheet from "@/components/BottomSheet";
import IngredientRow from "@/components/IngredientRow";
import { useAnalysisStore, confirmDraft } from "@/store/analysis";
import { CANDIDATES, mockAnalysis } from "@/lib/mock-data";
import type { Ingredient } from "@/lib/types";
import styles from "./page.module.css";

function ConfirmInner() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") ?? "manual";

  const { draftIngredients, updateDraftIngredient, deleteDraftIngredient, addDraftIngredient } =
    useAnalysisStore();

  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [productName] = useState("即食燕麦片");

  // 根据源预填：演示中 text 入口使用 mock
  const [initialized] = useState(() => {
    if (draftIngredients.length === 0) {
      useAnalysisStore
        .getState()
        .setDraftIngredients(mockAnalysis.oatMilk.ingredients.map((i) => ({ ...i })));
    }
    return true;
  });
  void initialized;

  const candidates = useMemo(() => {
    if (!editing) return [];
    const key = Object.keys(CANDIDATES).find((k) => k && editing.finalText.includes(k));
    return CANDIDATES[key ?? ""] ?? [];
  }, [editing]);

  const handleConfirm = () => {
    if (draftIngredients.length === 0) return;
    const result = confirmDraft(productName, draftIngredients);
    useAnalysisStore.getState().addHistory(result);
    useAnalysisStore.getState().setCurrentAnalysis(result);
    window.location.href = `/result/${result.id}`;
  };

  const sourceLabel =
    source === "barcode" ? "条形码查询" : source === "ocr" ? "图片识别" : "手动输入";

  return (
    <div className={styles.page}>
      <AppBar
        showBack
        onBack={() => (window.location.href = "/")}
        title="确认配料表"
      />

      <main className={styles.scroll}>
        <div className={styles.banner}>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--color-primary)" }}>
            error
          </span>
          <div>
            <h3>请确认识别结果</h3>
            <p>自动识别结果不能直接作为最终分析结果，请检查以下配料。</p>
          </div>
        </div>

        <div className={styles.sourceRow}>
          <span className={styles.sourceChip}>来源：{sourceLabel}</span>
          <span className={styles.sourceChip}>{draftIngredients.length} 项</span>
        </div>

        <div className={styles.sectionHead}>
          <h2>配料表</h2>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              const id = `i-manual-${Date.now()}`;
              addDraftIngredient({
                id,
                originalText: manualInput,
                finalText: manualInput,
                originalPos: 0,
                finalPos: 0,
                source: "manual",
                confidence: "manual",
                isManual: true,
              });
              setManualInput("");
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>add</span>
            新增
          </Button>
        </div>

        <div className={styles.ingredientList}>
          {draftIngredients.map((ing, idx) => (
            <IngredientRow
              key={ing.id}
              ingredient={ing}
              index={idx}
              draggable
              interactive
              onEdit={(i) => setEditing(i)}
              onDelete={(id) => deleteDraftIngredient(id)}
            />
          ))}
        </div>

        {manualInput && (
          <div className={styles.manualHint}>
            输入 <strong>{manualInput}</strong> 后点击&ldquo;新增&rdquo;将其加入列表
          </div>
        )}
      </main>

      <div className={styles.confirmBar}>
        <span className={styles.count}>共 {draftIngredients.length} 项</span>
        <Button fullWidth onClick={handleConfirm} disabled={draftIngredients.length === 0}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>check</span>
          确认并开始分析
        </Button>
      </div>

      {/* 编辑 BottomSheet */}
      <BottomSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title="编辑配料"
        sub={
          editing && (
            <>
              当前：<strong>{editing.finalText}</strong>
              {editing.needsConfirm && <Chip variant="warning" style={{ marginLeft: 6 }}>建议确认</Chip>}
            </>
          )
        }
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setEditing(null)}>
              取消
            </Button>
            <Button
              variant="primary"
              size="md"
              style={{ flex: 1 }}
              onClick={() => {
                if (editing) {
                  updateDraftIngredient(editing.id, {
                    finalText: manualInput || editing.finalText,
                    isManual: true,
                    confidence: "manual",
                    needsConfirm: false,
                  });
                  setEditing(null);
                  setManualInput("");
                }
              }}
            >
              保存
            </Button>
          </>
        }
      >
        {editing && (
          <>
            <div className={styles.candidateList}>
              {candidates.map((c) => (
                <div
                  key={c}
                  className={`${styles.candidate} ${c === editing.finalText ? styles.selected : ""}`}
                  onClick={() => {
                    updateDraftIngredient(editing.id, {
                      finalText: c,
                      isManual: true,
                      confidence: "manual",
                      needsConfirm: false,
                    });
                  }}
                >
                  <span className={styles.candidateName}>{c}</span>
                  <span className={styles.candidateScore}>匹配度 {Math.max(60, 100 - c.length * 2)}%</span>
                </div>
              ))}
            </div>
            <input
              className={styles.manualInput}
              placeholder="或直接输入名称…"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
            />
          </>
        )}
      </BottomSheet>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmInner />
    </Suspense>
  );
}
