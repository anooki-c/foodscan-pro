import { NextResponse } from "next/server";
import { INGREDIENT_KB, ADDITIVE_KB } from "@/lib/knowledge";

export const dynamic = "force-dynamic";

/**
 * GET /api/knowledge?q=山梨酸钾&type=additive
 * 知识库查询（V1：本地知识库 JSON；可替换为数据库查询）
 * type: ingredient | additive | auto
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const type = searchParams.get("type") ?? "auto";

  if (!q) {
    return NextResponse.json({ error: "缺少查询词" }, { status: 400 });
  }

  // 添加剂优先（添加剂名更特殊）
  if (type === "additive" || type === "auto") {
    const additive = ADDITIVE_KB[q];
    if (additive) {
      return NextResponse.json({ type: "additive", data: additive });
    }
  }
  if (type === "ingredient" || type === "auto") {
    const ingredient = INGREDIENT_KB[q] ?? findByAlias(q);
    if (ingredient) {
      return NextResponse.json({ type: "ingredient", data: ingredient });
    }
  }

  return NextResponse.json({ type: "none", data: null });
}

function findByAlias(q: string) {
  for (const [, kb] of Object.entries(INGREDIENT_KB)) {
    if (kb.aliases?.includes(q)) return kb;
  }
  return undefined;
}
