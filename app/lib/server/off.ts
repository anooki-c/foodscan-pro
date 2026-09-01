import { getServerConfig } from "./config";
import { getOffCache, setOffCache } from "./db";
import type { Ingredient, Product } from "../types";

/**
 * Open Food Facts 客户端（V1 默认数据源，PRD §6.4）
 * 官方公开 API：https://world.openfoodfacts.org/api/v2/product/{barcode}.json
 */

/** OFF 查询结果本地缓存 TTL：1 小时（SQLite off_cache 表，后台可一键清除） */
const OFF_CACHE_TTL_MS = 60 * 60 * 1000;

interface OffProductResponse {
  status: number;
  code?: string;
  product?: {
    product_name?: string;
    brands?: string;
    quantity?: string;
    ingredients_text_zh?: string;
    ingredients_text?: string;
    allergens?: string;
    additives_tags?: string[];
    nutriments?: Record<string, unknown>;
  };
}

const OFF_API = process.env.OFF_API_URL ?? "https://world.openfoodfacts.org";

/** 按条码查询产品，返回标准化 Product + 原始配料文本（SQLite 缓存 1 小时） */
export async function queryProductByBarcode(
  barcode: string
): Promise<{ product: Product; ingredientText: string } | null> {
  const cfg = getServerConfig();
  if (!cfg.offEnabled) return null;

  // 本地缓存命中（1 小时 TTL，未命中结果同样缓存，避免重复打 OFF）
  const cached = getOffCache(barcode);
  if (cached && Date.now() - cached.fetched_at < OFF_CACHE_TTL_MS) {
    return cached.payload as { product: Product; ingredientText: string } | null;
  }

  const res = await fetch(`${OFF_API}/api/v2/product/${barcode}.json`);
  if (!res.ok) return null;
  const data: OffProductResponse = await res.json();
  if (data.status !== 1 || !data.product) {
    setOffCache(barcode, null);
    return null;
  }

  const p = data.product;
  const ingredientText =
    p.ingredients_text_zh ?? p.ingredients_text ?? "";

  const payload: { product: Product; ingredientText: string } = {
    product: {
      id: `off-${data.code ?? barcode}`,
      name: p.product_name || `产品 ${barcode}`,
      brand: p.brands,
      spec: p.quantity,
      barcode: data.code ?? barcode,
      dataSource: "Open Food Facts",
      updatedAt: new Date().toLocaleDateString("zh-CN"),
    },
    ingredientText,
  };
  setOffCache(barcode, payload);
  return payload;
}

/** 简易本地 OCR 兜底：从文本拆分配料（真实接入时替换为第三方 OCR API） */
export async function splitIngredientText(text: string): Promise<Ingredient[]> {
  const parts = text
    .split(/[、，,;；\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return parts.map((name, i) => ({
    id: `ocr-${Date.now()}-${i}`,
    originalText: name,
    finalText: name,
    originalPos: i + 1,
    finalPos: i + 1,
    source: "ocr",
    confidence: "high",
    isManual: false,
  }));
}

/**
 * 第三方 OCR 调用（PRD §7.4）
 * 未配置时返回 null → 由上层回退到本地拆分。
 */
export async function callThirdPartyOcr(
  imageBase64: string
): Promise<{ text: string; confidence: number } | null> {
  const cfg = getServerConfig();
  if (!cfg.ocr.enabled || !cfg.ocr.apiUrl || !cfg.ocr.apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.ocr.timeoutMs);
  try {
    const res = await fetch(cfg.ocr.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.ocr.apiKey}`,
      },
      body: JSON.stringify({ image: imageBase64 }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    // 约定：第三方返回 { text, confidence }
    return { text: data.text ?? "", confidence: data.confidence ?? 0 };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * AI 配料解读（PRD §14）
 * 未配置时返回 null → 前端展示兜底文案。
 * 按 OpenAI 兼容 chat/completions 协议调用（后台 /admin/ai 的 API 地址示例即 /v1/chat/completions）。
 */
export async function callAiSummary(input: {
  productName: string;
  ingredients: string[];
  additiveTypes: string[];
  allergens: string[];
}): Promise<string | null> {
  const cfg = getServerConfig();
  if (!cfg.ai.enabled || !cfg.ai.apiUrl || !cfg.ai.apiKey) return null;

  const userPrompt = [
    `食品名称：${input.productName}`,
    `配料（按包装顺序）：${input.ingredients.join("、") || "无"}`,
    input.additiveTypes.length
      ? `添加剂类型：${input.additiveTypes.join("、")}`
      : "",
    input.allergens.length ? `潜在过敏原：${input.allergens.join("、")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.ai.timeoutMs);
  try {
    const res = await fetch(cfg.ai.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.ai.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: NEUTRAL_INSTRUCTIONS },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    // OpenAI chat/completions 标准响应；兼容自定义网关的 summary / text 字段
    return (
      data.choices?.[0]?.message?.content ??
      data.summary ??
      data.text ??
      null
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** AI 提示词中性约束（PRD §14.3） */
const NEUTRAL_INSTRUCTIONS = [
  "你是一名食品配料解说员。",
  "只基于用户确认的配料与知识库事实进行通俗解释。",
  "不得自行修改配料、编造成分、编造添加剂信息、编造安全性。",
  "不得做医疗诊断。",
  "不得判断食品一定健康或一定有害。",
  "资料不足时必须说明暂未找到完整资料。",
  "以中文输出，150 字以内。",
].join(" ");
