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

/** OCR 识别图片（第三方优先，本地兜底） */
export async function fetchOcr(image: string, mime = "jpeg") {
  try {
    const res = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, mime }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
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
