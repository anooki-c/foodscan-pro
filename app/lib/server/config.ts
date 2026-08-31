// ============================================================
// 环境配置（.env.local）：
//   OFF_ENABLED=true/false          —— 是否启用 OFF 数据源（PRD §5.2 数据库未开启时隐藏条码入口）
//   OCR_PROVIDER=provider-a         —— 第三方 OCR 服务商
//   OCR_API_URL=...                 —— 第三方 OCR API 地址
//   OCR_API_KEY=...                 —— API Key
//   OCR_TIMEOUT_MS=10000
//   OCR_CONFIDENCE_THRESHOLD=80
//   AI_PROVIDER=...                 —— AI Provider
//   AI_API_URL=...                  —— AI API 地址
//   AI_API_KEY=...
// ============================================================

export interface EnvConfig {
  /** 食品数据库数据源是否启用 */
  offEnabled: boolean;
  /** OCR 配置 */
  ocr: {
    provider: string;
    apiUrl: string;
    apiKey: string;
    enabled: boolean;
    timeoutMs: number;
    confidenceThreshold: number;
  };
  /** AI 配置 */
  ai: {
    provider: string;
    apiUrl: string;
    apiKey: string;
    enabled: boolean;
    timeoutMs: number;
  };
}

/** 读取服务端环境配置（所有 key 均从环境变量读取，无则回退默认） */
export function getServerConfig(): EnvConfig {
  return {
    offEnabled: (process.env.OFF_ENABLED ?? "true") !== "false",
    ocr: {
      provider: process.env.OCR_PROVIDER ?? "none",
      apiUrl: process.env.OCR_API_URL ?? "",
      apiKey: process.env.OCR_API_KEY ?? "",
      enabled: (process.env.OCR_ENABLED ?? "false") === "true",
      timeoutMs: Number(process.env.OCR_TIMEOUT_MS ?? 10000),
      confidenceThreshold: Number(process.env.OCR_CONFIDENCE_THRESHOLD ?? 80),
    },
    ai: {
      provider: process.env.AI_PROVIDER ?? "none",
      apiUrl: process.env.AI_API_URL ?? "",
      apiKey: process.env.AI_API_KEY ?? "",
      enabled: (process.env.AI_ENABLED ?? "false") === "true",
      timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 15000),
    },
  };
}

/** 供 /api/config 暴露给前端的脱敏配置（不含密钥） */
export function getPublicConfig() {
  const cfg = getServerConfig();
  return {
    offEnabled: cfg.offEnabled,
    ocrEnabled: cfg.ocr.enabled,
    ocrProvider: cfg.ocr.enabled ? cfg.ocr.provider : undefined,
    aiEnabled: cfg.ai.enabled,
    aiProvider: cfg.ai.enabled ? cfg.ai.provider : undefined,
    ocrConfidenceThreshold: cfg.ocr.confidenceThreshold,
  };
}
