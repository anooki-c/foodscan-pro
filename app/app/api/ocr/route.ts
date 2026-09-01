import { NextResponse } from "next/server";
import { callThirdPartyOcr, splitIngredientText } from "@/lib/server/off";
import { getServerConfig } from "@/lib/server/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/ocr
 * body: { image: base64, mime?: "jpeg"|"png"|"webp" }
 * 优先级：第三方 OCR → 明确报错（不再用写死的模拟文本冒充识别结果）
 * 未配置第三方 OCR 时返回 503 + code=OCR_NOT_CONFIGURED，由前端引导用户配置或走手动输入。
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

  // 第三方 OCR（未启用/无 key/调用失败时返回 null）
  const third = await callThirdPartyOcr(image);
  if (third && third.text) {
    const ingredients = await splitIngredientText(third.text);
    // OCR 识别结果需要人工核对
    ingredients.forEach((i) => {
      i.needsConfirm = true;
      i.confidence = third.confidence >= 70 ? "medium" : "low";
    });
    return NextResponse.json({
      ok: true,
      provider: cfg.ocr.provider,
      confidence: third.confidence,
      usedProviders: [cfg.ocr.provider],
      ingredients,
    });
  }

  // 未配置/识别失败 → 明确提示，绝不返回伪造结果
  const configured = cfg.ocr.enabled && cfg.ocr.apiUrl && cfg.ocr.apiKey;
  return NextResponse.json(
    {
      ok: false,
      error: configured
        ? "第三方 OCR 识别失败，请检查服务地址与密钥，或换一张更清晰的图片"
        : "未配置 OCR 服务",
      code: configured ? "OCR_CALL_FAILED" : "OCR_NOT_CONFIGURED",
      hint: "请到后台 /admin/ocr 配置，或在前端改用手动输入配料",
    },
    { status: 503 }
  );
}
