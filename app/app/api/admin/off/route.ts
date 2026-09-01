import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/server/config";
import { queryProductByBarcode } from "@/lib/server/off";
import { countOffCache, clearOffCache, lastOffFetch } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** 连通性探测用的已知条码（此前实测可命中 OFF） */
const PROBE_BARCODE = "0737628064502";

/**
 * /api/admin/off — OFF 数据源状态与更新
 *   GET                 → { enabled, apiUrl, cachedCount, lastFetchedAt }
 *   POST ?action=check  → 实时连通性探测（真实请求 OFF）
 *   POST ?action=update → 清空本地缓存（「立即强制更新」）
 */
export async function GET() {
  const cfg = getServerConfig();
  return NextResponse.json({
    enabled: cfg.offEnabled,
    apiUrl: process.env.OFF_API_URL ?? "https://world.openfoodfacts.org",
    cachedCount: countOffCache(),
    lastFetchedAt: lastOffFetch(),
  });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "check") {
    const cfg = getServerConfig();
    if (!cfg.offEnabled) {
      return NextResponse.json({
        ok: true,
        enabled: false,
        note: "OFF 数据源当前停用，请先在「食品数据源」页启用后再测试。",
      });
    }
    const started = Date.now();
    const found = await queryProductByBarcode(PROBE_BARCODE);
    return NextResponse.json({
      ok: true,
      enabled: true,
      reachable: !!found,
      latencyMs: Date.now() - started,
      probeBarcode: PROBE_BARCODE,
      probeName: found?.product.name ?? null,
      note: found
        ? `探测成功：${found.product.name}（${Date.now() - started}ms）`
        : "探测失败：OFF 未返回该条码或网络不可达，请检查 API 地址与网络。",
    });
  }

  if (action === "update") {
    const cleared = clearOffCache();
    return NextResponse.json({
      ok: true,
      cleared,
      note: cleared > 0
        ? `已清除 ${cleared} 条本地缓存，下次按条码查询将重新拉取 OFF。`
        : "当前无缓存，无需更新。",
    });
  }

  return NextResponse.json({ ok: false, error: "未知 action" }, { status: 400 });
}
