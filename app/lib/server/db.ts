// ============================================================
// SQLite 数据层（V1 落地）
//
// 存储：process.env.DB_FILE || <cwd>/data/foodscan.db
//   - 本地开发：app/data/foodscan.db
//   - Docker：挂载卷 /app/data（compose 已挂 foodscan_data → /app/data）
//
// 表设计（对齐 roadmap §4，做工程化取舍）：
//   kb_entries   知识库条目（配料/添加剂/过敏原合一，kind 区分；
//                异构字段用 aliases/extra 两个 JSON 列承载，统一 CRUD）
//   scan_records 扫描历史（analysis_id 唯一，幂等保存）
//   compare_sets 对比集（V1 建表，UI 仍走 localStorage，后续迁移）
//   meta         元信息（知识库种子版本，用于升级时增量播种）
//
// 种子数据：lib/knowledge.ts（159 条）+ 内置 8 大类过敏原。
//   首次启动自动播种；meta.kb_seed_version 变化时对内置条目重新播种；
//   用户自定义条目不会被覆盖；后台可手动"恢复内置数据"。
// ============================================================

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import {
  INGREDIENT_KB,
  ADDITIVE_KB,
  type IngredientKnowledge,
  type AdditiveKnowledge,
} from "@/lib/knowledge";

export type KbKind = "ingredient" | "additive" | "allergen";

export interface KbRow {
  id: number;
  kind: KbKind;
  name: string;
  aliases: string[];
  category: string;
  ins_e: string;
  one_liner: string;
  purpose: string;
  extra: Record<string, unknown>;
  source: string;
  is_builtin: number;
  updated_at: string;
}

/** 新建/更新条目入参（aliases 为数组） */
export interface KbInput {
  kind: KbKind;
  name: string;
  aliases?: string[];
  category?: string;
  ins_e?: string;
  one_liner?: string;
  purpose?: string;
  extra?: Record<string, unknown>;
  source?: string;
}

export interface ScanRecordInput {
  analysis_id: string;
  product_name?: string;
  barcode?: string;
  data_source?: string;
  ingredient_count?: number;
  snapshot?: unknown;
}

const SEED_VERSION = "1";

function dbPath(): string {
  return process.env.DB_FILE || path.join(process.cwd(), "data", "foodscan.db");
}

// ---------- 连接单例（dev 热重载下复用） ----------
const globalForDb = globalThis as unknown as { __foodscanDb?: Database.Database };

function getDb(): Database.Database {
  if (!globalForDb.__foodscanDb) {
    const file = dbPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new Database(file);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
    seedIfNeeded(db);
    globalForDb.__foodscanDb = db;
  }
  return globalForDb.__foodscanDb;
}

