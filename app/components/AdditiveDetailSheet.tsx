"use client";

import { useEffect, useState } from "react";
import BottomSheet from "./BottomSheet";
import Button from "./Button";
import Chip from "./Chip";
import { getAdditiveKnowledge } from "@/lib/knowledge";
import { fetchKnowledge, fetchKnowledgeSuggest, upsertKbItem } from "@/lib/services/api";
import type { Ingredient } from "@/lib/types";
import styles from "./DetailSheets.module.css";

interface AdditiveDetailSheetProps {
  open: boolean;
  additive: Ingredient | null;
  /** 在原配料表中的位置 */
  position: number;
  onClose: () => void;
  /** 点击「修改配料」时的回调（由父组件负责跳转确认页并自动进入编辑态） */
  onEditFix?: (ing: Ingredient) => void;
}

interface KbData {
  name: string;
  insE: string;
  type: string;
  oneLiner: string;
  purpose: string;
  commonUses: string;
  whyAdded?: string;
  safetyNote: string;
  caution: string;
  audience: string;
  usageScope?: string;
  source: string;
  updatedAt: string;
}

/** 添加剂详情 BottomSheet（PRD §10.3 三层结构） */
export default function AdditiveDetailSheet({
  open,
  additive,
  position,
  onClose,
  onEditFix,
}: AdditiveDetailSheetProps) {
  const [showThird, setShowThird] = useState(false);
  const [kb, setKb] = useState<KbData | null>(null);
  // 动态加载（需求 6）：suggest 建议 + 入库状态
  const [suggest, setSuggest] = useState<Awaited<ReturnType<typeof fetchKnowledgeSuggest>> | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // API 优先查询，失败回退本地 mock
  useEffect(() => {
    setKb(null);
    setSuggest(null);
    setSaveMsg("");
    if (!open || !additive) return;
    let cancelled = false;
    (async () => {
      const res = await fetchKnowledge(additive.finalText, "additive");
      if (cancelled) return;
      if (res?.type === "additive") {
        setKb(res.data as KbData);
      } else {
        const local = getAdditiveKnowledge(additive.finalText);
        if (local) setKb(local as unknown as KbData);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, additive]);

  if (!additive) return null;

  /** 搜索外部/AI 资料（需求 6） */
  const handleSuggest = async () => {
    setSuggesting(true);
    setSuggest(null);
    const res = await fetchKnowledgeSuggest(additive.finalText, "additive");
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
      kind: "additive",
      name: d.name,
      aliases: [],
      category: "",
      ins_e: "",
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
      const fresh = await fetchKnowledge(d.name, "additive");
      if (fresh?.type === "additive") setKb(fresh.data as KbData);
      setSuggest(null);
    } else {
      setSaveMsg(`保存失败：${res.error ?? "未知错误"}`);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={additive.finalText}
      sub={
        <div className={styles.titleRow}>
          <Chip variant="role">{kb?.type ?? additive.additiveType ?? "添加剂"}</Chip>
          {kb?.insE && <Chip variant="plain">{kb.insE}</Chip>}
          <Chip variant="plain">配料表位置 · 第 {position} 项</Chip>
        </div>
      }
      footer={
        <div className={styles.footerInner}>
          <Button variant="ghost" size="md" onClick={onClose}>
            关闭
          </Button>
          {onEditFix && (
            <Button
              variant="primary"
              size="md"
              style={{ flex: 1 }}
              onClick={() => onEditFix(additive)}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>edit_note</span>
              发现识别错误？修改配料
            </Button>
          )}
        </div>
      }
    >
      <div className={styles.body}>
        {kb ? (
          <>
            {/* 第一层：一句话解释 + 用途 */}
            <p className={styles.oneLiner}>{kb.oneLiner}</p>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>主要用途</span>
              <span className={styles.fieldValue}>{kb.purpose}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>常见应用</span>
              <span className={styles.fieldValue}>{kb.commonUses}</span>
            </div>

            {/* 第二层：为什么添加 + 安全性 + 注意事项 + 关注人群 */}
            <div className={styles.detailBlock}>
              <h4>为什么添加</h4>
              <p>{kb.whyAdded ?? kb.purpose}</p>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>安全性说明</span>
              <span className={styles.fieldValue}>{kb.safetyNote}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>注意事项</span>
              <span className={styles.fieldValue}>{kb.caution}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>关注人群</span>
              <span className={styles.fieldValue}>{kb.audience}</span>
            </div>

            {/* 第三层：标准信息（可折叠） */}
            <div className={styles.advanced}>
              <button className={styles.advancedToggle} onClick={() => setShowThird((v) => !v)}>
                <span>标准名称 / INS / 使用范围</span>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                  {showThird ? "expand_less" : "expand_more"}
                </span>
              </button>
              {showThird && (
                <div className={styles.advancedBody}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>标准名称</span>
                    <span className={styles.fieldValue}>{kb.name}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>INS / E 编号</span>
                    <span className={styles.fieldValue}>{kb.insE}</span>
                  </div>
                  {kb.usageScope && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>使用范围</span>
                      <span className={styles.fieldValue}>{kb.usageScope}</span>
                    </div>
                  )}
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>数据来源</span>
                    <span className={styles.fieldValue}>{kb.source}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>更新时间</span>
                    <span className={styles.fieldValue}>{kb.updatedAt}</span>
                  </div>
                </div>
              )}
            </div>

            <p className={styles.disclaimer}>
              以上信息为知识库的说明性内容，用于帮助理解。不构成医疗、营养或食品安全专业建议。
            </p>
          </>
        ) : (
          <>
            <p className={styles.oneLiner}>暂未找到该成分的完整资料。建议确认名称是否正确。</p>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>类型</span>
              <span className={styles.fieldValue}>{additive.additiveType ?? "添加剂"}</span>
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
