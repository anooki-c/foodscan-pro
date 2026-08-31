"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AnalysisResult, CompareSet, Ingredient, IngredientCategory } from "@/lib/types";
import { mockAnalysis, buildAnalysis } from "@/lib/mock-data";

interface AnalysisState {
  /** 当前正在确认的配料（进入确认页前填充） */
  draftIngredients: Ingredient[];
  setDraftIngredients: (list: Ingredient[]) => void;
  /** 更新确认页中的某条配料 */
  updateDraftIngredient: (id: string, patch: Partial<Ingredient>) => void;
  deleteDraftIngredient: (id: string) => void;
  addDraftIngredient: (ing: Ingredient) => void;
  /** 历史分析记录 */
  history: AnalysisResult[];
  addHistory: (result: AnalysisResult) => void;
  removeHistory: (id: string) => void;
  getAnalysisById: (id: string) => AnalysisResult | undefined;
  /** 当前结果页展示的分析 */
  currentAnalysis: AnalysisResult | null;
  setCurrentAnalysis: (a: AnalysisResult | null) => void;
  /** 对比集合 */
  compare: CompareSet;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
}

/** 分类统计辅助 */
export function countByCategory(ings: Ingredient[]): Record<IngredientCategory, number> {
  const r: Record<IngredientCategory, number> = { natural: 0, processed: 0, additive: 0 };
  ings.forEach((i) => {
    if (i.category) r[i.category] += 1;
  });
  return r;
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      draftIngredients: [],
      setDraftIngredients: (list) => set({ draftIngredients: list }),
      updateDraftIngredient: (id, patch) =>
        set((s) => ({
          draftIngredients: s.draftIngredients.map((i) =>
            i.id === id ? { ...i, ...patch } : i
          ),
        })),
      deleteDraftIngredient: (id) =>
        set((s) => {
          const rest = s.draftIngredients.filter((i) => i.id !== id);
          return { draftIngredients: rest.map((i, idx) => ({ ...i, finalPos: idx + 1 })) };
        }),
      addDraftIngredient: (ing) =>
        set((s) => {
          const pos = s.draftIngredients.length + 1;
          return {
            draftIngredients: [...s.draftIngredients, { ...ing, finalPos: pos }],
          };
        }),

      history: [mockAnalysis.oatMilk, mockAnalysis.energy],
      addHistory: (result) =>
        set((s) => ({
          history: [result, ...s.history.filter((h) => h.id !== result.id)],
        })),
      removeHistory: (id) =>
        set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
      getAnalysisById: (id) => get().history.find((h) => h.id === id),

      currentAnalysis: null,
      setCurrentAnalysis: (a) => set({ currentAnalysis: a }),

      compare: { ids: [] },
      toggleCompare: (id) =>
        set((s) => {
          const ids = s.compare.ids.includes(id)
            ? s.compare.ids.filter((x) => x !== id)
            : s.compare.ids.length >= 5
              ? s.compare.ids
              : [...s.compare.ids, id];
          return { compare: { ids } };
        }),
      clearCompare: () => set({ compare: { ids: [] } }),
    }),
    {
      name: "foodscan-analysis",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ history: s.history, compare: s.compare }),
    }
  )
);

/** 工具：确认页 → 生成分析结果并写入历史 */
export function confirmDraft(
  productName: string,
  draft: Ingredient[]
): AnalysisResult {
  const result = buildAnalysis(
    `a-${Date.now()}`,
    {
      id: `p-${Date.now()}`,
      name: productName || "未命名食品",
      dataSource: "手动确认",
      updatedAt: new Date().toLocaleDateString("zh-CN"),
    },
    draft
  );
  return result;
}
