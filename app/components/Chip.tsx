"use client";

import type { CSSProperties } from "react";
import type { Confidence, IngredientCategory } from "@/lib/types";
import styles from "./Chip.module.css";

export type ChipVariant = IngredientCategory | "allergen" | "role" | "info" | "warning" | "plain";

const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  natural: "天然",
  processed: "加工",
  additive: "添加剂",
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "高可信",
  medium: "中可信",
  low: "低可信",
  manual: "人工修改",
};

interface ChipProps {
  /** 展示文本；category/additive/allergen 变体可省略（自动取标签） */
  children?: React.ReactNode;
  variant?: ChipVariant;
  /** 分类变体 */
  category?: IngredientCategory;
  confidence?: Confidence;
  style?: CSSProperties;
  className?: string;
}

export default function Chip({
  children,
  variant = "plain",
  category,
  confidence,
  style,
  className = "",
}: ChipProps) {
  let cls = styles.chip;
  let text: React.ReactNode = children;

  if (category) {
    cls = `${cls} ${styles[`cat-${category}`]}`;
    text = CATEGORY_LABEL[category];
  } else if (confidence) {
    cls = `${cls} ${styles[`conf-${confidence}`]}`;
    text = CONFIDENCE_LABEL[confidence];
  } else {
    cls = `${cls} ${styles[variant]}`;
  }

  return (
    <span className={`${cls} ${className}`.trim()} style={style}>
      {text}
    </span>
  );
}
