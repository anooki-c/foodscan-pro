// 配料类型定义（对应 docs/04-implementation-roadmap.md §4 数据模型）

/** 成分分类：基础原料 / 加工原料 / 食品添加剂 */
export type IngredientCategory = "natural" | "processed" | "additive";

/** 置信度：高 / 中 / 低 / 人工修改 */
export type Confidence = "high" | "medium" | "low" | "manual";

/** 识别来源 */
export type Source = "ocr" | "database" | "manual" | "ai";

/** 一条配料（确认后的最终形态） */
export interface Ingredient {
  id: string;
  /** 原始识别文本 */
  originalText: string;
  /** 用户确认文本 */
  finalText: string;
  /** 标准配料 ID（知识库，可为空） */
  stdId?: string;
  /** 原始顺序位置 */
  originalPos: number;
  /** 最终顺序位置 */
  finalPos: number;
  /** 匹配度 0-100 */
  matchScore?: number;
  /** 匹配方式 */
  matchMethod?: "exact" | "prefix" | "contains" | "alias" | "fuzzy" | "manual" | "none";
  /** 识别来源 */
  source: Source;
  /** 置信度 */
  confidence: Confidence;
  /** 是否人工修改 */
  isManual: boolean;
  /** 分类 */
  category?: IngredientCategory;
  /** 添加剂类型（当 category=additive） */
  additiveType?: string;
  /** 潜在过敏原类别 */
  allergens?: string[];
  /** 是否需用户确认 */
  needsConfirm?: boolean;
}

/** 食品产品（数据库 / 手动） */
export interface Product {
  id: string;
  name: string;
  brand?: string;
  spec?: string;
  barcode?: string;
  dataSource: string;
  updatedAt: string;
  imageHint?: string;
}

/** 一次完整分析 */
export interface AnalysisResult {
  id: string;
  product: Product;
  ingredients: Ingredient[];
  confirmedAt: number;
  /** AI 解读 */
  aiSummary?: string;
  /** 添加剂类型统计 */
  additiveStats: Record<string, number>;
  /** 过敏原统计 */
  allergenStats: Record<string, number>;
}

/** 对比集（最多 5 个食品） */
export interface CompareSet {
  ids: string[];
}
