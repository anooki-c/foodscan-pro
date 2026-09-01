// ============================================================
// 应用配置读取（后台可配置，持久化在 data/config.json）
//
// 后台管理页（/admin/ocr、/admin/ai）修改后立即生效：
//   GET /api/admin/config      —— 读取（脱敏）
//   PUT /api/admin/config      —— 保存
//
// 环境变量（.env.local）仅在无配置文件时作为首次默认值。
// ============================================================

import { loadConfig, type AppConfig } from "./config-store";

/** 读取当前生效配置（后台文件 > 环境变量默认值） */
export function getServerConfig(): AppConfig {
  return loadConfig();
}

/** 供 /api/config 暴露给前端的脱敏配置（不含密钥） */
export function getPublicConfig() {
  const cfg = loadConfig();
  return {
    offEnabled: cfg.offEnabled,
    ocrEnabled: cfg.ocr.enabled,
    ocrProvider: cfg.ocr.enabled ? cfg.ocr.provider : undefined,
    aiEnabled: cfg.ai.enabled,
    aiProvider: cfg.ai.enabled ? cfg.ai.provider : undefined,
    ocrConfidenceThreshold: cfg.ocr.confidenceThreshold,
  };
}

/** 脱敏 API Key：只保留末 4 位，其余打码 */
export function maskSecret(key: string): string {
  if (!key) return "";
  if (key.length <= 4) return "••••";
  return `••••••${key.slice(-4)}`;
}

/** 后台读取完整配置（密钥脱敏） */
export function getAdminConfig() {
  const cfg = loadConfig();
  return {
    ...cfg,
    ocr: { ...cfg.ocr, apiKey: maskSecret(cfg.ocr.apiKey) },
    ai: { ...cfg.ai, apiKey: maskSecret(cfg.ai.apiKey) },
  };
}
