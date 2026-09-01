"use client";

import { useEffect, useState } from "react";
import { fetchAdminConfig, saveAdminConfig } from "@/lib/services/api";
import styles from "../pages.module.css";

interface OcrForm {
  enabled: boolean;
  provider: string;
  apiUrl: string;
  apiKey: string;
  timeoutMs: number;
  confidenceThreshold: number;
}

const EMPTY: OcrForm = {
  enabled: false,
  provider: "",
  apiUrl: "",
  apiKey: "",
  timeoutMs: 10000,
  confidenceThreshold: 80,
};

export default function OcrPage() {
  const [form, setForm] = useState<OcrForm>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const cfg = await fetchAdminConfig();
      if (cfg) {
        setForm({
          enabled: cfg.ocr.enabled,
          provider: cfg.ocr.provider,
          apiUrl: cfg.ocr.apiUrl,
          apiKey: cfg.ocr.apiKey, // 脱敏值（•••• 结尾）
          timeoutMs: cfg.ocr.timeoutMs,
          confidenceThreshold: cfg.ocr.confidenceThreshold,
        });
      }
      setLoaded(true);
    })();
  }, []);

  const set = <K extends keyof OcrForm>(key: K, value: OcrForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    const res = await saveAdminConfig({
      ocr: {
        enabled: form.enabled,
        provider: form.provider,
        apiUrl: form.apiUrl,
        // 仅在用户输入了新 key（非脱敏值）时更新
        apiKey: form.apiKey && !form.apiKey.includes("•") ? form.apiKey : undefined,
        timeoutMs: Number(form.timeoutMs),
        confidenceThreshold: Number(form.confidenceThreshold),
      },
    });
    setSaving(false);
    if (res.ok) {
      setMsg("已保存，配置立即生效");
      // 回读最新脱敏值
      const cfg = await fetchAdminConfig();
      if (cfg) setForm((f) => ({ ...f, apiKey: cfg.ocr.apiKey }));
    } else {
      setMsg(`保存失败：${res.error ?? "未知错误"}`);
    }
  };

  return (
    <div>
      <div className={styles.pageTitle}>
        <h1>OCR 配置</h1>
        <p>优先级：第三方 OCR → 本地 OCR。配置保存在服务器 data/config.json，立即生效，无需重启。</p>
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
            <span>启用第三方 OCR</span>
          </label>
          <span className={`${styles.tag} ${form.enabled ? styles.tagOn : styles.tagOff}`}>
            {form.enabled ? "启用中" : "停用（回退本地模拟）"}
          </span>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>服务商</label>
            <input
              value={form.provider}
              onChange={(e) => set("provider", e.target.value)}
              placeholder="provider-a"
            />
          </div>
          <div className={styles.field}>
            <label>API 地址</label>
            <input
              value={form.apiUrl}
              onChange={(e) => set("apiUrl", e.target.value)}
              placeholder="https://your-ocr-provider.example.com/v1/recognize"
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
          <div className={styles.field}>
            <label>置信度阈值（%）</label>
            <input
              type="number"
              value={form.confidenceThreshold}
              onChange={(e) => set("confidenceThreshold", Number(e.target.value))}
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

        <p className={styles.sub}>本地 OCR（PaddleOCR）为内置兜底，始终可用，无需配置。</p>
      </div>
    </div>
  );
}
