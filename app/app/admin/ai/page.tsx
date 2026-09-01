"use client";

import { useEffect, useState } from "react";
import { fetchAdminConfig, saveAdminConfig } from "@/lib/services/api";
import styles from "../pages.module.css";

interface AiForm {
  enabled: boolean;
  provider: string;
  apiUrl: string;
  apiKey: string;
  timeoutMs: number;
}

const EMPTY: AiForm = {
  enabled: false,
  provider: "",
  apiUrl: "",
  apiKey: "",
  timeoutMs: 15000,
};

export default function AiPage() {
  const [form, setForm] = useState<AiForm>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const cfg = await fetchAdminConfig();
      if (cfg) {
        setForm({
          enabled: cfg.ai.enabled,
          provider: cfg.ai.provider,
          apiUrl: cfg.ai.apiUrl,
          apiKey: cfg.ai.apiKey,
          timeoutMs: cfg.ai.timeoutMs,
        });
      }
      setLoaded(true);
    })();
  }, []);

  const set = <K extends keyof AiForm>(key: K, value: AiForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    const res = await saveAdminConfig({
      ai: {
        enabled: form.enabled,
        provider: form.provider,
        apiUrl: form.apiUrl,
        apiKey: form.apiKey && !form.apiKey.includes("•") ? form.apiKey : undefined,
        timeoutMs: Number(form.timeoutMs),
      },
    });
    setSaving(false);
    if (res.ok) {
      setMsg("已保存，配置立即生效");
      const cfg = await fetchAdminConfig();
      if (cfg) setForm((f) => ({ ...f, apiKey: cfg.ai.apiKey }));
    } else {
      setMsg(`保存失败：${res.error ?? "未知错误"}`);
    }
  };

  return (
    <div>
      <div className={styles.pageTitle}>
        <h1>AI 配置</h1>
        <p>配置保存在服务器 data/config.json，立即生效，无需重启。关闭时配料解读回退 mock 文案。</p>
      </div>

      <div className={styles.card}>
        <div className={styles.statusRow} style={{ marginBottom: 16 }}>
          <label className={styles.switchRow}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => set("enabled", e.target.checked)}
              disabled={!loaded}
            />
            <span>启用 AI 配料解读</span>
          </label>
          <span className={`${styles.tag} ${form.enabled ? styles.tagOn : styles.tagOff}`}>
            {form.enabled ? "启用中" : "关闭（回退 mock）"}
          </span>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>Provider</label>
            <input
              value={form.provider}
              onChange={(e) => set("provider", e.target.value)}
              placeholder="openai-compatible"
            />
          </div>
          <div className={styles.field}>
            <label>API 地址</label>
            <input
              value={form.apiUrl}
              onChange={(e) => set("apiUrl", e.target.value)}
              placeholder="https://api.example.com/v1/chat/completions"
            />
          </div>
          <div className={styles.field}>
            <label>API Key {form.apiKey && form.apiKey.includes("•") ? "（已配置，输入新值可更换）" : ""}</label>
            <input
              value={form.apiKey}
              onChange={(e) => set("apiKey", e.target.value)}
              placeholder="输入 API Key"
              type="password"
            />
          </div>
          <div className={styles.field}>
            <label>超时时间（ms）</label>
            <input
              type="number"
              value={form.timeoutMs}
              onChange={(e) => set("timeoutMs", Number(e.target.value))}
            />
          </div>
        </div>

        {msg && <p className={`${styles.formMsg} ${msg.startsWith("保存失败") ? styles.formErr : ""}`}>{msg}</p>}

        <div className={styles.statusRow}>
          <button className={styles.btnPrimary} onClick={handleSave} disabled={saving || !loaded}>
            {saving ? "保存中…" : "保存配置"}
          </button>
          <button
            className={styles.btnSm}
            onClick={() => setForm(EMPTY)}
            disabled={!loaded}
          >
            重置
          </button>
        </div>

        <p className={styles.sub}>
          约束：仅基于用户确认配料进行通俗解释；禁止编造成分、添加剂信息与安全性；禁止医疗诊断；不判断食品一定健康或有害。
        </p>
      </div>
    </div>
  );
}