// ---------- 建表 ----------
function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kb_entries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      kind        TEXT NOT NULL CHECK (kind IN ('ingredient','additive','allergen')),
      name        TEXT NOT NULL,
      aliases     TEXT NOT NULL DEFAULT '[]',
      category    TEXT NOT NULL DEFAULT 'other',
      ins_e       TEXT NOT NULL DEFAULT '',
      one_liner   TEXT NOT NULL DEFAULT '',
      purpose     TEXT NOT NULL DEFAULT '',
      extra       TEXT NOT NULL DEFAULT '{}',
      source      TEXT NOT NULL DEFAULT 'local',
      is_builtin  INTEGER NOT NULL DEFAULT 0,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (kind, name)
    );
    CREATE INDEX IF NOT EXISTS idx_kb_kind ON kb_entries(kind);
    CREATE INDEX IF NOT EXISTS idx_kb_name ON kb_entries(name);

    CREATE TABLE IF NOT EXISTS scan_records (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id      TEXT NOT NULL UNIQUE,
      product_name     TEXT NOT NULL DEFAULT '',
      barcode          TEXT NOT NULL DEFAULT '',
      data_source      TEXT NOT NULL DEFAULT '',
      ingredient_count INTEGER NOT NULL DEFAULT 0,
      snapshot         TEXT NOT NULL DEFAULT '{}',
      created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS compare_sets (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL DEFAULT '',
      analysis_ids TEXT NOT NULL DEFAULT '[]',
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS off_cache (
      barcode    TEXT PRIMARY KEY,
      payload    TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    );
  `);
}

// ---------- 种子数据 ----------

/** 内置 8 大类过敏原（与前端 ALLERGEN_OPTIONS key 对齐） */
const ALLERGEN_SEED: Array<{
  name: string;
  aliases: string[];
  oneLiner: string;
  rules: string;
}> = [
  {
    name: "花生/坚果",
    aliases: ["花生", "杏仁", "榛子", "腰果", "核桃", "开心果", "夏威夷果", "碧根果"],
    oneLiner: "花生及树坚果类，我国最常见的食物过敏原之一。",
    rules: "配料含花生、杏仁、榛子、核桃等坚果时判定为潜在过敏原。",
  },
  {
    name: "甲壳类",
    aliases: ["虾", "蟹", "龙虾", "虾仁", "蟹肉", "虾皮"],
    oneLiner: "虾、蟹等甲壳类水产品及其制品。",
    rules: "配料含虾、蟹、龙虾等甲壳类成分时判定为潜在过敏原。",
  },
  {
    name: "鱼类",
    aliases: ["三文鱼", "金枪鱼", "鳕鱼", "鱼排", "鱼粉", "鱼露"],
    oneLiner: "鱼类及其制品，过敏人群需避开鱼油、鱼露等衍生品。",
    rules: "配料含鱼类成分或其制品时判定为潜在过敏原。",
  },
  {
    name: "大豆",
    aliases: ["黄豆", "大豆蛋白", "豆粕", "豆腐", "豆浆", "酱油"],
    oneLiner: "大豆及其制品，豆油、大豆卵磷脂等加工成分常见于各类食品。",
    rules: "配料含大豆、大豆蛋白、大豆卵磷脂、酱油等时判定为潜在过敏原。",
  },
  {
    name: "乳",
    aliases: ["牛乳", "乳粉", "乳清", "乳糖", "黄油", "酪蛋白"],
    oneLiner: "乳及乳制品，乳糖不耐受与乳蛋白过敏人群需留意。",
    rules: "配料含乳、乳粉、乳清、酪蛋白等乳制品时判定为潜在过敏原。",
  },
  {
    name: "麸质",
    aliases: ["面筋", "谷蛋白", "小麦", "大麦", "黑麦", "麦芽"],
    oneLiner: "小麦、大麦、黑麦中的谷蛋白，面包糕点类主食常见。",
    rules: "配料含小麦、大麦、黑麦或麦芽等时判定为潜在过敏原。",
  },
  {
    name: "鸡蛋",
    aliases: ["蛋清", "蛋黄", "蛋粉", "蛋白粉"],
    oneLiner: "鸡蛋及蛋制品，烘焙类食品常见。",
    rules: "配料含鸡蛋、蛋清、蛋黄或蛋粉时判定为潜在过敏原。",
  },
  {
    name: "芝麻",
    aliases: ["芝麻酱", "芝麻油", "白芝麻", "黑芝麻"],
    oneLiner: "芝麻及其制品，酱料与糕点中常见。",
    rules: "配料含芝麻、芝麻酱、芝麻油时判定为潜在过敏原。",
  },
];

function ingredientToRow(name: string, kb: IngredientKnowledge) {
  return {
    kind: "ingredient" as KbKind,
    name,
    aliases: JSON.stringify(kb.aliases ?? []),
    category: kb.category,
    ins_e: "",
    one_liner: kb.oneLiner,
    purpose: kb.purpose,
    extra: JSON.stringify({
      processingNature: kb.processingNature ?? "",
      detail: kb.detail ?? "",
      allergens: kb.allergens ?? [],
    }),
    source: kb.source,
  };
}

function additiveToRow(name: string, kb: AdditiveKnowledge) {
  return {
    kind: "additive" as KbKind,
    name,
    aliases: JSON.stringify(kb.aliases ?? []),
    category: kb.type ?? "",
    ins_e: kb.insE,
    one_liner: kb.oneLiner,
    purpose: kb.purpose,
    extra: JSON.stringify({
      commonUses: kb.commonUses ?? "",
      whyAdded: kb.whyAdded ?? "",
      safetyNote: kb.safetyNote ?? "",
      caution: kb.caution ?? "",
      audience: kb.audience ?? "",
      usageScope: kb.usageScope ?? "",
    }),
    source: kb.source,
  };
}

/** 播种/恢复内置数据（upsert 内置条目，不动用户自定义条目） */
export function reseedBuiltin(): { ingredient: number; additive: number; allergen: number } {
  return seedInternal(getDb());
}

/**
 * 播种内部实现：直接使用传入的 db 实例执行 upsert。
 * 注意：这里绝不能回调 getDb()——getDb → seedIfNeeded → reseedBuiltin → getDb
 * 会形成无限递归导致栈溢出（实际踩坑）。
 */
function seedInternal(db: Database.Database): { ingredient: number; additive: number; allergen: number } {
  const upsert = db.prepare(`
    INSERT INTO kb_entries (kind, name, aliases, category, ins_e, one_liner, purpose, extra, source, is_builtin, updated_at)
    VALUES (@kind, @name, @aliases, @category, @ins_e, @one_liner, @purpose, @extra, @source, 1, @updated_at)
    ON CONFLICT(kind, name) DO UPDATE SET
      aliases = excluded.aliases,
      category = excluded.category,
      ins_e = excluded.ins_e,
      one_liner = excluded.one_liner,
      purpose = excluded.purpose,
      extra = excluded.extra,
      source = excluded.source,
      is_builtin = 1,
      updated_at = excluded.updated_at
  `);

  const run = db.transaction(() => {
    let ingredient = 0;
    let additive = 0;
    let allergen = 0;
    for (const [name, kb] of Object.entries(INGREDIENT_KB)) {
      upsert.run({ ...ingredientToRow(name, kb), updated_at: kb.updatedAt });
      ingredient += 1;
    }
    for (const [name, kb] of Object.entries(ADDITIVE_KB)) {
      upsert.run({ ...additiveToRow(name, kb), updated_at: kb.updatedAt });
      additive += 1;
    }
    for (const a of ALLERGEN_SEED) {
      upsert.run({
        kind: "allergen",
        name: a.name,
        aliases: JSON.stringify(a.aliases),
        category: "allergen",
        ins_e: "",
        one_liner: a.oneLiner,
        purpose: a.rules,
        extra: "{}",
        source: "GB 7718 / 中国食品标签法规",
        updated_at: "2026-08-28",
      });
      allergen += 1;
    }
    return { ingredient, additive, allergen };
  });

  const counts = run();
  db.prepare(
    `INSERT INTO meta (key, value) VALUES ('kb_seed_version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(SEED_VERSION);
  return counts;
}

function seedIfNeeded(db: Database.Database) {
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'kb_seed_version'`).get() as
    | { value: string }
    | undefined;
  if (row?.value !== SEED_VERSION) {
    seedInternal(db);
  }
}

// ---------- 知识库查询 ----------

function rowToKbRow(r: Record<string, unknown>): KbRow {
  let aliases: string[] = [];
  let extra: Record<string, unknown> = {};
  try {
    aliases = JSON.parse(String(r.aliases ?? "[]"));
  } catch {
    aliases = [];
  }
  try {
    extra = JSON.parse(String(r.extra ?? "{}"));
  } catch {
    extra = {};
  }
  return {
    id: Number(r.id),
    kind: r.kind as KbKind,
    name: String(r.name),
    aliases,
    category: String(r.category ?? ""),
    ins_e: String(r.ins_e ?? ""),
    one_liner: String(r.one_liner ?? ""),
    purpose: String(r.purpose ?? ""),
    extra,
    source: String(r.source ?? ""),
    is_builtin: Number(r.is_builtin ?? 0),
    updated_at: String(r.updated_at ?? ""),
  };
}

/**
 * 公共知识查询（与旧 JSON 版行为一致：精确名 → 别名；不做模糊，避免详情弹窗误配）
 * 返回 null 表示未命中；kind 用于区分类型。
 */
export function lookupKnowledge(
  q: string,
  type: "ingredient" | "additive" | "auto" = "auto"
): { kind: "ingredient" | "additive"; row: KbRow } | null {
  const db = getDb();
  const exact = db.prepare(`SELECT * FROM kb_entries WHERE kind = @kind AND name = @name`);
  const byAlias = db.prepare(`SELECT * FROM kb_entries WHERE kind = @kind AND aliases LIKE @pattern`);

  const tryLookup = (kind: "ingredient" | "additive"): { kind: "ingredient" | "additive"; row: KbRow } | null => {
    const hit = exact.get({ kind, name: q }) as Record<string, unknown> | undefined;
    if (hit) return { kind, row: rowToKbRow(hit) };
    // 别名匹配：aliases JSON 里存在完整别名（用 "name" 双引号包裹避免子串误配）
    const aliasHit = byAlias.get({ kind, pattern: `%"${q}"%` }) as Record<string, unknown> | undefined;
    if (aliasHit) return { kind, row: rowToKbRow(aliasHit) };
    return null;
  };

  if (type === "additive" || type === "auto") {
    const r = tryLookup("additive");
    if (r) return r;
  }
  if (type === "ingredient" || type === "auto") {
    const r = tryLookup("ingredient");
    if (r) return r;
  }
  return null;
}

/** 后台列表（分页 + 搜索，别名与名称均可搜） */
export function listKb(opts: {
  kind: KbKind;
  search?: string;
  page?: number;
  pageSize?: number;
}): { total: number; page: number; pageSize: number; items: KbRow[] } {
  const db = getDb();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 10));
  const search = (opts.search ?? "").trim();

  const where = search
    ? `WHERE kind = @kind AND (name LIKE @like OR aliases LIKE @like)`
    : `WHERE kind = @kind`;
  const params = search
    ? { kind: opts.kind, like: `%${search}%` }
    : { kind: opts.kind };

  const totalRow = db.prepare(`SELECT COUNT(*) AS c FROM kb_entries ${where}`).get(params) as { c: number };
  const rows = db
    .prepare(`SELECT * FROM kb_entries ${where} ORDER BY is_builtin DESC, id ASC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize }) as Record<string, unknown>[];

  return {
    total: Number(totalRow.c),
    page,
    pageSize,
    items: rows.map(rowToKbRow),
  };
}

