"use client";

import { useEffect, useState } from "react";
import BottomSheet from "./BottomSheet";
import Button from "./Button";
import Chip from "./Chip";
import { getIngredientKnowledge } from "@/lib/knowledge";
import { fetchKnowledge } from "@/lib/services/api";
import type { Ingredient, IngredientCategory } from "@/lib/types";
import styles from "./DetailSheets.module.css";

interface IngredientDetailSheetProps {
  open: boolean;
  ingredient: Ingredient | null;
  /** 在配料表中的位置（从 1 开始） */
  position: number;
  onClose: () => void;
}

interface KbData {
  name: string;
  category: IngredientCategory;
  oneLiner: string;
  processingNature?: string;
  purpose: string;
  detail?: string;
  allergens?: string[];
  source: string;
  updatedAt: string;
}

/** 配料详情 BottomSheet（PRD §12） */
export default function IngredientDetailSheet({
  open,
  ingredient,
  position,
  onClose,
}: IngredientDetailSheetProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [kb, setKb] = useState<KbData | null>(null);

  // API 优先查询知识库，失败回退本地 mock
  useEffect(() => {
    setKb(null);
    if (!open || !ingredient) return;
    let cancelled = false;
    (async () => {
      const res = await fetchKnowledge(ingredient.finalText, "ingredient");
      if (cancelled) return;
      if (res?.type === "ingredient") {
        setKb(res.data as KbData);
      } else {
        const local = getIngredientKnowledge(ingredient.finalText);
        if (local) setKb(local as unknown as KbData);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, ingredient]);

  if (!ingredient) return null;

  const allergenNote =
    ingredient.allergens?.length
      ? ingredient.allergens.join(" / ")
      : kb?.allergens?.join(" / ");

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={ingredient.finalText}
      sub={
        <div className={styles.titleRow}>
          {ingredient.category && <Chip category={ingredient.category} />}
          {allergenNote && <Chip variant="allergen">{allergenNote}</Chip>}
          <Chip variant="plain">第 {position} 项</Chip>
        </div>
      }
      footer={
        <div className={styles.footerInner}>
          <Button variant="ghost" size="md" onClick={onClose}>
            关闭
          </Button>
          <Button
            variant="primary"
            size="md"
            style={{ flex: 1 }}
            onClick={() => {
              onClose();
              window.location.href = `/confirm?source=manual&fix=${ingredient.finalText}`;
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>edit_note</span>
            发现识别错误？修改配料
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        {kb ? (
          <>
            {/* 第一层：一句话解释 */}
            <p className={styles.oneLiner}>{kb.oneLiner}</p>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>加工性质</span>
              <span className={styles.fieldValue}>{kb.processingNature}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>主要用途</span>
              <span className={styles.fieldValue}>{kb.purpose}</span>
            </div>

            {/* 第二层：详细说明 */}
            {kb.detail && (
              <div className={styles.detailBlock}>
                <h4>详细说明</h4>
                <p>{kb.detail}</p>
              </div>
            )}

            {/* 第三层：数据来源（可折叠） */}
            <div className={styles.advanced}>
              <button className={styles.advancedToggle} onClick={() => setShowAdvanced((v) => !v)}>
                <span>来源与更新时间</span>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                  {showAdvanced ? "expand_less" : "expand_more"}
                </span>
              </button>
              {showAdvanced && (
                <div className={styles.advancedBody}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>数据来源</span>
                    <span className={styles.fieldValue}>{kb.source}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>更新时间</span>
                    <span className={styles.fieldValue}>{kb.updatedAt}</span>
                  </div>
                  {ingredient.stdId && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>标准 ID</span>
                      <span className={styles.fieldValue}>{ingredient.stdId}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <p className={styles.oneLiner}>暂未找到该成分的完整资料。建议确认名称是否正确。</p>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>识别来源</span>
              <span className={styles.fieldValue}>{ingredient.source}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>置信度</span>
              <Chip confidence={ingredient.confidence} />
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
