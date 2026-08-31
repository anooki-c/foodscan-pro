import type { AnalysisResult, Ingredient, Product } from "./types";

/** 演示用 mock 数据（真实环境替换为 OCR/数据库/知识库分析） */

const oatMilkProduct: Product = {
  id: "p-oat-milk",
  name: "即食燕麦片",
  brand: "山野",
  spec: "500g",
  dataSource: "Open Food Facts",
  updatedAt: "2026-08-30",
};

const energyDrinkProduct: Product = {
  id: "p-energy",
  name: "能量饮料",
  brand: "燃动",
  spec: "250ml",
  dataSource: "Open Food Facts",
  updatedAt: "2026-08-30",
};

const oatMilkIngredients: Ingredient[] = [
  { id: "i-1", originalText: "燕麦片", finalText: "燕麦片", stdId: "RAW_001", originalPos: 1, finalPos: 1, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "natural" },
  { id: "i-2", originalText: "白砂糖", finalText: "白砂糖", stdId: "RAW_002", originalPos: 2, finalPos: 2, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "natural" },
  { id: "i-3", originalText: "麦芽糖浆", finalText: "麦芽糖浆", stdId: "PRC_001", originalPos: 3, finalPos: 3, matchScore: 96, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "processed" },
  { id: "i-4", originalText: "乳粉", finalText: "乳粉", stdId: "RAW_010", originalPos: 4, finalPos: 4, matchScore: 86, matchMethod: "fuzzy", source: "ocr", confidence: "medium", isManual: false, category: "natural", allergens: ["乳"], needsConfirm: true },
  { id: "i-5", originalText: "食用植物油", finalText: "食用植物油", stdId: "RAW_005", originalPos: 5, finalPos: 5, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "natural" },
  { id: "i-6", originalText: "山梨酸钾", finalText: "山梨酸钾", stdId: "ADD_0001", originalPos: 6, finalPos: 6, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "additive", additiveType: "防腐剂" },
  { id: "i-7", originalText: "黄原胶", finalText: "黄原胶", stdId: "ADD_0002", originalPos: 7, finalPos: 7, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "additive", additiveType: "增稠剂" },
  { id: "i-8", originalText: "大豆卵磷脂", finalText: "大豆卵磷脂", stdId: "ADD_0003", originalPos: 8, finalPos: 8, matchScore: 92, matchMethod: "contains", source: "ocr", confidence: "high", isManual: false, category: "additive", additiveType: "乳化剂", allergens: ["大豆"] },
  { id: "i-9", originalText: "食盐", finalText: "食盐", stdId: "RAW_006", originalPos: 9, finalPos: 9, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "natural" },
  { id: "i-10", originalText: "碳酸钙", finalText: "碳酸钙", stdId: "ADD_0004", originalPos: 10, finalPos: 10, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "additive", additiveType: "营养强化剂" },
  { id: "i-11", originalText: "麦芽糊精", finalText: "麦芽糊精", stdId: "PRC_002", originalPos: 11, finalPos: 11, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "processed" },
  { id: "i-12", originalText: "香兰素", finalText: "香兰素", stdId: "ADD_0005", originalPos: 12, finalPos: 12, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "additive", additiveType: "香精香料" },
];

const energyIngredients: Ingredient[] = [
  { id: "e-1", originalText: "水", finalText: "水", stdId: "RAW_020", originalPos: 1, finalPos: 1, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "natural" },
  { id: "e-2", originalText: "白砂糖", finalText: "白砂糖", stdId: "RAW_002", originalPos: 2, finalPos: 2, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "natural" },
  { id: "e-3", originalText: "果葡糖浆", finalText: "果葡糖浆", stdId: "PRC_003", originalPos: 3, finalPos: 3, matchScore: 98, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "processed" },
  { id: "e-4", originalText: "柠檬酸", finalText: "柠檬酸", stdId: "ADD_0010", originalPos: 4, finalPos: 4, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "additive", additiveType: "酸度调节剂" },
  { id: "e-5", originalText: "咖啡因", finalText: "咖啡因", stdId: "ADD_0011", originalPos: 5, finalPos: 5, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "additive", additiveType: "其他" },
  { id: "e-6", originalText: "山梨酸钾", finalText: "山梨酸钾", stdId: "ADD_0001", originalPos: 6, finalPos: 6, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "additive", additiveType: "防腐剂" },
  { id: "e-7", originalText: "黄原胶", finalText: "黄原胶", stdId: "ADD_0002", originalPos: 7, finalPos: 7, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "additive", additiveType: "增稠剂" },
  { id: "e-8", originalText: "苯甲酸钠", finalText: "苯甲酸钠", stdId: "ADD_0012", originalPos: 8, finalPos: 8, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "additive", additiveType: "防腐剂" },
  { id: "e-9", originalText: "安赛蜜", finalText: "安赛蜜", stdId: "ADD_0013", originalPos: 9, finalPos: 9, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "additive", additiveType: "甜味剂" },
  { id: "e-10", originalText: "食用香精", finalText: "食用香精", stdId: "ADD_0014", originalPos: 10, finalPos: 10, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "additive", additiveType: "香精香料" },
  { id: "e-11", originalText: "维生素C", finalText: "维生素C", stdId: "ADD_0015", originalPos: 11, finalPos: 11, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "additive", additiveType: "抗氧化剂" },
  { id: "e-12", originalText: "维生素B6", finalText: "维生素B6", stdId: "ADD_0016", originalPos: 12, finalPos: 12, matchScore: 99, matchMethod: "exact", source: "ocr", confidence: "high", isManual: false, category: "additive", additiveType: "营养强化剂" },
];

/** 由配料数组推导统计 */
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
    aiSummary:
      "这款食品主要由燕麦、糖类和植物油组成，另外添加了山梨酸钾、黄原胶等食品添加剂。配料中发现乳和大豆相关成分，相关人群需要留意。配料表本身无法判断实际摄入量及整体营养价值，建议结合营养成分表综合判断。",
  };
}

export const mockAnalysis = {
  oatMilk: buildAnalysis("a-1", oatMilkProduct, oatMilkIngredients),
  energy: buildAnalysis("a-2", energyDrinkProduct, energyIngredients),
};

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
