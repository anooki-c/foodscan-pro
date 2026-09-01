"use client";

import { useEffect, useState } from "react";
import { fetchAdminConfig, saveAdminConfig } from "@/lib/services/api";
import styles from "../pages.module.css";

interface AiForm {
  enabled: boolean;
  provider: string;
  apiUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

interface AiPreset {
  label: string;
  apiUrl: string;
  models: string[];
  modelLabels?: Record<string, string>;
  tip?: string;
}

/** 预置 AI 服务商模板（OpenAI 兼容协议） */
const AI_PRESETS: Record<string, AiPreset> = {
  siliconflow: {
    label: "硅基流动（SiliconFlow）",
    apiUrl: "https://api.siliconflow.cn/v1/chat/completions",
    models: [
      "deepseek-ai/DeepSeek-V4-Flash",
      "deepseek-ai/DeepSeek-V3",
      "Qwen/Qwen3-8B",
      "Qwen/Qwen2.5-72B-Instruct",
    ],
    modelLabels: {
      "deepseek-ai/DeepSeek-V4-Flash": "DeepSeek-V4-Flash（免费·推荐）",
      "deepseek-ai/DeepSeek-V3": "DeepSeek-V3",
      "Qwen/Qwen3-8B": "Qwen3-8B（免费）",
      "Qwen/Qwen2.5-72B-Instruct": "Qwen2.5-72B-Instruct",
    },
    tip: "API Key 在 siliconflow.cn 控制台「API 密钥」创建；免费额度模型（V4-Flash / Qwen3-8B）可直接使用。",
  },
  deepseek: {
    label: "DeepSeek 官方",
    apiUrl: "https://api.deepseek.com/v1/chat/completions",
    models: ["deepseek-chat", "deepseek-reasoner"],
    modelLabels: {
      "deepseek-chat": "deepseek-chat（V3）",
      "deepseek-reasoner": "deepseek-reasoner（R1 推理）",
    },
    tip: "API Key 在 platform.deepseek.com 控制台创建；deepseek-chat 为通用对话，deepseek-reasoner 为深度推理。",
  },
  openai: {
    label: "OpenAI",
    apiUrl: "https://api.openai.com/v1/chat/completions",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
    modelLabels: {
      "gpt-4o-mini": "gpt-4o-mini（轻量）",
      "gpt-4o": "gpt-4o",
      "gpt-4.1-mini": "gpt-4.1-mini",
    },
    tip: "API Key 在 platform.openai.com 创建；国内访问需自行处理网络可达性。",
  },
  custom: {
    label: "自定义",
    apiUrl: "",
    models: [],
    tip: "自定义接口需为 OpenAI 兼容的 chat/completions 协议，模型名手动填写。",
  },
};

const EMPTY: AiForm = {
  enabled: false,
  provider: "custom",
  apiUrl: "",
  apiKey: "",
  model: "",
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
          // 归一化：旧配置/默认值可能是 "none" 或任意值，不在预设表中一律视为自定义
          provider: AI_PRESETS[cfg.ai.provider] ? cfg.ai.provider : "custom",
          apiUrl: cfg.ai.apiUrl,
          apiKey: cfg.ai.apiKey,
          model: cfg.ai.model,
          timeoutMs: cfg.ai.timeoutMs,
        });
      }
      setLoaded(true);
    })();
  }, []);

  const set = <K extends keyof AiForm>(key: K, value: AiForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  /** 切换服务商：自动填 apiUrl；若当前模型不在该服务商列表则回填默认模型 */
  const handleProviderChange = (provider: string) => {
    const preset = AI_PRESETS[provider];
    if (!preset) return;
    setForm((f) => {
      const modelValid = preset.models.length === 0 || preset.models.includes(f.model);
      return {
        ...f,
        provider,
        apiUrl: preset.apiUrl,
        model: modelValid ? f.model : preset.models[0] ?? "",
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    const res = await saveAdminConfig({
      ai: {
        enabled: form.enabled,
        provider: form.provider,
        apiUrl: form.apiUrl,
        apiKey: form.apiKey && !form.apiKey.includes("•") ? form.apiKey : undefined,
        model: form.model,
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

  const preset = AI_PRESETS[form.provider] ?? AI_PRESETS.custom;

  return (
    <div>
      <div className={styles.pageTitle}>
        <h1>AI 配置</h1>
        <p>
          配置保存在服务器 data/config.json，立即生效，无需重启。关闭时配料解读回退兜底文案。所有接口均为 OpenAI 兼容的 chat/completions 协议。
        </p>
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
            <label>服务商</label>
            <select
              value={form.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              disabled={!loaded}
            >
              <option value="siliconflow">硅基流动（SiliconFlow）</option>
              <option value="deepseek">DeepSeek 官方</option>
              <option value="openai">OpenAI</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>API 地址</label>
            <input
              value={form.apiUrl}
              onChange={(e) => set("apiUrl", e.target.value)}
              placeholder="https://api.example.com/v1/chat/completions"
              disabled={form.provider !== "custom"}
            />
          </div>
          <div className={styles.field}>
            <label>模型</label>
            {preset.models.length > 0 ? (
              <select
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
              >
                {preset.models.map((m) => (
                  <option key={m} value={m}>
                    {preset.modelLabels?.[m] ?? m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="gpt-4o-mini / deepseek-chat 等"
              />
            )}
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

        <p className={styles.sub}>
          约束：仅基于用户确认配料进行通俗解释；禁止编造成分、添加剂信息与安全性；禁止医疗诊断；不判断食品一定健康或有害。
        </p>
      </div>
    </div>
  );
}
