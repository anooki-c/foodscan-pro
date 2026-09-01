"use client";

import { useEffect, useState } from "react";
import AppBar from "@/components/AppBar";
import Button from "@/components/Button";
import TabBar from "@/components/TabBar";
import { ALLERGEN_OPTIONS } from "@/lib/mock-data";
import { toast } from "@/components/toast";
import styles from "./page.module.css";

const STORAGE_KEY = "allergen_focus";
const DEFAULT_ALLERGENS = ["花生/坚果", "乳"];

function loadAllergens(): string[] {
  if (typeof window === "undefined") return DEFAULT_ALLERGENS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // 忽略损坏数据，回退默认
  }
  return DEFAULT_ALLERGENS;
}

export default function SettingsPage() {
  // 初始统一默认值（SSR 与客户端一致，避免 hydration mismatch）；
  // hydrate 后仅读取一次 localStorage 中用户保存的选择
  const [selected, setSelected] = useState<string[]>(DEFAULT_ALLERGENS);

  useEffect(() => {
    setSelected(loadAllergens());
  }, []);

  // 写入内联在用户操作中：点击即落盘，不依赖 effect 时序，
  // 彻底消除「读取覆盖写入」的竞态窗口
  const toggle = (key: string) => {
    setSelected((s) => {
      const next = s.includes(key) ? s.filter((x) => x !== key) : [...s, key];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 隐私模式下写入失败可忽略
      }
      return next;
    });
  };

  return (
    <div className={styles.page}>
      <AppBar title="我的" />

      <main className={styles.scroll}>
        <div className={styles.tipCard}>
          <span className="material-symbols-rounded" style={{ fontSize: 22, color: "var(--color-primary)" }}>
            info
          </span>
          <div>
            <h3>过敏原关注项</h3>
            <p>勾选后，分析结果页会优先提示含这些成分的配料。设置仅保存在本机。本工具不构成医疗建议，请以食品包装上的过敏原声明为准。</p>
          </div>
        </div>

        <a className={styles.adminCard} href="/admin">
          <div className={styles.adminIcon}>
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
              admin_panel_settings
            </span>
          </div>
          <div className={styles.adminInfo}>
            <div className={styles.adminTitle}>后台管理</div>
            <div className={styles.adminSub}>数据源 / OCR / AI / 知识库 / 系统状态</div>
          </div>
          <span
            className="material-symbols-rounded"
            style={{ fontSize: 20, color: "var(--color-text-tertiary)" }}
          >
            chevron_right
          </span>
        </a>

        <div className={styles.group}>
          {ALLERGEN_OPTIONS.map((opt) => (
            <div
              key={opt.key}
              className={`${styles.option} ${selected.includes(opt.key) ? styles.on : ""}`}
              onClick={() => toggle(opt.key)}
            >
              <div className={styles.label}>
                <span className={styles.emoji}>{opt.emoji}</span>
                <div>
                  <div className={styles.name}>{opt.label}</div>
                  <div className={styles.sub}>{opt.sub}</div>
                </div>
              </div>
              <div className={styles.switch} />
            </div>
          ))}
        </div>

        <div className={styles.version}>
          <span>食品配料分析 · V1.0.0</span>
        </div>
      </main>

      <div className={styles.bottomBar}>
        <Button fullWidth onClick={() => toast("过敏原设置已保存到本机")}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>check</span>
          完成
        </Button>
      </div>

      <TabBar />
    </div>
  );
}
