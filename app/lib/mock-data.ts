import type { AnalysisResult, Ingredient, Product } from "./types";

/**
 * 由配料数组推导统计（真实分析结果构造器，confirm 页提交时使用）
 */
export function buildAnalysis(id: string, product: Product, ingredients: Ingredient[]): AnalysisResult {
  const additiveStats: Record<string, number> = {};
  const allergenStats: Record<string, number> = {};
  ingredients.forEach((ing) => {
    if (ing.category === "additive" && ing.additiveType) {
      additiveStats[ing.additiveType] = (additiveStats[ing.additiveType] ?? 0) + 1;
    }
    ing.allergens?.forEach((a) => {
      allergenStats[a] = (allergenStats[a] ?? 0) + 1;
    });
  });
  return {
    id,
    product,
    ingredients: [...ingredients].sort((a, b) => a.finalPos - b.finalPos),
    confirmedAt: Date.now(),
    additiveStats,
    allergenStats,
    // AI 解读由结果页手动触发（/api/ai/summary），未配置时服务端返回基于真实配料动态生成的兜底文案。
  };
}

/** 数据库候选（输入推荐，Top5） */
export const CANDIDATES: Record<string, string[]> = {
  "乳": ["乳粉", "乳清粉", "全脂乳粉", "脱脂乳粉", "乳糖"],
  "山梨": ["山梨酸钾", "山梨酸钠", "山梨酸钙", "山梨酸", "山梨酸酯"],
  "黄原": ["黄原胶", "黄原酸", "黄酮类化合物", "黄曲霉毒素", "黄米"],
  "": ["水", "白砂糖", "食盐", "植物油", "小麦粉"],
};

/** 过敏原候选（设置页） */
export const ALLERGEN_OPTIONS: { key: string; label: string; emoji: string; sub: string }[] = [
  { key: "花生/坚果", label: "花生 / 坚果", emoji: "🥜", sub: "花生、杏仁、榛子等" },
  { key: "甲壳类", label: "甲壳类海鲜", emoji: "🦐", sub: "虾、蟹、龙虾等" },
  { key: "鱼类", label: "鱼类", emoji: "🐟", sub: "三文鱼、金枪鱼等" },
  { key: "大豆", label: "大豆 / 豆制品", emoji: "🫘", sub: "大豆卵磷脂、酱油等" },
  { key: "乳", label: "乳 / 乳制品", emoji: "🥛", sub: "乳粉、乳清、黄油等" },
  { key: "麸质", label: "麸质 / 小麦", emoji: "🌾", sub: "小麦粉、麦芽等" },
  { key: "鸡蛋", label: "鸡蛋", emoji: "🥚", sub: "蛋清、蛋黄等" },
  { key: "芝麻", label: "芝麻", emoji: "⚪", sub: "芝麻、芝麻酱等" },
];
