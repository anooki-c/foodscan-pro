import { NextResponse } from "next/server";
import { callAiSummary } from "@/lib/server/off";
import { getServerConfig } from "@/lib/server/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/summary
 * body: { productName, ingredients[], additiveTypes[], allergens[] }
 * AI 未配置时回退到 mock 文案（保证功能可用，PRD §18 AI 失败不阻塞）
 */
export async function POST(req: Request) {
  const cfg = getServerConfig();
  let body: {
    productName?: string;
    ingredients?: string[];
    additiveTypes?: string[];
    allergens?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const input = {
    productName: body.productName ?? "该食品",
    ingredients: body.ingredients ?? [],
    additiveTypes: body.additiveTypes ?? [],
    allergens: body.allergens ?? [],
  };

  const summary = await callAiSummary(input);

  if (!summary) {
    // AI 未启用/失败 → 回退中性 mock
    return NextResponse.json({
      summary:
        `这款食品主要由${input.ingredients.slice(0, 3).join("、") || "多种配料"}组成` +
        (input.additiveTypes.length
          ? `，另外添加了${input.additiveTypes.join("、")}等食品添加剂。`
          : "。") +
        (input.allergens.length
          ? `配料中发现${input.allergens.join("、")}相关成分，相关人群需要留意。`
          : "") +
        "配料表本身无法判断实际摄入量及整体营养价值，建议结合营养成分表综合判断。",
      usedProvider: "mock-fallback",
      providerEnabled: cfg.ai.enabled,
    });
  }

  return NextResponse.json({
    summary,
    usedProvider: cfg.ai.provider,
    providerEnabled: true,
  });
}
