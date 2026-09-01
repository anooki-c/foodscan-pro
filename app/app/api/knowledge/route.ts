import { NextResponse } from "next/server";
import {
  lookupKnowledge,
  listKb,
  countKb,
  getKbById,
  createKb,
  updateKb,
  deleteKb,
  upsertKb,
  reseedBuiltin,
  type KbKind,
  type KbInput,
} from "@/lib/server/db";
import type { IngredientKnowledge, AdditiveKnowledge } from "@/lib/knowledge";

export const dynamic = "force-dynamic";

/**
 * /api/knowledge
 *
 * 公共查询（结果页详情弹窗用，保持原 JSON 版响应结构）：
 *   GET ?q=山梨酸钾&type=additive   → { type, data } | { type:"none", data:null }
 *
 * 后台管理：
 *   GET ?list=1&kind=ingredient|additive|allergen&search=&page=&pageSize=
 *       → { kind, total, page, pageSize, items:[KbRow] }
 *   GET ?stats=1                     → { ingredient, additive, allergen } 计数
 *   GET ?id=1                        → { item: KbRow }
 *   POST                             → { ok, id } | { ok:false, error }  （新增）
 *   PUT  ?id=1                       → { ok }     | { ok:false, error }  （更新）
 *   DELETE ?id=1                     → { ok }
 *   POST ?action=reseed              → { ok, counts }                    （恢复内置数据）
 */

const KINDS: KbKind[] = ["ingredient", "additive", "allergen"];

function isKind(v: string | null): v is KbKind {
  return v !== null && (KINDS as string[]).includes(v);
}

function parseKbBody(body: Record<string, unknown>): KbInput | { error: string } {
  if (typeof body.name !== "string" || !body.name.trim()) {
    return { error: "缺少名称" };
  }
  const kindRaw = String(body.kind ?? "");
  if (!isKind(kindRaw)) {
    return { error: "缺少或非法的 kind" };
  }
  const kind: KbKind = kindRaw;
  return {
    kind,
    name: body.name.trim(),
    aliases: Array.isArray(body.aliases) ? body.aliases.map(String) : [],
    category: typeof body.category === "string" ? body.category : "",
    ins_e: typeof body.ins_e === "string" ? body.ins_e : "",
    one_liner: typeof body.one_liner === "string" ? body.one_liner : "",
    purpose: typeof body.purpose === "string" ? body.purpose : "",
    extra: body.extra && typeof body.extra === "object" ? (body.extra as Record<string, unknown>) : {},
    source: typeof body.source === "string" ? body.source : "local",
  };
}

/** DB 行 → 详情弹窗所需的知识条目结构（与 lib/knowledge.ts 类型一致） */
function toDetailShape(kind: KbKind, row: ReturnType<typeof getKbById>): IngredientKnowledge | AdditiveKnowledge | null {
  if (!row) return null;
  const extra = row.extra;
  if (kind === "additive") {
    return {
      name: row.name,
      aliases: row.aliases,
      insE: row.ins_e,
      type: row.category,
      oneLiner: row.one_liner,
      purpose: row.purpose,
      commonUses: String(extra.commonUses ?? ""),
      whyAdded: String(extra.whyAdded ?? ""),
      safetyNote: String(extra.safetyNote ?? ""),
      caution: String(extra.caution ?? ""),
      audience: String(extra.audience ?? ""),
      usageScope: String(extra.usageScope ?? ""),
      source: row.source,
      updatedAt: row.updated_at,
    } satisfies AdditiveKnowledge;
  }
  return {
    name: row.name,
    aliases: row.aliases,
    category: row.category as IngredientKnowledge["category"],
    oneLiner: row.one_liner,
    purpose: row.purpose,
    processingNature: String(extra.processingNature ?? ""),
    detail: String(extra.detail ?? ""),
    allergens: Array.isArray(extra.allergens) ? extra.allergens.map(String) : [],
    caution: String(extra.caution ?? ""),
    audience: String(extra.audience ?? ""),
    source: row.source,
    updatedAt: row.updated_at,
  } satisfies IngredientKnowledge;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // 后台统计卡片
  if (searchParams.get("stats") === "1") {
    return NextResponse.json(countKb());
  }

  // 后台单条（编辑表单回填）
  const idParam = searchParams.get("id");
  if (idParam) {
    const item = getKbById(Number(idParam));
    if (!item) return NextResponse.json({ error: "条目不存在" }, { status: 404 });
    return NextResponse.json({ item });
  }

  // 后台列表
  if (searchParams.get("list") === "1") {
    const kind = searchParams.get("kind");
    if (!isKind(kind)) {
      return NextResponse.json({ error: "缺少或非法的 kind" }, { status: 400 });
    }
    const result = listKb({
      kind,
      search: searchParams.get("search") ?? "",
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
    });
    return NextResponse.json({ ...result, kind });
  }

  // 公共查询（保持原响应结构：{ type, data }）
  const q = (searchParams.get("q") ?? "").trim();
  const type = searchParams.get("type") ?? "auto";
  if (!q) {
    return NextResponse.json({ error: "缺少查询词" }, { status: 400 });
  }
  if (type !== "ingredient" && type !== "additive" && type !== "auto") {
    return NextResponse.json({ error: "非法的 type" }, { status: 400 });
  }

  const hit = lookupKnowledge(q, type);
  if (hit) {
    return NextResponse.json({
      type: hit.kind,
      data: toDetailShape(hit.kind, hit.row),
    });
  }
  return NextResponse.json({ type: "none", data: null });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);

  // 恢复内置数据
  if (searchParams.get("action") === "reseed") {
    const counts = reseedBuiltin();
    return NextResponse.json({ ok: true, counts });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = parseKbBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  // 一键「加入知识库/更新」：同名存在则更新，否则新增（详情弹窗动态加载用）
  if (searchParams.get("action") === "upsert") {
    try {
      const result = upsertKb(parsed);
      return NextResponse.json({
        ok: result.id > 0,
        id: result.id || undefined,
        updated: result.updated,
        error: result.id > 0 ? undefined : "保存失败",
      });
    } catch (e) {
      // 数据库异常时返回 JSON（避免 Next.js 默认 500 HTML 页导致前端误报「网络错误」）
      console.error("[knowledge] upsert error:", e);
      return NextResponse.json(
        { ok: false, error: `保存失败：${e instanceof Error ? e.message : "数据库异常"}` },
        { status: 500 }
      );
    }
  }

  const result = createKb(parsed);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}

export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "缺少 id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = parseKbBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  const result = updateKb(id, parsed);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "缺少 id" }, { status: 400 });
  const deleted = deleteKb(id);
  if (!deleted) return NextResponse.json({ ok: false, error: "条目不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
