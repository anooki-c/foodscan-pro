"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppBar from "@/components/AppBar";
import Button from "@/components/Button";
import IngredientRow from "@/components/IngredientRow";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAnalysisStore, confirmDraft } from "@/store/analysis";
import { CANDIDATES } from "@/lib/mock-data";
import type { Ingredient } from "@/lib/types";
import styles from "./page.module.css";

function ConfirmInner() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") ?? "manual";
  const editId = searchParams.get("id");

  const {
    draftIngredients,
    updateDraftIngredient,
    deleteDraftIngredient,
    addDraftIngredient,
    setDraftIngredients,
  } = useAnalysisStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  /** 原地编辑的当前输入值 */
  const [editText, setEditText] = useState("");
  /** 离开编辑时待确认保存的条目 */
  const [pendingSave, setPendingSave] = useState<Ingredient | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [productName, setProductName] = useState("");

  // 编辑模式：从历史记录回填已识别的配料表与产品名（刷新页面也不丢失）
  useEffect(() => {
    if (source !== "edit" || !editId || draftIngredients.length > 0) return;
    const analysis = useAnalysisStore.getState().getAnalysisById(editId);
    if (analysis) {
      setDraftIngredients(analysis.ingredients);
      setProductName(analysis.product.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, editId]);

  /** 手动新增一条配料（输入为空时忽略） */
  const addManual = () => {
    const text = manualInput.trim();
    if (!text) return;
    addDraftIngredient({
      id: `i-manual-${Date.now()}`,
      originalText: text,
      finalText: text,
      originalPos: 0,
      finalPos: 0,
      source: "manual",
      confidence: "manual",
      isManual: true,
    });
    setManualInput("");
  };

  const editing = useMemo(
    () => draftIngredients.find((i) => i.id === editingId) ?? null,
    [draftIngredients, editingId]
  );

  const candidates = useMemo(() => {
    if (!editing) return [];
    const key = Object.keys(CANDIDATES).find((k) => k && editText.includes(k));
    return CANDIDATES[key ?? ""] ?? [];
  }, [editing, editText]);

  /** 原地编辑保存 */
  const saveEdit = (ing: Ingredient) => {
    const text = editText.trim();
    updateDraftIngredient(ing.id, {
      finalText: text || ing.finalText,
      isManual: true,
      confidence: "manual",
      needsConfirm: false,
    });
    setEditingId(null);
    setEditText("");
  };

  /** 原地编辑取消 */
  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  /** 进入编辑态 */
  const startEdit = (ing: Ingredient) => {
    setEditText(ing.finalText);
    setEditingId(ing.id);
  };

  /** 点击配料行其他区域（离开编辑）时，若有改动则弹确认 */
  const handleRowBlur = (ing: Ingredient) => {
    if (editingId !== ing.id) return; // 保存/取消按钮已抢先处理，编辑态已退出
    const text = editText.trim();
    if (!text || text === ing.finalText) {
      cancelEdit();
      return;
    }
    setPendingSave(ing);
  };

  const handleConfirm = () => {
    if (draftIngredients.length === 0) return;
    const result = confirmDraft(productName, draftIngredients);
    useAnalysisStore.getState().addHistory(result);
    useAnalysisStore.getState().setCurrentAnalysis(result);
    window.location.href = `/result/${result.id}`;
  };

  const sourceLabel =
    source === "barcode"
      ? "条形码查询"
      : source === "ocr"
        ? "图片识别"
        : source === "edit"
          ? "历史编辑"
          : "手动输入";

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
            <h3>{source === "edit" ? "请检查并编辑配料表" : "请确认识别结果"}</h3>
            <p>
              {source === "edit"
                ? "已从历史记录带入已识别的配料，可直接编辑或新增后重新分析。"
                : "自动识别结果不能直接作为最终分析结果，请检查以下配料。"}
            </p>
          </div>
        </div>

        <div className={styles.sourceRow}>
          <span className={styles.sourceChip}>来源：{sourceLabel}</span>
          <span className={styles.sourceChip}>{draftIngredients.length} 项</span>
        </div>

        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            placeholder="产品名称（可选，留空显示「未命名食品」）"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            aria-label="产品名称"
          />
        </div>

        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            placeholder="输入配料名称，如：白砂糖、水"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addManual();
            }}
            aria-label="配料名称"
          />
          <Button variant="primary" size="sm" onClick={addManual}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>add</span>
            新增
          </Button>
        </div>

        <div className={styles.sectionHead}>
          <h2>配料表</h2>
        </div>

        <div className={styles.ingredientList}>
          {draftIngredients.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-symbols-rounded">format_list_bulleted</span>
              <p>
                暂无配料。请在下方输入名称后点击「新增」，或返回重新拍摄 / 条码查询。
              </p>
            </div>
          ) : (
            draftIngredients.map((ing, idx) => {
              const isEditing = editingId === ing.id;
              if (isEditing) {
                return (
                  <div key={ing.id} className={styles.editRow}>
                    <input
                      className={styles.editInput}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(ing);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      onBlur={() => handleRowBlur(ing)}
                      autoFocus
                      placeholder="输入配料名称…"
                    />
                    <div className={styles.editActions}>
                      <button
                        className={styles.editSave}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          saveEdit(ing);
                        }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>check</span>
                      </button>
                      <button
                        className={styles.editCancel}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          cancelEdit();
                        }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </div>
                    {candidates.length > 0 && (
                      <div className={styles.candidateRow}>
                        {candidates.map((c) => (
                          <span
                            key={c}
                            className={`${styles.candidateChip} ${c === editText ? styles.candidateOn : ""}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setEditText(c)}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <IngredientRow
                  key={ing.id}
                  ingredient={ing}
                  index={idx}
                  draggable
                  interactive
                  onEdit={startEdit}
                  onDelete={(id) => deleteDraftIngredient(id)}
                />
              );
            })
          )}
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

      {/* 离开编辑时确认是否保存修改 */}
      <ConfirmDialog
        open={!!pendingSave}
        title="保存修改？"
        description={
          pendingSave
            ? `已将「${pendingSave.finalText}」修改为「${editText.trim()}」。是否保存这次修改？`
            : ""
        }
        confirmText="保存"
        cancelText="放弃"
        onConfirm={() => {
          if (pendingSave) saveEdit(pendingSave);
          setPendingSave(null);
        }}
        onCancel={() => {
          cancelEdit();
          setPendingSave(null);
        }}
      />
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
