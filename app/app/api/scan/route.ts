import { NextResponse } from "next/server";
import {
  saveScanRecord,
  listScanRecords,
  listScanRecordsWithSnapshot,
  countScanRecords,
  deleteScanRecord,
  deleteScanRecordByAnalysisId,
} from "@/lib/server/db";

export const dynamic = "force-dynamic";

/**
 * /api/scan — 分析历史持久化（跨端同步）
 *   GET  ?limit=10       → { total, items:[摘要] }
 *   GET  ?full=1         → { items:[{ analysisId, snapshot(完整 AnalysisResult), createdAt }] }（同步用）
 *   POST                 → { ok, saved }（analysis_id 唯一，重复上报自动忽略）
 *   DELETE ?analysisId=x → { ok }（按分析 id 删除，跨端同步）
 *   DELETE ?id=N         → { ok }（按记录 id 删除）
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("full") === "1") {
    const items = listScanRecordsWithSnapshot().map((r) => {
      let snapshot: unknown = {};
      try {
        snapshot = JSON.parse(String(r.snapshot ?? "{}"));
      } catch {
        snapshot = {};
      }
      return {
        analysisId: r.analysis_id,
        snapshot,
        createdAt: r.created_at,
      };
    });
    return NextResponse.json({ items });
  }
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
  const analysisId = searchParams.get("analysisId");
  if (analysisId) {
    const deleted = deleteScanRecordByAnalysisId(analysisId.trim());
    if (!deleted) return NextResponse.json({ ok: false, error: "记录不存在" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "缺少 id" }, { status: 400 });
  const deleted = deleteScanRecord(id);
  if (!deleted) return NextResponse.json({ ok: false, error: "记录不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
