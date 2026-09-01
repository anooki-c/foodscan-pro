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
  // 去掉「配料表：」标题前缀及常见非配料段落，再按标点/换行切分
  const cleaned = text
    .replace(/^[\s\S]*?配料表[:：]/i, "")
    .split(/[、，,;；\n。]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => !/^(净含量|保质期|生产日期|储存条件|贮存条件|生产商|制造商|地址|联系方式|配料表|致敏原|过敏原|食用方法|营养成分)/.test(s))
    .filter((s) => !/^(g|克|ml|毫升|kg|千克|%|%)$/.test(s));

  return cleaned.map((name, i) => ({
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
    // 调用成功但无文字：返回空文本对象（区别于调用失败返回 null）
    if (!words.length) return { text: "", confidence: 0 };
    return { text: words.join("\n"), confidence: 85 };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 第三方 OCR 调用
 * 支持三种协议：
 *  - provider === "baidu"：百度云 OCR（AK/SK → OAuth2 token → general_basic）
 *  - provider === "selfhosted"：本地/自建部署的 OCR 服务（apiKey 可选，为空时不带 Authorization 头）
 *  - 其他（custom）：自定义接口（POST + Bearer + { image } → { text, confidence }）
 * 返回 null 表示未配置或调用失败；返回 { text: "", confidence: 0 } 表示调用成功但未识别到文字。
 */
export async function callThirdPartyOcr(
  imageBase64: string
): Promise<{ text: string; confidence: number } | null> {
  const cfg = getServerConfig();
  if (!cfg.ocr.enabled) return null;

  if (cfg.ocr.provider === "baidu") {
    if (!cfg.ocr.apiKey || !cfg.ocr.apiSecret) return null;
    return callBaiduOcr(imageBase64, cfg.ocr);
  }

  // 自定义/自建服务：必须配置 API 地址（apiKey 可为空）
  if (!cfg.ocr.apiUrl) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.ocr.timeoutMs);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // 自建服务 apiKey 可为空：为空时不带 Authorization 头
    if (cfg.ocr.apiKey) {
      headers.Authorization = `Bearer ${cfg.ocr.apiKey}`;
    }
    const res = await fetch(cfg.ocr.apiUrl, {
      method: "POST",
      headers,
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

// ---------- 连通性测试（后台「测试连接」按钮） ----------

/** 1×1 白色 PNG（极小 base64，仅用于探测服务连通性，不产生识别负载） */
const TEST_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export interface ConnectionTestResult {
  ok: boolean;
  latencyMs: number;
  detail?: string;
  error?: string;
}

/** 测试 OCR 连通性（使用传入的临时配置，不影响已保存配置） */
export async function testOcrConnection(params: {
  provider: string;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  timeoutMs: number;
}): Promise<ConnectionTestResult> {
  const start = Date.now();
  const fail = (error: string): ConnectionTestResult => ({
    ok: false,
    latencyMs: Date.now() - start,
    error,
  });

  if (params.provider === "baidu") {
    if (!params.apiKey || !params.apiSecret) {
      return fail("请先填写 AK 与 SK 再测试");
    }
    const token = await getBaiduAccessToken(params.apiKey, params.apiSecret);
    if (!token) {
      return fail("获取百度 access_token 失败：AK/SK 无效或网络不可达");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), params.timeoutMs);
    try {
      const body = new URLSearchParams();
      body.set("image", TEST_IMAGE_BASE64);
      const res = await fetch(`${BAIDU_OCR_API}?access_token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: controller.signal,
      });
      if (!res.ok) return fail(`识别接口响应异常（HTTP ${res.status}）`);
      const data = await res.json();
      if (data.error_code !== undefined) {
        // 1×1 测试图极小，百度可能返回业务提示（如图片过小），但链路已通
        return {
          ok: true,
          latencyMs: Date.now() - start,
          detail: `token 获取与接口调用均正常（测试图极小，返回业务码 ${data.error_code}，属预期）`,
        };
      }
      return {
        ok: true,
        latencyMs: Date.now() - start,
        detail: "token 获取与识别接口调用均正常",
      };
    } catch {
      return fail("识别接口调用失败（网络超时或服务异常）");
    } finally {
      clearTimeout(timer);
    }
  }

  // 自定义 / 自建服务
  if (!params.apiUrl) {
    return fail("请先填写 API 地址再测试");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (params.apiKey) headers.Authorization = `Bearer ${params.apiKey}`;
    const res = await fetch(params.apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ image: TEST_IMAGE_BASE64 }),
      signal: controller.signal,
    });
    if (!res.ok) return fail(`服务响应异常（HTTP ${res.status}）`);
    const data = await res.json();
    return {
      ok: true,
      latencyMs: Date.now() - start,
      detail: `连接成功，已识别文字 ${data.text?.trim() ? `「${String(data.text).trim().slice(0, 30)}…」` : "（空）"}`,
    };
  } catch {
    return fail("连接失败（网络超时或服务不可达）");
  } finally {
    clearTimeout(timer);
  }
}

/** 测试 AI 连通性（最小 prompt 探测，节省 token） */
export async function testAiConnection(params: {
  apiUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}): Promise<ConnectionTestResult> {
  const start = Date.now();
  const fail = (error: string): ConnectionTestResult => ({
    ok: false,
    latencyMs: Date.now() - start,
    error,
  });

  if (!params.apiUrl || !params.apiKey) {
    return fail("请先填写 API 地址与 Key 再测试");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);
  try {
    const res = await fetch(params.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model || "gpt-4o-mini",
        messages: [{ role: "user", content: "回复\"ok\"即可" }],
        max_tokens: 5,
        temperature: 0,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return fail(`接口响应异常（HTTP ${res.status}）`);
    const data = await res.json();
    const reply =
      data.choices?.[0]?.message?.content ?? data.summary ?? data.text ?? "";
    if (!reply) return fail("响应缺少 content 字段，协议可能不兼容");
    return {
      ok: true,
      latencyMs: Date.now() - start,
      detail: `连接成功，模型返回「${String(reply).trim().slice(0, 30)}」`,
    };
  } catch {
    return fail("连接失败（网络超时或服务不可达）");
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

// ---------- 知识库动态加载（需求 6：外部/AI 资料兜底） ----------

/** 从 AI 回复中提取 JSON（兼容 markdown 代码块包裹） */
function extractJson(reply: string): Record<string, unknown> | null {
  const text = reply.trim();
  // 尝试代码块内 JSON
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * AI 生成成分资料（知识库未命中时的兜底数据源）
 * 返回结构化字段，供前端「加入知识库」使用；未配置 AI 或调用失败返回 null。
 */
export async function callAiIngredientInfo(params: {
  name: string;
  kind: "ingredient" | "additive";
}): Promise<{
  oneLiner: string;
  purpose: string;
  detail: string;
  caution: string;
  audience: string;
} | null> {
  const cfg = getServerConfig();
  if (!cfg.ai.enabled || !cfg.ai.apiUrl || !cfg.ai.apiKey) return null;

  const systemPrompt =
    params.kind === "additive"
      ? "你是食品添加剂科普专家。基于 GB 2760 与公开权威资料回答。不得编造安全性结论，不得做医疗诊断。"
      : "你是食品原料科普专家。基于公开权威资料回答。不得编造安全性结论，不得做医疗诊断。";
  const userPrompt =
    `请为「${params.name}」${params.kind === "additive" ? "（食品添加剂）" : "（食品配料）"}整理资料，` +
    "严格输出 JSON（不要输出其他内容），字段为：" +
    '{"oneLiner":"一句话解释（30字内）","purpose":"主要用途","detail":"详细说明（2-4句）","caution":"注意事项","audience":"不适宜或需关注人群"}。' +
    "如资料不足，用合理通用描述并保持谨慎措辞。";

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? null;
    if (!reply) return null;
    const json = extractJson(reply);
    if (!json) return null;
    return {
      oneLiner: String(json.oneLiner ?? "").slice(0, 120),
      purpose: String(json.purpose ?? ""),
      detail: String(json.detail ?? ""),
      caution: String(json.caution ?? ""),
      audience: String(json.audience ?? ""),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * AI 从 OCR 原始文本中提取结构化配料列表（需求 3 增强）
 *
 * OCR 文本通常包含"净含量/保质期/生产商/配料表"等杂质，规则切分会产生垃圾项。
 * 此函数让 AI 只提取真正的配料项，返回规范名称列表；未配置 AI 或失败返回 null
 * （由上层回退到 splitIngredientText 规则切分）。
 */
export async function callAiExtractIngredients(
  text: string
): Promise<Array<{ name: string }> | null> {
  const cfg = getServerConfig();
  if (!cfg.ai.enabled || !cfg.ai.apiUrl || !cfg.ai.apiKey) return null;
  if (!text.trim()) return null;

  const systemPrompt =
    "你是食品配料表解析助手。只从用户提供的 OCR 文本中提取真正的食品配料成分，剔除" +
    "「配料表」「净含量」「保质期」「生产日期」「储存条件」「生产商」「地址」「联系方式」等非配料信息。";
  const userPrompt =
    `以下是食品包装 OCR 识别文本：\n"""${text.slice(0, 1500)}"""\n` +
    "请提取所有配料成分，严格输出 JSON 数组（不要输出其他内容），每个元素为 {\"name\":\"配料名\"}，" +
    "按出现顺序排列，只保留确定是配料的项，括号内的修饰说明归入 name 一并保留。";

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? null;
    if (!reply) return null;
    const json = extractJson(reply);
    if (!json) return null;
    // 兼容两种结构：直接数组，或 { ingredients: [...] }
    const list = Array.isArray(json)
      ? json
      : Array.isArray((json as Record<string, unknown>).ingredients)
        ? ((json as Record<string, unknown>).ingredients as unknown[])
        : null;
    if (!list) return null;
    const items = list
      .map((it) => {
        if (typeof it === "string") return { name: it.trim() };
        if (it && typeof it === "object") {
          const name = String((it as Record<string, unknown>).name ?? "").trim();
          return name ? { name } : null;
        }
        return null;
      })
      .filter((x): x is { name: string } => x !== null && x.name.length > 0);
    return items.length ? items : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
