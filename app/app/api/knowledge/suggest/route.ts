import { NextResponse } from "next/server";
import { callAiIngredientInfo } from "@/lib/server/off";

export const dynamic = "force-dynamic";

/**
 * GET /api/knowledge/suggest?name=山梨酸钾&type=additive
 *
 * 知识库未命中时的动态资料加载（需求 6）：
 *   1. 优先外部数据源：Wikipedia 中文条目摘要
 *   2. 失败或未命中 → 回退已配置的 AI 生成结构化资料
 *
 * 返回：
 *   { ok: true, source: "wikipedia" | "ai", type, data: { name, oneLiner, purpose, detail, caution, audience }, via }
 *   { ok: false, error }   —— 两个数据源都不可用
 *
 * 说明：接口只做「检索建议」，不自动入库；由前端展示建议后由用户决定「加入知识库 / 更新」。
 */

/** Wikipedia REST summary 接口（zh），返回条目摘要 */
async function fetchWikipedia(name: string): Promise<{
  oneLiner: string;
  purpose: string;
  detail: string;
} | null> {
  try {
    const url = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const extract: string = data.extract ?? "";
    if (!extract) return null;
    // 摘要首句作一句话解释，全文作详细说明
    const sentences = extract.split(/(?<=[。！？])/).map((s) => s.trim()).filter(Boolean);
    return {
      oneLiner: (sentences[0] ?? extract).slice(0, 80),
      purpose: sentences.slice(0, 2).join(""),
      detail: extract.slice(0, 500),
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = (searchParams.get("name") ?? "").trim();
  const type = searchParams.get("type") ?? "ingredient";
  if (!name) {
    return NextResponse.json({ ok: false, error: "缺少 name" }, { status: 400 });
  }
  if (type !== "ingredient" && type !== "additive") {
    return NextResponse.json({ ok: false, error: "type 仅支持 ingredient / additive" }, { status: 400 });
  }

  // 1. 外部数据源：Wikipedia 中文
  const wiki = await fetchWikipedia(name);
  if (wiki) {
    return NextResponse.json({
      ok: true,
      source: "wikipedia",
      type,
      via: "zh.wikipedia.org",
      data: {
        name,
        oneLiner: wiki.oneLiner,
        purpose: wiki.purpose,
        detail: wiki.detail,
        caution: "",
        audience: "",
      },
    });
  }

  // 2. 回退：AI 生成（需后台已配置 AI；未配置时返回明确错误）
  const ai = await callAiIngredientInfo({ name, kind: type });
  if (ai) {
    return NextResponse.json({
      ok: true,
      source: "ai",
      type,
      via: "AI 生成（请人工核对）",
      data: {
        name,
        oneLiner: ai.oneLiner,
        purpose: ai.purpose,
        detail: ai.detail,
        caution: ai.caution,
        audience: ai.audience,
      },
    });
  }

  return NextResponse.json({
    ok: false,
    error: "外部数据源与 AI 均未返回资料。可检查后台 AI 配置，或稍后重试。",
    hint: "可在后台 /admin/ai 配置 AI 服务以获得 AI 兜底能力",
  });
}
