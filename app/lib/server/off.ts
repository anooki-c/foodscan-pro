import { getServerConfig } from "./config";
import { getOffCache, setOffCache } from "./db";
import type { AppConfig } from "./config-store";
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
 * 支持两种协议：
 *  - provider === "baidu"：百度云 OCR 通用文字识别（AK/SK → OAuth2 token → general_basic）
 *  - 其他：自定义 OpenAI 风格接口（POST { apiUrl } + Bearer + { image }，解析 { text, confidence }）
 * 未配置时返回 null → 由上层回退到本地拆分。
 */

/** 百度云 OCR 域名与接口 */
const BAIDU_OCR_TOKEN_URL = "https://aip.baidubce.com/oauth/2.0/token";
const BAIDU_OCR_API = "https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic";
/** 百度 access_token 有效期 30 天，提前 1 天过期刷新 */
const BAIDU_TOKEN_TTL_MS = 29 * 24 * 60 * 60 * 1000;

/** 进程内缓存百度 access_token（重启后重新获取，无需落盘） */
let baiduTokenCache: { token: string; expiresAt: number } | null = null;

async function getBaiduAccessToken(
  apiKey: string,
  apiSecret: string
): Promise<string | null> {
  if (baiduTokenCache && Date.now() < baiduTokenCache.expiresAt) {
    return baiduTokenCache.token;
  }
  try {
    const url = `${BAIDU_OCR_TOKEN_URL}?grant_type=client_credentials&client_id=${encodeURIComponent(
      apiKey
    )}&client_secret=${encodeURIComponent(apiSecret)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access_token) return null;
    baiduTokenCache = {
      token: data.access_token as string,
      expiresAt: Date.now() + BAIDU_TOKEN_TTL_MS,
    };
    return baiduTokenCache.token;
  } catch {
    return null;
  }
}

/** 百度云 OCR 分支：general_basic 表单请求 → words_result 拼接 */
async function callBaiduOcr(
  imageBase64: string,
  cfg: AppConfig["ocr"]
): Promise<{ text: string; confidence: number } | null> {
  const token = await getBaiduAccessToken(cfg.apiKey, cfg.apiSecret);
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const body = new URLSearchParams();
    body.set("image", imageBase64);
    const res = await fetch(`${BAIDU_OCR_API}?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error_code !== undefined) return null; // 业务错误码（如 token 过期）
    const words: string[] = (data.words_result ?? []).map(
      (item: { words?: string }) => item.words ?? ""
    );
    if (!words.length) return null;
    return { text: words.join("\n"), confidence: 85 };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function callThirdPartyOcr(
  imageBase64: string
): Promise<{ text: string; confidence: number } | null> {
  const cfg = getServerConfig();
  if (!cfg.ocr.enabled || !cfg.ocr.apiKey) return null;

  if (cfg.ocr.provider === "baidu") {
    return callBaiduOcr(imageBase64, cfg.ocr);
  }

  // 自定义协议：必须配置 API 地址
  if (!cfg.ocr.apiUrl) return null;
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
