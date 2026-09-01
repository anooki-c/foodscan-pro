"use client";

import { useState } from "react";
import Link from "next/link";
import AppBar from "@/components/AppBar";
import TabBar from "@/components/TabBar";
import Chip from "@/components/Chip";
import GlassCard from "@/components/GlassCard";
import { useAnalysisStore } from "@/store/analysis";
import styles from "./page.module.css";

const ENTRIES = [
  {
    key: "scan",
    icon: "qr_code_scanner",
    title: "扫描条形码",
    desc: "数据库直接查询",
    href: "/scan",
  },
  {
    key: "camera",
    icon: "photo_camera",
    title: "拍摄配料表",
    desc: "拍照自动识别",
    href: "/scan/photo",
  },
  {
    key: "upload",
    icon: "upload_file",
    title: "上传图片",
    desc: "JPG / PNG / WEBP",
    href: "/scan/photo",
  },
  {
    key: "text",
    icon: "edit_note",
    title: "输入文字",
    desc: "粘贴或手动输入",
    href: "/confirm?source=manual",
  },
] as const;

const THUMB_GRADIENTS: Record<string, string> = {
  "p-oat-milk": "linear-gradient(135deg, #A5D6A7 0%, #66BB6A 100%)",
  "p-energy": "linear-gradient(135deg, #F48FB1 0%, #EC407A 100%)",
};

const ENTRY_TABS = [
  { key: "all", label: "全部入口" },
  { key: "camera", label: "📷 拍照" },
  { key: "text", label: "⌨️ 文字" },
  { key: "scan", label: "🔍 条码" },
  { key: "upload", label: "📁 上传" },
];

export default function HomePage() {
  const history = useAnalysisStore((s) => s.history);
  const [entryTab, setEntryTab] = useState<string>("all");

  const visibleEntries =
    entryTab === "all" ? ENTRIES : ENTRIES.filter((e) => e.key === entryTab);

  const handleEntry = (href: string) => {
    // 各入口自行准备草稿（扫描/拍摄/手动），此处仅跳转
    window.location.href = href;
  };

  return (
    <div className={styles.page}>
      <AppBar
        right={
          <Link href="/settings" className={styles.bell} aria-label="过敏原关注项">
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
              shield
            </span>
          </Link>
        }
      />

      <main className={styles.scroll}>
        <section className={styles.hero}>
          <h1>
            看懂食品里
            <br />
            到底有什么
          </h1>
          <p>成分类型、添加剂用途、潜在过敏原。帮助理解配料信息，不评判好坏。</p>
        </section>

        {/* 入口筛选 */}
        <div className={styles.filterTabs}>
          {ENTRY_TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.filterTab} ${entryTab === t.key ? styles.active : ""}`}
              onClick={() => setEntryTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 入口卡 2×2 */}
        <div className={styles.entries}>
          {visibleEntries.map((e) => (
            <button key={e.key} className={styles.entryCard} onClick={() => handleEntry(e.href)}>
              <span className={styles.entryIcon}>
                <span className="material-symbols-rounded">{e.icon}</span>
              </span>
              <span className={styles.entryTitle}>{e.title}</span>
              <span className={styles.entryDesc}>{e.desc}</span>
            </button>
          ))}
        </div>

        {/* 最近分析 */}
        <div className={styles.sectionHead}>
          <h2>最近分析</h2>
          <Link href="/history" className={styles.more}>
            查看全部 →
          </Link>
        </div>

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
                    <span className={styles.historyTime}>{h.ingredients.length} 项 · 刚刚</span>
                    <div className={styles.historyChips}>
                      <Chip category="natural">{h.ingredients.filter((i) => i.category === "natural").length} 项</Chip>
                      {h.ingredients.some((i) => i.category === "processed") && (
                        <Chip category="processed">
                          {h.ingredients.filter((i) => i.category === "processed").length} 项
                        </Chip>
                      )}
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
              <button
                className={styles.playBtn}
                onClick={() => {
                  useAnalysisStore.getState().toggleCompare(h.id);
                  window.location.href = "/compare";
                }}
                aria-label="加入对比"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                  compare_arrows
                </span>
              </button>
            </GlassCard>
          ))}
        </div>

        {/* 隐私卡 */}
        <div className={styles.insightCard}>
          <span className={styles.insightBadge}>我们不评判好坏</span>
          <h3>理解配料 · 不评价食品</h3>
          <p>本工具用于帮助理解配料信息，不构成医疗、营养或食品安全专业建议。请以食品包装上的过敏原声明及权威信息为准。</p>
          <span className={`${styles.star} material-symbols-rounded`}>auto_awesome</span>
        </div>
      </main>

      <button className={styles.fab} onClick={() => (window.location.href = "/scan")} aria-label="扫描条码">
        <span className="material-symbols-rounded" style={{ fontSize: 26 }}>
          qr_code_scanner
        </span>
      </button>

      <TabBar />
    </div>
  );
}
