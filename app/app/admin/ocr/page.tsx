"use client";

import { useEffect, useState } from "react";
import { fetchAdminConfig, saveAdminConfig } from "@/lib/services/api";
import styles from "../pages.module.css";

interface OcrForm {
  enabled: boolean;
  provider: string;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  timeoutMs: number;
  confidenceThreshold: number;
}

/** 预置服务商模板 */
const OCR_PRESETS: Record<
  string,
  { label: string; apiUrl: string; needSecret: boolean; tip?: string }
> = {
  baidu: {
    label: "百度云 OCR",
    apiUrl: "https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic",
    needSecret: true,
    tip: "AK（API Key）与 SK（Secret Key）在百度智能云控制台「安全认证」中创建，通用文字识别（标准版）每月 1000 次免费额度。",
  },
  custom: {
    label: "自定义",
    apiUrl: "",
    needSecret: false,
    tip: "自定义接口需符合协议：POST 请求，Bearer 鉴权，请求体 { image: base64 }，返回 { text, confidence }。",
  },
};

const EMPTY: OcrForm = {
  enabled: false,
  provider: "custom",
  apiUrl: "",
  apiKey: "",
  apiSecret: "",
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
          // 归一化：旧配置/默认值不在预设表中一律视为自定义
          provider: OCR_PRESETS[cfg.ocr.provider] ? cfg.ocr.provider : "custom",
          apiUrl: cfg.ocr.apiUrl,
          apiKey: cfg.ocr.apiKey, // 脱敏值（•••• 结尾）
          apiSecret: cfg.ocr.apiSecret, // 脱敏值（•••• 结尾）
          timeoutMs: cfg.ocr.timeoutMs,
          confidenceThreshold: cfg.ocr.confidenceThreshold,
        });
      }
      setLoaded(true);
    })();
  }, []);

  const set = <K extends keyof OcrForm>(key: K, value: OcrForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  /** 切换服务商：自动填充 apiUrl，保留已填的 Key */
  const handleProviderChange = (provider: string) => {
    const preset = OCR_PRESETS[provider];
    setForm((f) => ({
      ...f,
      provider,
      apiUrl: preset ? preset.apiUrl : f.apiUrl,
    }));
  };

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
        apiSecret:
          form.apiSecret && !form.apiSecret.includes("•")
            ? form.apiSecret
            : undefined,
        timeoutMs: Number(form.timeoutMs),
        confidenceThreshold: Number(form.confidenceThreshold),
      },
    });
    setSaving(false);
    if (res.ok) {
      setMsg("已保存，配置立即生效");
      // 回读最新脱敏值
      const cfg = await fetchAdminConfig();
      if (cfg)
        setForm((f) => ({
          ...f,
          apiKey: cfg.ocr.apiKey,
          apiSecret: cfg.ocr.apiSecret,
        }));
    } else {
      setMsg(`保存失败：${res.error ?? "未知错误"}`);
    }
  };

  const preset = OCR_PRESETS[form.provider] ?? OCR_PRESETS.custom;

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
            <select
              value={form.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              disabled={!loaded}
            >
              <option value="baidu">百度云 OCR</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>API 地址</label>
            <input
              value={form.apiUrl}
              onChange={(e) => set("apiUrl", e.target.value)}
              placeholder={
                form.provider === "baidu"
                  ? "https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic"
                  : "https://your-ocr-provider.example.com/v1/recognize"
              }
              disabled={form.provider === "baidu"}
            />
          </div>
          <div className={styles.field}>
            <label>API Key（AK）{form.apiKey && form.apiKey.includes("•") ? "（已配置，输入新值可更换）" : ""}</label>
            <input
              value={form.apiKey}
              onChange={(e) => set("apiKey", e.target.value)}
              placeholder={form.provider === "baidu" ? "百度云 API Key（AK）" : "输入 API Key"}
              type="password"
            />
          </div>
          {preset.needSecret && (
            <div className={styles.field}>
              <label>Secret Key（SK）{form.apiSecret && form.apiSecret.includes("•") ? "（已配置，输入新值可更换）" : ""}</label>
              <input
                value={form.apiSecret}
                onChange={(e) => set("apiSecret", e.target.value)}
                placeholder="百度云 Secret Key（SK）"
                type="password"
              />
            </div>
          )}
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

        <p className={styles.sub}>{preset.tip}</p>

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
