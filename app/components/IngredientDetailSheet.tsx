"use client";

import { useEffect, useState } from "react";
import BottomSheet from "./BottomSheet";
import Button from "./Button";
import Chip from "./Chip";
import { getIngredientKnowledge } from "@/lib/knowledge";
import { fetchKnowledge, fetchKnowledgeSuggest, upsertKbItem } from "@/lib/services/api";
import type { Ingredient, IngredientCategory } from "@/lib/types";
import styles from "./DetailSheets.module.css";

interface IngredientDetailSheetProps {
  open: boolean;
  ingredient: Ingredient | null;
  /** 在配料表中的位置（从 1 开始） */
  position: number;
  onClose: () => void;
  /** 点击「修改配料」时的回调（由父组件负责跳转确认页并自动进入编辑态） */
  onEditFix?: (ing: Ingredient) => void;
}

interface KbData {
  name: string;
  category: IngredientCategory;
  oneLiner: string;
  processingNature?: string;
  purpose: string;
  detail?: string;
  allergens?: string[];
  caution?: string;
  audience?: string;
  source: string;
  updatedAt: string;
}

/** 配料详情 BottomSheet（PRD §12） */
export default function IngredientDetailSheet({
  open,
  ingredient,
  position,
  onClose,
  onEditFix,
}: IngredientDetailSheetProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [kb, setKb] = useState<KbData | null>(null);
  // 动态加载（需求 6）：suggest 建议 + 入库状态
  const [suggest, setSuggest] = useState<Awaited<ReturnType<typeof fetchKnowledgeSuggest>> | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // API 优先查询知识库，失败回退本地 mock
  useEffect(() => {
    setKb(null);
    setSuggest(null);
    setSaveMsg("");
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

  /** 搜索外部/AI 资料（需求 6） */
  const handleSuggest = async () => {
    setSuggesting(true);
    setSuggest(null);
    const res = await fetchKnowledgeSuggest(ingredient.finalText, "ingredient");
    setSuggest(res);
    setSuggesting(false);
  };

  /** 一键加入知识库/更新（来源标注后由用户决定，自动刷新详情） */
  const handleSaveToKb = async () => {
    if (!suggest?.data) return;
    setSaving(true);
    setSaveMsg("");
    const d = suggest.data;
    const res = await upsertKbItem({
      kind: "ingredient",
      name: d.name,
      aliases: [],
      category: "other",
      one_liner: d.oneLiner,
      purpose: d.purpose,
      extra: {
        detail: d.detail,
        caution: d.caution,
        audience: d.audience,
      },
      source: suggest.source === "wikipedia" ? `Wikipedia 中文（${suggest.via}）` : `AI 生成（${suggest.via}）`,
    });
    setSaving(false);
    if (res.ok) {
      setSaveMsg(res.updated ? "已更新知识库" : "已加入知识库");
      // 自动刷新为知识库命中态
      const fresh = await fetchKnowledge(d.name, "ingredient");
      if (fresh?.type === "ingredient") setKb(fresh.data as KbData);
      setSuggest(null);
    } else {
      setSaveMsg(`保存失败：${res.error ?? "未知错误"}`);
    }
  };

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
              if (onEditFix) {
                // 与「编辑配料表」逻辑一致：父组件关闭弹窗并跳转确认页自动进入编辑态
                onEditFix(ingredient);
              } else {
                // 兜底：无回调时保持旧行为（父组件应传入 onEditFix）
                onClose();
                window.location.href = `/confirm?source=manual&fix=${encodeURIComponent(ingredient.finalText)}`;
              }
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

            {/* 第二层补充：注意事项 + 不适宜人群 */}
            {(kb.caution || kb.audience) && (
              <div className={styles.detailBlock}>
                <h4>注意事项 / 不适宜人群</h4>
                {kb.caution && (
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>注意事项</span>
                    <span className={styles.fieldValue}>{kb.caution}</span>
                  </div>
                )}
                {kb.audience && (
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>不适宜人群</span>
                    <span className={styles.fieldValue}>{kb.audience}</span>
                  </div>
                )}
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

            {/* 动态加载外部/AI 资料（需求 6） */}
            {!suggest && !suggesting && (
              <button className={styles.suggestBtn} onClick={handleSuggest}>
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>travel_explore</span>
                搜索外部资料（Wikipedia / AI）
              </button>
            )}
            {suggesting && (
              <p className={styles.suggestLoading}>
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>progress_activity</span>
                正在检索资料…
              </p>
            )}

            {suggest && suggest.ok && suggest.data && (
              <div className={styles.suggestCard}>
                <div className={styles.suggestHead}>
                  <span>资料建议</span>
                  <span className={`${styles.sourceTag} ${suggest.source === "wikipedia" ? styles.sourceWiki : styles.sourceAi}`}>
                    {suggest.source === "wikipedia" ? "Wikipedia 中文" : "AI 生成"}
                  </span>
                </div>
                <p className={styles.suggestLine}>{suggest.data.oneLiner}</p>
                {suggest.data.purpose && (
                  <p className={styles.suggestLine}><b>用途：</b>{suggest.data.purpose}</p>
                )}
                {suggest.data.detail && (
                  <p className={styles.suggestLine}><b>详情：</b>{suggest.data.detail}</p>
                )}
                {suggest.data.caution && (
                  <p className={styles.suggestLine}><b>注意事项：</b>{suggest.data.caution}</p>
                )}
                {suggest.data.audience && (
                  <p className={styles.suggestLine}><b>不适宜人群：</b>{suggest.data.audience}</p>
                )}
                <div className={styles.suggestActions}>
                  <span className={styles.suggestVia}>
                    {suggest.source === "ai" ? "AI 生成内容仅供参考，请人工核对后使用" : `来源：${suggest.via}`}
                  </span>
                  <button className={styles.suggestSaveBtn} onClick={handleSaveToKb} disabled={saving}>
                    {saving ? "保存中…" : "加入知识库"}
                  </button>
                </div>
                {saveMsg && <p className={styles.suggestMsg}>{saveMsg}</p>}
              </div>
            )}

            {suggest && !suggest.ok && (
              <p className={styles.suggestError}>{suggest.error ?? "检索失败，请稍后重试"}</p>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
