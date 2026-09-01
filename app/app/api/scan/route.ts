import { NextResponse } from "next/server";
import {
  saveScanRecord,
  listScanRecords,
  countScanRecords,
  deleteScanRecord,
} from "@/lib/server/db";

export const dynamic = "force-dynamic";

/**
 * /api/scan — 扫描历史持久化
 *   GET  ?limit=10   → { total, items:[...] }
 *   POST             → { ok, saved }（analysis_id 唯一，重复上报自动忽略）
 *   DELETE ?id=1     → { ok }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 10);
  const items = listScanRecords(limit).map((r) => ({
    id: r.id,
    analysisId: r.analysis_id,
    productName: r.product_name,
    barcode: r.barcode,
    dataSource: r.data_source,
    ingredientCount: r.ingredient_count,
    createdAt: r.created_at,
  }));
  return NextResponse.json({ total: countScanRecords(), items });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const analysisId = typeof body.analysisId === "string" ? body.analysisId.trim() : "";
  if (!analysisId) {
    return NextResponse.json({ ok: false, error: "缺少 analysisId" }, { status: 400 });
  }
  const { saved } = saveScanRecord({
    analysis_id: analysisId,
    product_name: typeof body.productName === "string" ? body.productName : "",
    barcode: typeof body.barcode === "string" ? body.barcode : "",
    data_source: typeof body.dataSource === "string" ? body.dataSource : "",
    ingredient_count: Number(body.ingredientCount ?? 0),
    snapshot: body.snapshot ?? {},
  });
  return NextResponse.json({ ok: true, saved });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "缺少 id" }, { status: 400 });
  const deleted = deleteScanRecord(id);
  if (!deleted) return NextResponse.json({ ok: false, error: "记录不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
