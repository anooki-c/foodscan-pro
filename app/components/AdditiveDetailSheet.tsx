"use client";

import { useEffect, useState } from "react";
import BottomSheet from "./BottomSheet";
import Button from "./Button";
import Chip from "./Chip";
import { getAdditiveKnowledge } from "@/lib/knowledge";
import { fetchKnowledge } from "@/lib/services/api";
import type { Ingredient } from "@/lib/types";
import styles from "./DetailSheets.module.css";

interface AdditiveDetailSheetProps {
  open: boolean;
  additive: Ingredient | null;
  /** 在原配料表中的位置 */
  position: number;
  onClose: () => void;
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
}: AdditiveDetailSheetProps) {
  const [showThird, setShowThird] = useState(false);
  const [kb, setKb] = useState<KbData | null>(null);

  // API 优先查询，失败回退本地 mock
  useEffect(() => {
    setKb(null);
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
          </>
        )}
      </div>
    </BottomSheet>
  );
}
