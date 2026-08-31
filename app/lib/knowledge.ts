import type { IngredientCategory } from "./types";

/**
 * 知识库 mock 数据（V1 演示用）
 * 真实环境替换为后台知识库（PRD §17.6）查询：
 * 配料库 / 添加剂库 / 过敏原库，每条含来源与更新时间。
 */

export interface IngredientKnowledge {
  /** 标准名称（匹配 key） */
  name: string;
  aliases?: string[];
  category: IngredientCategory;
  /** 一句话解释 */
  oneLiner: string;
  /** 加工性质说明 */
  processingNature?: string;
  /** 主要用途 */
  purpose: string;
  /** 详细说明（第二层） */
  detail?: string;
  /** 潜在过敏原类别 */
  allergens?: string[];
  /** 数据来源 */
  source: string;
  updatedAt: string;
}

export interface AdditiveKnowledge {
  name: string;
  insE: string;
  type: string;
  /** 一句话解释 */
  oneLiner: string;
  /** 主要用途 */
  purpose: string;
  /** 常见应用 */
  commonUses: string;
  /** 为什么添加 */
  whyAdded?: string;
  /** 安全性说明 */
  safetyNote: string;
  /** 注意事项 */
  caution: string;
  /** 关注人群 */
  audience: string;
  /** 使用范围 */
  usageScope?: string;
  source: string;
  updatedAt: string;
}

/** 配料知识库 */
export const INGREDIENT_KB: Record<string, IngredientKnowledge> = {
  小麦粉: {
    name: "小麦粉",
    aliases: ["面粉"],
    category: "natural",
    oneLiner: "由小麦研磨而成的粉末状谷物原料。",
    processingNature: "基础原料",
    purpose: "提供结构、口感和碳水化合物，是面包、糕点等的主料。",
    detail: "根据研磨精度分为高筋、中筋、低筋等类型。含麸质蛋白。",
    allergens: ["麸质"],
    source: "GB/T 1355 / OFF",
    updatedAt: "2026-08-28",
  },
  白砂糖: {
    name: "白砂糖",
    category: "natural",
    oneLiner: "从甘蔗或甜菜中提取精制而成的蔗糖。",
    processingNature: "基础原料",
    purpose: "提供甜味、促进褐变反应，并帮助食品保持质地。",
    detail: "属添加糖类。配料表顺序反映加入量排序。",
    source: "GB/T 317 / OFF",
    updatedAt: "2026-08-28",
  },
  食用植物油: {
    name: "食用植物油",
    aliases: ["植物油"],
    category: "natural",
    oneLiner: "从植物种子或果实中压榨或浸出的油脂。",
    processingNature: "基础原料",
    purpose: "提供脂肪、口感与香气，是煎炸和烘焙的重要原料。",
    detail: "常见种类包括菜籽油、大豆油、棕榈油等，可能为调和油。",
    source: "GB 2716 / OFF",
    updatedAt: "2026-08-26",
  },
  乳粉: {
    name: "乳粉",
    aliases: ["奶粉"],
    category: "natural",
    oneLiner: "将牛乳浓缩干燥制成的粉末状乳制品。",
    processingNature: "基础原料",
    purpose: "提供乳蛋白、乳脂与乳糖，常用于烘焙、饮料和婴幼儿配方。",
    detail: "乳粉属于乳及乳制品。对乳糖不耐受或乳蛋白过敏人群需留意。",
    allergens: ["乳"],
    source: "GB 19644 / OFF",
    updatedAt: "2026-08-27",
  },
  麦芽糖浆: {
    name: "麦芽糖浆",
    category: "processed",
    oneLiner: "由淀粉部分水解制成的甜味糖浆。",
    processingNature: "加工原料",
    purpose: "提供甜味和保湿性，帮助食品保持柔软质地。",
    detail: "属于淀粉糖浆类，甜度低于蔗糖。",
    source: "GB/T 20883 / OFF",
    updatedAt: "2026-08-25",
  },
  麦芽糊精: {
    name: "麦芽糊精",
    category: "processed",
    oneLiner: "淀粉部分水解得到的短链多糖。",
    processingNature: "加工原料",
    purpose: "作为填充剂、增稠剂和载体，帮助改善食品质地。",
    detail: "由淀粉酶解制成，可来源于玉米、小麦等。若来源于小麦需留意麸质。",
    allergens: ["麸质（视原料）"],
    source: "GB/T 20882 / OFF",
    updatedAt: "2026-08-24",
  },
  食盐: {
    name: "食盐",
    aliases: ["盐"],
    category: "natural",
    oneLiner: "主要成分为氯化钠的调味原料。",
    processingNature: "基础原料",
    purpose: "提供咸味、增强风味并起防腐作用。",
    detail: "不同产品可能含碘或抗结剂。",
    source: "GB/T 5461 / OFF",
    updatedAt: "2026-08-28",
  },
  燕麦片: {
    name: "燕麦片",
    category: "natural",
    oneLiner: "由燕麦籽粒压制成的片状谷物。",
    processingNature: "基础原料",
    purpose: "提供膳食纤维、蛋白质和碳水化合物。",
    detail: "燕麦本身不含麸质，但加工过程可能交叉污染，相关人群需确认包装声明。",
    allergens: ["麸质（交叉污染可能）"],
    source: "OFF",
    updatedAt: "2026-08-28",
  },
  水: {
    name: "水",
    category: "natural",
    oneLiner: "饮料与液体食品的基础介质。",
    processingNature: "基础原料",
    purpose: "作为溶剂和主体成分，溶解其他配料。",
    detail: "多为处理后水源，成分以水为主。",
    source: "GB 19298 / OFF",
    updatedAt: "2026-08-28",
  },
};