/** 各类别计数（后台统计卡片） */
export function countKb(): Record<KbKind, number> {
  const db = getDb();
  const rows = db
    .prepare(`SELECT kind, COUNT(*) AS c FROM kb_entries GROUP BY kind`)
    .all() as Array<{ kind: string; c: number }>;
  return {
    ingredient: 0,
    additive: 0,
    allergen: 0,
    ...Object.fromEntries(rows.map((r) => [r.kind, Number(r.c)])),
  };
}

export function getKbById(id: number): KbRow | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM kb_entries WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToKbRow(row) : null;
}

/** 新增条目（同名冲突返回 { error }） */
export function createKb(input: KbInput): { id: number } | { error: string } {
  const db = getDb();
  const name = (input.name ?? "").trim();
  if (!name) return { error: "名称不能为空" };
  const exists = db
    .prepare(`SELECT id FROM kb_entries WHERE kind = ? AND name = ?`)
    .get(input.kind, name);
  if (exists) return { error: `同名条目已存在（${name}）` };
  const info = db
    .prepare(
      `INSERT INTO kb_entries (kind, name, aliases, category, ins_e, one_liner, purpose, extra, source, is_builtin)
       VALUES (@kind, @name, @aliases, @category, @ins_e, @one_liner, @purpose, @extra, @source, 0)`
    )
    .run({
      kind: input.kind,
      name,
      aliases: JSON.stringify(input.aliases ?? []),
      category: input.category ?? "",
      ins_e: input.ins_e ?? "",
      one_liner: input.one_liner ?? "",
      purpose: input.purpose ?? "",
      extra: JSON.stringify(input.extra ?? {}),
      source: input.source ?? "local",
    });
  return { id: Number(info.lastInsertRowid) };
}

