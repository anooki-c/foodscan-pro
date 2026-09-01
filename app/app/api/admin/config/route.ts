import { NextResponse } from "next/server";
import { getAdminConfig } from "@/lib/server/config";
import { loadConfig, saveConfig } from "@/lib/server/config-store";

export const dynamic = "force-dynamic";

/** GET /api/admin/config —— 读取当前配置（密钥脱敏） */
export async function GET() {
  return NextResponse.json({ config: getAdminConfig() });
}

/** PUT /api/admin/config —— 更新配置（支持部分字段） */
export async function PUT(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const current = loadConfig();
  const patch = (body ?? {}) as {
    offEnabled?: boolean;
    ocr?: Partial<typeof current.ocr>;
    ai?: Partial<typeof current.ai>;
  };

  const next: typeof current = {
    offEnabled: patch.offEnabled ?? current.offEnabled,
    ocr: {
      provider: patch.ocr?.provider ?? current.ocr.provider,
      apiUrl: patch.ocr?.apiUrl ?? current.ocr.apiUrl,
      // 密钥保护：前端回传的是脱敏值（含 •），不能覆盖真实 key；
      // 仅当用户提交了非脱敏的新 key 时才更新
      apiKey:
        patch.ocr?.apiKey && !patch.ocr.apiKey.includes("•")
          ? patch.ocr.apiKey
          : current.ocr.apiKey,
      enabled: patch.ocr?.enabled ?? current.ocr.enabled,
      timeoutMs: patch.ocr?.timeoutMs ?? current.ocr.timeoutMs,
      confidenceThreshold: patch.ocr?.confidenceThreshold ?? current.ocr.confidenceThreshold,
    },
    ai: {
      provider: patch.ai?.provider ?? current.ai.provider,
      apiUrl: patch.ai?.apiUrl ?? current.ai.apiUrl,
      apiKey:
        patch.ai?.apiKey && !patch.ai.apiKey.includes("•")
          ? patch.ai.apiKey
          : current.ai.apiKey,
      enabled: patch.ai?.enabled ?? current.ai.enabled,
      timeoutMs: patch.ai?.timeoutMs ?? current.ai.timeoutMs,
    },
  };

  try {
    saveConfig(next);
  } catch (e) {
    return NextResponse.json(
      { error: `保存失败：${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, config: getAdminConfig() });
}
