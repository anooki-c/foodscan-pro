"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AnalysisResult, CompareSet, Ingredient, IngredientCategory } from "@/lib/types";
import { buildAnalysis } from "@/lib/mock-data";
import {
  deleteScanRecordByAnalysisId,
  fetchFullScanRecords,
  saveScanRecord,
} from "@/lib/services/api";

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
  /** 已删除记录 tombstone（同步用：防止服务端旧记录在合并时“复活”） */
  deletedIds: string[];
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

      history: [],
      deletedIds: [],
      addHistory: (result) => {
        set((s) => ({
          history: [result, ...s.history.filter((h) => h.id !== result.id)],
        }));
        // 同步上传服务端（analysis_id 唯一，重复上报自动忽略；失败静默，不阻塞确认）
        void saveScanRecord({
          analysisId: result.id,
          productName: result.product?.name,
          barcode: result.product?.barcode,
          dataSource: result.product?.dataSource,
          ingredientCount: result.ingredients.length,
          snapshot: result,
        });
      },
      removeHistory: (id) => {
        set((s) => ({
          history: s.history.filter((h) => h.id !== id),
          deletedIds: s.deletedIds.includes(id) ? s.deletedIds : [...s.deletedIds, id],
        }));
        // 删除传播到服务端；成功后移除 tombstone（服务端已删，合并时不会再带回）
        void deleteScanRecordByAnalysisId(id).then((r) => {
          if (r.ok) {
            set((s) => ({ deletedIds: s.deletedIds.filter((x) => x !== id) }));
          }
        });
      },
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
      partialize: (s) => ({ history: s.history, compare: s.compare, deletedIds: s.deletedIds }),
      version: 1,
      // 迁移：剔除历史版本预置的演示数据（燕麦片 p-oat-milk / 能量饮料 p-energy）
      migrate: (persisted) => {
        const st = persisted as { history?: AnalysisResult[]; compare?: CompareSet };
        if (Array.isArray(st.history)) {
          st.history = st.history.filter(
            (h) => h?.product?.id !== "p-oat-milk" && h?.product?.id !== "p-energy"
          );
        }
        return st;
      },
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

// ---------- 跨端历史同步（服务端 scan_records 作为 hub） ----------

/** 类型守卫：校验服务端快照是完整 AnalysisResult，避免脏数据污染历史 */
function isAnalysisResult(v: unknown): v is AnalysisResult {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const p = o.product as Record<string, unknown> | undefined;
  return (
    typeof o.id === "string" &&
    !!p &&
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    Array.isArray(o.ingredients) &&
    typeof o.confirmedAt === "number"
  );
}

let syncing = false;
let lastSyncAt = 0;
const SYNC_COOLDOWN_MS = 30_000;

/**
 * 从服务端拉取全量分析记录并合并到本地（幂等，可在页面挂载时调用）：
 * - 服务端有、本地无 → 补入本地（按 confirmedAt 降序，最新在顶部）
 * - 本地有、服务端无 → 补传服务端（使各端既有历史也汇聚到服务端 hub）
 * - 本地删除过（tombstone）但服务端仍存在 → 补发删除并收敛 tombstone
 * - 本地已有的同 id 记录 → 保留本地（本端为准，不做覆盖）
 * 返回 { pulled }（本次补入本地的条数）。
 */
export async function syncHistoryFromServer(): Promise<{ pulled: number }> {
  const now = Date.now();
  if (syncing || now - lastSyncAt < SYNC_COOLDOWN_MS) return { pulled: 0 };
  syncing = true;
  try {
    const items = await fetchFullScanRecords();
    const serverIds = new Set(items.map((it) => it.analysisId));
    const st = useAnalysisStore.getState();
    const localIds = new Set(st.history.map((h) => h.id));
    const tombstones = new Set(st.deletedIds);

    const incoming: AnalysisResult[] = [];
    const pendingDeletes: string[] = [];
    for (const it of items) {
      if (tombstones.has(it.analysisId)) {
        // 本端删除过、服务端仍残留 → 补发删除
        pendingDeletes.push(it.analysisId);
        continue;
      }
      if (!isAnalysisResult(it.snapshot)) continue;
      if (!localIds.has(it.snapshot.id)) incoming.push(it.snapshot);
    }

    if (incoming.length > 0) {
      useAnalysisStore.setState((s) => ({
        history: [...s.history, ...incoming].sort((a, b) => b.confirmedAt - a.confirmedAt),
      }));
    }
    // 本端有、服务端缺失的记录补传（含两端既有历史，一次启动即可汇聚）
    for (const h of st.history) {
      if (tombstones.has(h.id) || serverIds.has(h.id)) continue;
      void saveScanRecord({
        analysisId: h.id,
        productName: h.product?.name,
        barcode: h.product?.barcode,
        dataSource: h.product?.dataSource,
        ingredientCount: h.ingredients.length,
        snapshot: h,
      });
    }
    for (const id of pendingDeletes) {
      const r = await deleteScanRecordByAnalysisId(id);
      if (r.ok) {
        useAnalysisStore.setState((s) => ({
          deletedIds: s.deletedIds.filter((x) => x !== id),
        }));
      }
    }
    // 收敛 tombstone：服务端已确认删除（或从未存在）的 id 无保留价值
    const resolvable = st.deletedIds.filter(
      (id) => !serverIds.has(id) && !localIds.has(id)
    );
    if (resolvable.length > 0) {
      useAnalysisStore.setState((s) => ({
        deletedIds: s.deletedIds.filter((x) => !resolvable.includes(x)),
      }));
    }
    lastSyncAt = Date.now();
    return { pulled: incoming.length };
  } finally {
    syncing = false;
  }
}