/** 更新条目（重名冲突返回 { error }） */
export function updateKb(id: number, input: KbInput): { ok: true } | { error: string } {
  const db = getDb();
  const name = (input.name ?? "").trim();
  if (!name) return { error: "名称不能为空" };
  const dup = db
    .prepare(`SELECT id FROM kb_entries WHERE kind = ? AND name = ? AND id != ?`)
    .get(input.kind, name, id);
  if (dup) return { error: `同名条目已存在（${name}）` };
  db.prepare(
    `UPDATE kb_entries SET
       name = @name, aliases = @aliases, category = @category, ins_e = @ins_e,
       one_liner = @one_liner, purpose = @purpose, extra = @extra, source = @source,
       updated_at = datetime('now')
     WHERE id = @id`
  ).run({
    id,
    name,
    aliases: JSON.stringify(input.aliases ?? []),
    category: input.category ?? "",
    ins_e: input.ins_e ?? "",
    one_liner: input.one_liner ?? "",
    purpose: input.purpose ?? "",
    extra: JSON.stringify(input.extra ?? {}),
    source: input.source ?? "local",
  });
  return { ok: true };
}

export function deleteKb(id: number): boolean {
  const db = getDb();
  return db.prepare(`DELETE FROM kb_entries WHERE id = ?`).run(id).changes > 0;
}

