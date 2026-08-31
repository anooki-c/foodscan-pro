import { NextResponse } from "next/server";
import { callThirdPartyOcr, splitIngredientText } from "@/lib/server/off";
import { getServerConfig } from "@/lib/server/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/ocr
 * body: { image: base64, mime?: "jpeg"|"png"|"webp" }
 * 优先级（PRD §7.3）：第三方 OCR → 本地拆分兜底
 * 真实场景：图片上传后可做方向校正/压缩后传给第三方。
 */
export async function POST(req: Request) {
  const cfg = getServerConfig();
  let body: { image?: string; mime?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const { image } = body;
  if (!image) {
    return NextResponse.json({ error: "缺少图片" }, { status: 400 });
  }

  const usedProvider: string[] = [];

  // 1. 第三方 OCR（未启用/无 key 时返回 null）
  const third = await callThirdPartyOcr(image);
  if (third && third.text) {
    usedProvider.push(cfg.ocr.provider);
    const ingredients = await splitIngredientText(third.text);
    return NextResponse.json({
      provider: cfg.ocr.provider,
      confidence: third.confidence,
      usedProviders: usedProvider,
      ingredients,
    });
  }

  // 2. 兜底：未配置第三方 → 本地模拟识别（示意）
  usedProvider.push("local-fallback");
  const ingredients = await splitIngredientText("小麦粉、白砂糖、食用植物油、乳粉、山梨酸钾");
  return NextResponse.json({
    provider: "local-fallback",
    confidence: 75,
    usedProviders: usedProvider,
    ingredients,
  });
}
