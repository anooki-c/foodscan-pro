import type { Ingredient, Product } from "@/lib/types";

/** 前端 API service 层：调用真实后端，失败时由页面回退 mock */

export interface BarcodeResult {
  found: boolean;
  product?: Product;
  ingredientText?: string;
  ingredients?: Ingredient[];
}

/** 条码查询（OFF） */
export async function fetchProductByBarcode(barcode: string): Promise<BarcodeResult> {
  try {
    const res = await fetch(`/api/product/${barcode}`);
    if (res.status === 404) return { found: false };
    if (!res.ok) return { found: false };
    return await res.json();
  } catch {
    return { found: false };
  }
}

/** OCR 识别图片（第三方优先；未配置/失败时返回明确错误信息） */
export interface OcrResult {
  ok: boolean;
  error?: string;
  code?: string;
  provider?: string;
  confidence?: number;
  ingredients?: Ingredient[];
}
export async function fetchOcr(image: string, mime = "jpeg"): Promise<OcrResult> {
  try {
    const res = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, mime }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "识别失败", code: data.code };
    }
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: "网络错误，请稍后重试" };
  }
}

/** AI 配料解读（失败返回 null，由调用方展示兜底） */
export async function fetchAiSummary(input: {
  productName: string;
  ingredients: string[];
  additiveTypes: string[];
  allergens: string[];
}): Promise<string | null> {
  try {
    const res = await fetch("/api/ai/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.summary ?? null;
  } catch {
    return null;
  }
}

/** 获取前端可见配置（条码入口显隐） */
export async function fetchPublicConfig(): Promise<{
  offEnabled: boolean;
  ocrEnabled: boolean;
  aiEnabled: boolean;
}> {
  try {
    const res = await fetch("/api/config");
    if (!res.ok) return { offEnabled: true, ocrEnabled: false, aiEnabled: false };
    return await res.json();
  } catch {
    return { offEnabled: true, ocrEnabled: false, aiEnabled: false };
  }
}

/** 知识库查询（API 优先，失败回退本地） */
export async function fetchKnowledge(
  q: string,
  type: "ingredient" | "additive" | "auto" = "auto"
): Promise<{ type: "ingredient" | "additive" | "none"; data: unknown } | null> {
  try {
    const res = await fetch(`/api/knowledge?q=${encodeURIComponent(q)}&type=${type}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---------- 知识库管理（后台 CRUD） ----------

export type KbKind = "ingredient" | "additive" | "allergen";

export interface KbItem {
  id: number;
  kind: KbKind;
  name: string;
  aliases: string[];
  category: string;
  ins_e: string;
  one_liner: string;
  purpose: string;
  extra: Record<string, unknown>;
  source: string;
  is_builtin: number;
  updated_at: string;
}

export async function fetchKbStats(): Promise<Record<KbKind, number>> {
  try {
    const res = await fetch("/api/knowledge?stats=1");
    if (!res.ok) return { ingredient: 0, additive: 0, allergen: 0 };
    const data = await res.json();
    return {
      ingredient: Number(data.ingredient ?? 0),
      additive: Number(data.additive ?? 0),
      allergen: Number(data.allergen ?? 0),
    };
  } catch {
    return { ingredient: 0, additive: 0, allergen: 0 };
  }
}

export async function fetchKbList(params: {
  kind: KbKind;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ kind: KbKind; total: number; page: number; pageSize: number; items: KbItem[] } | null> {
  try {
    const qs = new URLSearchParams({
      list: "1",
      kind: params.kind,
      search: params.search ?? "",
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 10),
    });
    const res = await fetch(`/api/knowledge?${qs}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchKbItem(id: number): Promise<KbItem | null> {
  try {
    const res = await fetch(`/api/knowledge?id=${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.item ?? null;
  } catch {
    return null;
  }
}

export async function createKbItem(input: Record<string, unknown>): Promise<{ ok: boolean; error?: string; id?: number }> {
  try {
    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return await res.json();
  } catch {
    return { ok: false, error: "网络错误" };
  }
}

export async function updateKbItem(id: number, input: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/knowledge?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return await res.json();
  } catch {
    return { ok: false, error: "网络错误" };
  }
}

export async function deleteKbItem(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
    return await res.json();
  } catch {
    return { ok: false, error: "网络错误" };
  }
}

export async function reseedKnowledge(): Promise<{ ok: boolean; counts?: Record<string, number>; error?: string }> {
  try {
    const res = await fetch("/api/knowledge?action=reseed", { method: "POST" });
    return await res.json();
  } catch {
    return { ok: false, error: "网络错误" };
  }
}

// ---------- 扫描历史 ----------

export async function fetchScanRecords(limit = 10): Promise<{ total: number; items: Array<Record<string, unknown>> }> {
  try {
    const res = await fetch(`/api/scan?limit=${limit}`);
    if (!res.ok) return { total: 0, items: [] };
    return await res.json();
  } catch {
    return { total: 0, items: [] };
  }
}

export async function saveScanRecord(input: {
  analysisId: string;
  productName?: string;
  barcode?: string;
  dataSource?: string;
  ingredientCount?: number;
  snapshot?: unknown;
}): Promise<{ ok: boolean; saved?: boolean }> {
  try {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return await res.json();
  } catch {
    return { ok: false };
  }
}

// ---------- OFF 数据源（后台） ----------

export async function fetchOffStats(): Promise<{
  enabled: boolean;
  apiUrl: string;
  cachedCount: number;
  lastFetchedAt: number | null;
}> {
  try {
    const res = await fetch("/api/admin/off");
    if (!res.ok) return { enabled: false, apiUrl: "", cachedCount: 0, lastFetchedAt: null };
    return await res.json();
  } catch {
    return { enabled: false, apiUrl: "", cachedCount: 0, lastFetchedAt: null };
  }
}

export async function checkOffConnection(): Promise<{
  ok: boolean;
  enabled?: boolean;
  reachable?: boolean;
  latencyMs?: number;
  probeName?: string | null;
  note?: string;
  error?: string;
}> {
  try {
    const res = await fetch("/api/admin/off?action=check", { method: "POST" });
    return await res.json();
  } catch {
    return { ok: false, error: "网络错误" };
  }
}

export async function forceOffUpdate(): Promise<{
  ok: boolean;
  cleared?: number;
  note?: string;
  error?: string;
}> {
  try {
    const res = await fetch("/api/admin/off?action=update", { method: "POST" });
    return await res.json();
  } catch {
    return { ok: false, error: "网络错误" };
  }
}

/** 后台：读取完整配置（密钥脱敏） */
export async function fetchAdminConfig(): Promise<{
  offEnabled: boolean;
  ocr: { provider: string; apiUrl: string; apiKey: string; apiSecret: string; enabled: boolean; timeoutMs: number; confidenceThreshold: number };
  ai: { provider: string; apiUrl: string; apiKey: string; model: string; enabled: boolean; timeoutMs: number };
} | null> {
  try {
    const res = await fetch("/api/admin/config");
    if (!res.ok) return null;
    const data = await res.json();
    return data.config ?? null;
  } catch {
    return null;
  }
}

/** 后台：保存配置（部分字段更新） */
export async function saveAdminConfig(patch: {
  offEnabled?: boolean;
  ocr?: Partial<{ provider: string; apiUrl: string; apiKey: string; apiSecret: string; enabled: boolean; timeoutMs: number; confidenceThreshold: number }>;
  ai?: Partial<{ provider: string; apiUrl: string; apiKey: string; model: string; enabled: boolean; timeoutMs: number }>;
}): Promise<{ ok: boolean; error?: string; config?: unknown }> {
  try {
    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return await res.json();
  } catch {
    return { ok: false, error: "网络错误" };
  }
}
