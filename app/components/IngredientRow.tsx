"use client";

import type { Ingredient } from "@/lib/types";
import Chip from "./Chip";
import styles from "./IngredientRow.module.css";

interface IngredientRowProps {
  ingredient: Ingredient;
  index: number;
  onEdit: (ingredient: Ingredient) => void;
  onDelete?: (id: string) => void;
  /** 是否展示编辑/删除操作按钮 */
  interactive?: boolean;
  /** 在确认页展示拖拽手柄 */
  draggable?: boolean;
  children?: React.ReactNode;
}

export default function IngredientRow({
  ingredient,
  index,
  onEdit,
  onDelete,
  interactive = false,
  draggable = false,
  children,
}: IngredientRowProps) {
  const rowCls = [styles.row, ingredient.needsConfirm ? styles.warn : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rowCls}>
      {draggable && (
        <span className={`${styles.handle} material-symbols-rounded`} aria-hidden>
          drag_indicator
        </span>
      )}
      <span className={styles.idx}>{String(index + 1).padStart(2, "0")}</span>
      <div className={styles.info}>
        <div className={styles.name}>{ingredient.finalText}</div>
        <div className={styles.tags}>
          {ingredient.category && <Chip category={ingredient.category} />}
          {ingredient.needsConfirm && (
            <Chip variant="warning">建议确认</Chip>
          )}
          <Chip confidence={ingredient.confidence} />
          {ingredient.allergens?.map((a) => (
            <Chip key={a} variant="allergen">
              {a}
            </Chip>
          ))}
        </div>
      </div>
      {children}
      {interactive && (
        <button
          className={styles.editBtn}
          onClick={() => onEdit(ingredient)}
          aria-label={`编辑 ${ingredient.finalText}`}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
            edit
          </span>
        </button>
      )}
      {onDelete && (
        <button
          className={styles.delBtn}
          onClick={() => onDelete(ingredient.id)}
          aria-label={`删除 ${ingredient.finalText}`}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
            close
          </span>
        </button>
      )}
    </div>
  );
}