/** 添加剂知识库 */
export const ADDITIVE_KB: Record<string, AdditiveKnowledge> = {
  山梨酸钾: {
    name: "山梨酸钾",
    insE: "E202",
    type: "防腐剂",
    oneLiner: "一种常用的食品防腐剂，抑制微生物生长。",
    purpose: "抑制部分微生物生长，帮助延长食品保存期。",
    commonUses: "果酱、饮料、调味酱、烘焙食品等。",
    whyAdded: "在法规允许的范围内防止食品变质，延长货架期。",
    safetyNote: "在批准的使用范围和用量内是允许使用的食品添加剂。",
    caution: "按国家标准限量使用；部分人群可能对其敏感。",
    audience: "对食品添加剂较敏感人群可留意配料表。",
    usageScope: "依据 GB 2760 规定范围与限量使用。",
    source: "GB 2760 / OFF",
    updatedAt: "2026-08-28",
  },
  黄原胶: {
    name: "黄原胶",
    insE: "E415",
    type: "增稠剂",
    oneLiner: "一种微生物发酵制得的天然增稠剂。",
    purpose: "增加食品黏稠度，稳定乳液和悬浮体系。",
    commonUses: "沙拉酱、饮料、冰淇淋、无麸质烘焙等。",
    whyAdded: "帮助改善口感质地并防止分层沉淀。",
    safetyNote: "属微生物发酵来源的增稠剂，多国批准使用。",
    caution: "高剂量可能对部分人群有轻泻作用，正常食用量下不常见。",
    audience: "极少人群可能敏感，一般无需特别关注。",
    usageScope: "依据 GB 2760 规定范围与限量使用。",
    source: "GB 2760 / OFF",
    updatedAt: "2026-08-27",
  },
  大豆卵磷脂: {
    name: "大豆卵磷脂",
    insE: "E322",
    type: "乳化剂",
    oneLiner: "从大豆中提取的天然乳化剂。",
    purpose: "帮助油和水均匀混合，改善食品质地。",
    commonUses: "巧克力、烘焙食品、人造奶油、酱料等。",
    whyAdded: "防止油水分离，提升口感顺滑度。",
    safetyNote: "属大豆来源的天然成分，多国批准使用。",
    caution: "大豆过敏人群需留意该成分来源。",
    audience: "大豆过敏人群应特别留意。",
    usageScope: "依据 GB 2760 规定范围与限量使用。",
    source: "GB 2760 / OFF",
    updatedAt: "2026-08-25",
  },
  碳酸钙: {
    name: "碳酸钙",
    insE: "E170",
    type: "营养强化剂",
    oneLiner: "一种钙源营养强化剂。",
    purpose: "补充钙质，也用作膨松剂或抗结剂。",
    commonUses: "谷物制品、饮料、保健食品等。",
    whyAdded: "补充人体所需钙元素，改善营养构成。",
    safetyNote: "食品级碳酸钙广泛用于钙强化。",
    caution: "按法规限量使用，正常食用无显著风险。",
    audience: "一般人群无需特别关注。",
    usageScope: "依据 GB 14880 与 GB 2760 规定。",
    source: "GB 1886 / OFF",
    updatedAt: "2026-08-23",
  },
  香兰素: {
    name: "香兰素",
    insE: "E511",
    type: "香精香料",
    oneLiner: "一种广泛使用的食用香料。",
    purpose: "提供香草香气。",
    commonUses: "烘焙、糖果、乳制品、饮料等。",
    whyAdded: "增强食品香气，改善感官体验。",
    safetyNote: "多国批准用作食用香料，允许限量使用。",
    caution: "按法规使用，高浓度可能有刺激性气味。",
    audience: "一般人群无需特别关注。",
    usageScope: "依据 GB 2760 规定范围与限量使用。",
    source: "GB 2760 / OFF",
    updatedAt: "2026-08-22",
  },
  柠檬酸: {
    name: "柠檬酸",
    insE: "E330",
    type: "酸度调节剂",
    oneLiner: "天然存在于柑橘类水果中的有机酸。",
    purpose: "调节酸度、增强风味并起抗氧化协同作用。",
    commonUses: "饮料、果酱、糖果、加工水果等。",
    whyAdded: "平衡甜度、提升清新口感。",
    safetyNote: "食品级柠檬酸广泛安全使用。",
    caution: "极少数人大量摄入后口腔或肠胃不适。",
    audience: "一般人群无需特别关注。",
    usageScope: "依据 GB 2760 规定范围与限量使用。",
    source: "GB 1886 / OFF",
    updatedAt: "2026-08-26",
  },
  咖啡因: {
    name: "咖啡因",
    insE: "—",
    type: "其他",
    oneLiner: "天然存在于咖啡、茶叶中的生物碱。",
    purpose: "提供提神作用，常添加于功能饮料。",
    commonUses: "能量饮料、可乐、茶饮料等。",
    whyAdded: "提供兴奋作用，是功能饮料的常见添加成分。",
    safetyNote: "按法规限量；对咖啡因敏感人群需注意摄入量。",
    caution: "孕妇、儿童及咖啡因敏感人群应留意。",
    audience: "孕妇、儿童、睡眠障碍人群应留意。",
    usageScope: "依据 GB 2760 规定范围与限量使用。",
    source: "GB 2760 / OFF",
    updatedAt: "2026-08-26",
  },
  苯甲酸钠: {
    name: "苯甲酸钠",
    insE: "E211",
    type: "防腐剂",
    oneLiner: "一种常用于酸性食品的防腐剂。",
    purpose: "抑制微生物生长，延长保存期。",
    commonUses: "饮料、调味酱、果酱、腌制品等。",
    whyAdded: "在酸性环境下抑制细菌和酵母。",
    safetyNote: "在批准范围与限量内允许使用。",
    caution: "敏感人群大量摄入可能出现不适；按国家标准限量使用。",
    audience: "对食品添加剂较敏感人群可留意配料表。",
    usageScope: "依据 GB 2760 规定范围与限量使用。",
    source: "GB 2760 / OFF",
    updatedAt: "2026-08-24",
  },
  安赛蜜: {
    name: "安赛蜜",
    insE: "E950",
    type: "甜味剂",
    oneLiner: "一种高倍甜度人工甜味剂。",
    purpose: "提供甜味，甜度约为蔗糖的数百倍。",
    commonUses: "无糖饮料、口香糖、甜点、调味品等。",
    whyAdded: "在减少糖分摄入的同时提供甜味。",
    safetyNote: "多国批准使用，规定每日允许摄入量（ADI）。",
    caution: "苯丙酮尿症人群无需担忧（不含苯丙氨酸），但应按限量使用。",
    audience: "一般人群无需特别关注。",
    usageScope: "依据 GB 2760 规定范围与限量使用。",
    source: "GB 2760 / OFF",
    updatedAt: "2026-08-24",
  },
  食用香精: {
    name: "食用香精",
    insE: "—",
    type: "香精香料",
    oneLiner: "用于提供或增强食品风味的复配香料。",
    purpose: "提供特定风味或香气。",
    commonUses: "饮料、糖果、乳制品、烘焙食品等。",
    whyAdded: "增强食品感官品质，帮助产品风味稳定。",
    safetyNote: "依据食品用香精香料使用准则管理。",
    caution: "具体成分多样，敏感人群难以逐一识别。",
    audience: "对香精较敏感人群可留意。",
    usageScope: "依据 GB 2760 相关规定。",
    source: "GB 2760 / OFF",
    updatedAt: "2026-08-22",
  },
  维生素C: {
    name: "维生素C",
    insE: "E300",
    type: "抗氧化剂",
    oneLiner: "即抗坏血酸，具有抗氧化作用的水溶性维生素。",
    purpose: "防止氧化变质，同时补充维生素C。",
    commonUses: "饮料、肉制品、果酱、强化食品等。",
    whyAdded: "延缓氧化，保持色泽与风味。",
    safetyNote: "广泛使用的抗氧化剂与营养强化剂。",
    caution: "正常食用安全，超量摄入可增加草酸排泄。",
    audience: "一般人群无需特别关注。",
    usageScope: "依据 GB 2760 与 GB 14880 规定。",
    source: "GB 1886 / OFF",
    updatedAt: "2026-08-23",
  },
  维生素B6: {
    name: "维生素B6",
    insE: "—",
    type: "营养强化剂",
    oneLiner: "参与蛋白质代谢的水溶性 B 族维生素。",
    purpose: "补充维生素 B6，帮助能量代谢。",
    commonUses: "强化饮料、运动食品、谷物制品等。",
    whyAdded: "满足特定人群的营养需求。",
    safetyNote: "按法规限量使用，过量摄入有神经毒性风险，应遵循限量。",
    caution: "按法规限量使用，避免超量。",
    audience: "一般人群无需特别关注。",
    usageScope: "依据 GB 14880 规定。",
    source: "GB 14880 / OFF",
    updatedAt: "2026-08-23",
  },
};

/** 按标准名查配料知识 */
export function getIngredientKnowledge(name: string): IngredientKnowledge | undefined {
  return INGREDIENT_KB[name] ?? INGREDIENT_KB[findAlias(name)];
}

/** 按名称查添加剂知识 */
export function getAdditiveKnowledge(name: string): AdditiveKnowledge | undefined {
  return ADDITIVE_KB[name];
}

function findAlias(name: string): string {
  for (const [key, kb] of Object.entries(INGREDIENT_KB)) {
    if (kb.aliases?.includes(name)) return key;
  }
  return name;
}
