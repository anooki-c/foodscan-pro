// ============================================================
// 应用配置持久化（后台可配置）
//
// 优先级：data/config.json（后台修改） > 环境变量（仅首次默认值）
// 文件位置：process.env.CONFIG_FILE || <cwd>/data/config.json
//   - 本地开发：app/data/config.json
//   - Docker：挂载卷 /app/data/config.json（compose 已挂 foodscan_data）
// ============================================================

import fs from "fs";
import path from "path";

export interface AppConfig {
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
    model: string;
    enabled: boolean;
    timeoutMs: number;
  };
}

/** 环境变量初始默认值（首次启动无配置文件时使用） */
export function envDefaults(): AppConfig {
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
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      enabled: (process.env.AI_ENABLED ?? "false") === "true",
      timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 15000),
    },
  };
}

function configPath(): string {
  return process.env.CONFIG_FILE || path.join(process.cwd(), "data", "config.json");
}

/** 读取配置（不存在文件时回退环境变量默认值） */
export function loadConfig(): AppConfig {
  const defaults = envDefaults();
  let saved: Partial<AppConfig> = {};
  try {
    const raw = fs.readFileSync(configPath(), "utf-8");
    saved = JSON.parse(raw);
  } catch {
    // 文件不存在或损坏 → 使用默认值
  }
  return {
    offEnabled: saved.offEnabled ?? defaults.offEnabled,
    ocr: {
      provider: saved.ocr?.provider ?? defaults.ocr.provider,
      apiUrl: saved.ocr?.apiUrl ?? defaults.ocr.apiUrl,
      apiKey: saved.ocr?.apiKey ?? defaults.ocr.apiKey,
      enabled: saved.ocr?.enabled ?? defaults.ocr.enabled,
      timeoutMs: saved.ocr?.timeoutMs ?? defaults.ocr.timeoutMs,
      confidenceThreshold: saved.ocr?.confidenceThreshold ?? defaults.ocr.confidenceThreshold,
    },
    ai: {
      provider: saved.ai?.provider ?? defaults.ai.provider,
      apiUrl: saved.ai?.apiUrl ?? defaults.ai.apiUrl,
      apiKey: saved.ai?.apiKey ?? defaults.ai.apiKey,
      model: saved.ai?.model ?? defaults.ai.model,
      enabled: saved.ai?.enabled ?? defaults.ai.enabled,
      timeoutMs: saved.ai?.timeoutMs ?? defaults.ai.timeoutMs,
    },
  };
}

/** 保存配置（自动建目录） */
export function saveConfig(cfg: AppConfig): void {
  const dir = path.dirname(configPath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), "utf-8");
}

/** 是否已有持久化配置 */
export function hasConfigFile(): boolean {
  return fs.existsSync(configPath());
}
