"use client";

import { useState } from "react";
import AppBar from "@/components/AppBar";
import Button from "@/components/Button";
import TabBar from "@/components/TabBar";
import { ALLERGEN_OPTIONS } from "@/lib/mock-data";
import styles from "./page.module.css";

export default function SettingsPage() {
  const [selected, setSelected] = useState<string[]>(["花生/坚果", "乳"]);

  const toggle = (key: string) => {
    setSelected((s) =>
      s.includes(key) ? s.filter((x) => x !== key) : [...s, key]
    );
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
        <Button fullWidth onClick={() => alert("设置已保存到本机")}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>check</span>
          完成
        </Button>
      </div>

      <TabBar />
    </div>
  );
}
