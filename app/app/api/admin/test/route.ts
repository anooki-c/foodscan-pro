import { NextResponse } from "next/server";
import { testOcrConnection, testAiConnection } from "@/lib/server/off";
import { loadConfig } from "@/lib/server/config-store";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/test —— 连通性测试（后台「测试连接」按钮）
 *
 * body（OCR）：
 *   { kind: "ocr", provider, apiUrl, apiKey, apiSecret, timeoutMs }
 * body（AI）：
 *   { kind: "ai", apiUrl, apiKey, model, timeoutMs }
 *
 * 使用传入的临时配置探测，不修改已保存配置；OCR 用 1×1 极小图、AI 用最小 prompt，节省资源。
 * 密钥规则：未传 key 或传回脱敏值（含 •）时，回退读取已保存配置的真实 key。
 * 返回 { ok, latencyMs, detail?, error? }
 */
export async function POST(req: Request) {
  let body: {
    kind?: string;
    provider?: string;
    apiUrl?: string;
    apiKey?: string;
    apiSecret?: string;
    model?: string;
    timeoutMs?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const saved = loadConfig();

  if (body.kind === "ocr") {
    const isMasked =
      body.apiKey !== undefined && body.apiKey.includes("•");
    const ocrKey = isMasked || !body.apiKey ? saved.ocr.apiKey : body.apiKey;
    const ocrSecret =
      body.apiSecret && !body.apiSecret.includes("•")
        ? body.apiSecret
        : saved.ocr.apiSecret;
    const result = await testOcrConnection({
      provider: body.provider ?? saved.ocr.provider,
      apiUrl: body.apiUrl || saved.ocr.apiUrl,
      apiKey: ocrKey,
      apiSecret: ocrSecret,
      timeoutMs: Number(body.timeoutMs ?? saved.ocr.timeoutMs ?? 10000),
    });
    return NextResponse.json(result);
  }

  if (body.kind === "ai") {
    const isMasked = body.apiKey !== undefined && body.apiKey.includes("•");
    const aiKey = isMasked || !body.apiKey ? saved.ai.apiKey : body.apiKey;
    const result = await testAiConnection({
      apiUrl: body.apiUrl || saved.ai.apiUrl,
      apiKey: aiKey,
      model: body.model || saved.ai.model,
      timeoutMs: Number(body.timeoutMs ?? saved.ai.timeoutMs ?? 15000),
    });
    return NextResponse.json(result);
  }

  return NextResponse.json({ ok: false, error: "缺少 kind（ocr / ai）" }, { status: 400 });
}