// ---------- 扫描历史 ----------

export function saveScanRecord(input: ScanRecordInput): { saved: boolean; id?: number } {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT OR IGNORE INTO scan_records
         (analysis_id, product_name, barcode, data_source, ingredient_count, snapshot)
       VALUES (@analysis_id, @product_name, @barcode, @data_source, @ingredient_count, @snapshot)`
    )
    .run({
      analysis_id: input.analysis_id,
      product_name: input.product_name ?? "",
      barcode: input.barcode ?? "",
      data_source: input.data_source ?? "",
      ingredient_count: input.ingredient_count ?? 0,
      snapshot: JSON.stringify(input.snapshot ?? {}),
    });
  return { saved: info.changes > 0, id: info.changes > 0 ? Number(info.lastInsertRowid) : undefined };
}

export function listScanRecords(limit = 10): Array<Record<string, unknown>> {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, analysis_id, product_name, barcode, data_source, ingredient_count, created_at
       FROM scan_records ORDER BY id DESC LIMIT ?`
    )
    .all(Math.min(100, Math.max(1, limit))) as Array<Record<string, unknown>>;
}

export function countScanRecords(): number {
  const db = getDb();
  return Number((db.prepare(`SELECT COUNT(*) AS c FROM scan_records`).get() as { c: number }).c);
}

export function deleteScanRecord(id: number): boolean {
  const db = getDb();
  return db.prepare(`DELETE FROM scan_records WHERE id = ?`).run(id).changes > 0;
}

// ---------- OFF 数据缓存（按条码，1 小时 TTL） ----------

export interface OffCacheEntry {
  barcode: string;
  payload: unknown;
  fetched_at: number;
}

export function getOffCache(barcode: string): OffCacheEntry | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM off_cache WHERE barcode = ?`).get(barcode) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  let payload: unknown = null;
  try {
    payload = JSON.parse(String(row.payload));
  } catch {
    return null;
  }
  return { barcode: String(row.barcode), payload, fetched_at: Number(row.fetched_at) };
}

export function setOffCache(barcode: string, payload: unknown): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO off_cache (barcode, payload, fetched_at) VALUES (?, ?, ?)
     ON CONFLICT(barcode) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`
  ).run(barcode, JSON.stringify(payload), Date.now());
}

/** 清空 OFF 缓存（后台「立即强制更新」） */
export function clearOffCache(): number {
  const db = getDb();
  return db.prepare(`DELETE FROM off_cache`).run().changes;
}

export function countOffCache(): number {
  const db = getDb();
  return Number((db.prepare(`SELECT COUNT(*) AS c FROM off_cache`).get() as { c: number }).c);
}

export function lastOffFetch(): number | null {
  const db = getDb();
  const row = db.prepare(`SELECT MAX(fetched_at) AS m FROM off_cache`).get() as {
    m: number | null;
  };
  return row.m ? Number(row.m) : null;
}
