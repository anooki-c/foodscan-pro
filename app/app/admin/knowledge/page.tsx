"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchKbStats,
  fetchKbList,
  createKbItem,
  updateKbItem,
  deleteKbItem,
  reseedKnowledge,
  type KbItem,
  type KbKind,
} from "@/lib/services/api";
import styles from "../pages.module.css";

/* ---------- 按 kind 的表单字段定义 ---------- */

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  wide?: boolean; // 占满整行
}

const FIELDS: Record<KbKind, FieldDef[]> = {
  ingredient: [
    { key: "name", label: "标准名称", type: "text", required: true, placeholder: "如：小麦粉" },
    { key: "aliases", label: "别名（逗号分隔）", type: "text", placeholder: "如：面粉" },
    { key: "category", label: "分类", type: "select", options: [
      { value: "natural", label: "天然原料" },
      { value: "processed", label: "加工制品" },
    ] },
    { key: "oneLiner", label: "一句话解释", type: "text" },
    { key: "purpose", label: "主要用途", type: "text" },
    { key: "processingNature", label: "加工性质", type: "text", placeholder: "如：基础原料" },
    { key: "detail", label: "详细说明", type: "textarea", wide: true },
    { key: "allergens", label: "潜在过敏原（逗号分隔）", type: "text", placeholder: "如：麸质、乳" },
    { key: "source", label: "数据来源", type: "text", placeholder: "如：GB/T 1355 / OFF" },
  ],
  additive: [
    { key: "name", label: "标准名称", type: "text", required: true, placeholder: "如：山梨酸钾" },
    { key: "aliases", label: "别名（逗号分隔）", type: "text", placeholder: "如：山梨酸钾盐" },
    { key: "insE", label: "E 编号", type: "text", placeholder: "如：E202" },
    { key: "type", label: "添加剂类型", type: "text", placeholder: "如：防腐剂" },
    { key: "oneLiner", label: "一句话解释", type: "text" },
    { key: "purpose", label: "主要用途", type: "text" },
    { key: "commonUses", label: "常见应用", type: "text" },
    { key: "whyAdded", label: "为什么添加", type: "text" },
    { key: "safetyNote", label: "安全性说明", type: "textarea", wide: true },
    { key: "caution", label: "注意事项", type: "textarea", wide: true },
    { key: "audience", label: "关注人群", type: "text" },
    { key: "usageScope", label: "使用范围", type: "text" },
    { key: "source", label: "数据来源", type: "text" },
  ],
  allergen: [
    { key: "name", label: "过敏原类别", type: "text", required: true, placeholder: "如：麸质" },
    { key: "aliases", label: "触发配料（逗号分隔）", type: "text", placeholder: "如：小麦、大麦、麦芽" },
    { key: "oneLiner", label: "一句话说明", type: "text" },
    { key: "purpose", label: "判定规则", type: "textarea", wide: true },
    { key: "source", label: "数据来源", type: "text" },
  ],
};

const EXTRA_FIELDS: Record<KbKind, string[]> = {
  ingredient: ["processingNature", "detail", "allergens"],
  additive: ["commonUses", "whyAdded", "safetyNote", "caution", "audience", "usageScope"],
  allergen: [],
};

const TAB_META: Record<KbKind, { label: string; desc: string }> = {
  ingredient: { label: "配料库", desc: "天然原料 · 加工制品" },
  additive: { label: "添加剂库", desc: "含 E 编号与安全性说明" },
  allergen: { label: "过敏原库", desc: "8 大类 + 判定规则" },
};

const PAGE_SIZE = 10;

function emptyForm(kind: KbKind): Record<string, string> {
  const form: Record<string, string> = {};
  FIELDS[kind].forEach((f) => (form[f.key] = ""));
  return form;
}

function itemToForm(item: KbItem, kind: KbKind): Record<string, string> {
  const form = emptyForm(kind);
  form.name = item.name;
  form.aliases = (item.aliases ?? []).join("、");
  if (kind === "ingredient") {
    form.category = item.category || "natural";
    form.oneLiner = item.one_liner;
    form.purpose = item.purpose;
    form.source = item.source;
    form.processingNature = String(item.extra?.processingNature ?? "");
    form.detail = String(item.extra?.detail ?? "");
    form.allergens = Array.isArray(item.extra?.allergens)
      ? (item.extra.allergens as string[]).join("、")
      : "";
  } else if (kind === "additive") {
    form.insE = item.ins_e;
    form.type = item.category;
    form.oneLiner = item.one_liner;
    form.purpose = item.purpose;
    form.source = item.source;
    EXTRA_FIELDS.additive.forEach((k) => (form[k] = String(item.extra?.[k] ?? "")));
  } else {
    form.oneLiner = item.one_liner;
    form.purpose = item.purpose;
    form.source = item.source;
  }
  return form;
}

function formToPayload(kind: KbKind, form: Record<string, string>) {
  const splitList = (s: string) =>
    s
      .split(/[、,，;；\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
  const base = {
    kind,
    name: form.name ?? "",
    aliases: splitList(form.aliases ?? ""),
    category: form.category ?? "",
    ins_e: kind === "additive" ? (form.insE ?? "") : "",
    one_liner: form.oneLiner ?? "",
    purpose: form.purpose ?? "",
    source: form.source || "local",
  };
  const extra: Record<string, unknown> = {};
  if (kind === "ingredient") {
    extra.processingNature = form.processingNature ?? "";
    extra.detail = form.detail ?? "";
    extra.allergens = splitList(form.allergens ?? "");
  } else if (kind === "additive") {
    EXTRA_FIELDS.additive.forEach((k) => (extra[k] = form[k] ?? ""));
  }
  return { ...base, extra };
}

/* ---------- 页面 ---------- */

export default function KnowledgePage() {
  const [tab, setTab] = useState<KbKind>("additive");
  const [stats, setStats] = useState<Record<KbKind, number>>({ ingredient: 0, additive: 0, allergen: 0 });
  const [items, setItems] = useState<KbItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<null | { mode: "create" } | { mode: "edit"; item: KbItem }>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const reloadStats = useCallback(async () => {
    setStats(await fetchKbStats());
  }, []);

  const loadList = useCallback(
    async (kind: KbKind, p: number, s: string) => {
      setLoading(true);
      const res = await fetchKbList({ kind, search: s, page: p, pageSize: PAGE_SIZE });
      setLoading(false);
      if (res) {
        setItems(res.items);
        setTotal(res.total);
        setPage(res.page);
      } else {
        setItems([]);
        setTotal(0);
      }
    },
    []
  );

  useEffect(() => {
    reloadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSearch("");
    setSearchInput("");
    setPage(1);
    loadList(tab, 1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const doSearch = () => {
    setPage(1);
    loadList(tab, 1, searchInput.trim());
  };

  const openCreate = () => {
    setMsg("");
    setErr("");
    setEditing({ mode: "create" });
    setForm(emptyForm(tab));
  };

  const openEdit = (item: KbItem) => {
    setMsg("");
    setErr("");
    setEditing({ mode: "edit", item });
    setForm(itemToForm(item, tab));
  };

  const closeForm = () => {
    setEditing(null);
    setForm({});
  };

  const submitForm = async () => {
    if (!editing) return;
    if (!form.name?.trim()) {
      setErr("请填写名称");
      return;
    }
    setSaving(true);
    setMsg("");
    setErr("");
    const payload = formToPayload(tab, form);
    const res =
      editing.mode === "create"
        ? await createKbItem(payload)
        : await updateKbItem(editing.item.id, payload);
    setSaving(false);
    if (!res.ok) {
      setErr(res.error ?? "保存失败");
      return;
    }
    setMsg(editing.mode === "create" ? `已新增「${form.name}」` : `已更新「${form.name}」`);
    closeForm();
    reloadStats();
    loadList(tab, editing.mode === "edit" ? page : 1, search);
  };

  const removeItem = async (item: KbItem) => {
    const tip = item.is_builtin
      ? `「${item.name}」为内置条目，删除后可通过「恢复内置数据」找回。确定删除？`
      : `确定删除「${item.name}」？`;
    if (!window.confirm(tip)) return;
    const res = await deleteKbItem(item.id);
    if (!res.ok) {
      setErr(res.error ?? "删除失败");
      return;
    }
    setMsg(`已删除「${item.name}」`);
    reloadStats();
    loadList(tab, page, search);
  };

  const restoreBuiltin = async () => {
    if (!window.confirm("将用内置数据覆盖同名的内置条目（用户自定义条目不受影响），确定恢复？")) return;
    setLoading(true);
    const res = await reseedKnowledge();
    setLoading(false);
    if (!res.ok) {
      setErr(res.error ?? "恢复失败");
      return;
    }
    setMsg(`已恢复内置数据（配料 ${res.counts?.ingredient ?? 0} · 添加剂 ${res.counts?.additive ?? 0} · 过敏原 ${res.counts?.allergen ?? 0}）`);
    reloadStats();
    loadList(tab, 1, search);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const renderForm = () => {
    if (!editing) return null;
    const kind = tab;
    return (
      <div className={`${styles.card} ${styles.sectionGap}`} style={{ border: "1px solid var(--color-primary-fixed)" }}>
        <h3 style={{ marginBottom: 16 }}>
          {editing.mode === "create" ? `新增${TAB_META[kind].label}条目` : `编辑「${editing.item.name}」`}
        </h3>
        <div className={styles.formGrid}>
          {FIELDS[kind].map((f) => (
            <div key={f.key} className={styles.field} style={f.wide ? { gridColumn: "1 / -1" } : undefined}>
              <label>
                {f.label}
                {f.required ? " *" : ""}
              </label>
              {f.type === "select" ? (
                <select
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  style={{ height: 40, borderRadius: "var(--radius-default)", border: "1px solid var(--color-divider)", background: "var(--color-surface-container-lowest)", padding: "0 12px", font: "500 13px/1 var(--font-body)", color: "var(--color-text-primary)" }}
                >
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={3}
                  style={{ borderRadius: "var(--radius-default)", border: "1px solid var(--color-divider)", background: "var(--color-surface-container-lowest)", padding: "10px 12px", font: "500 13px/1.6 var(--font-body)", color: "var(--color-text-primary)", resize: "vertical" }}
                />
              ) : (
                <input
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={styles.btnPrimary} onClick={submitForm} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </button>
          <button className={styles.btnSm} onClick={closeForm}>
            取消
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className={styles.pageTitle}>
        <h1>知识库管理</h1>
        <p>配料库 · 添加剂库 · 过敏原库（SQLite 持久化，可增删改查）</p>
      </div>

      <div className={`${styles.grid} ${styles.cols3}`}>
        {(Object.keys(TAB_META) as KbKind[]).map((k) => (
          <div key={k} className={styles.card} style={{ cursor: "pointer" }} onClick={() => setTab(k)}>
            <div className={styles.label}>{TAB_META[k].label}</div>
            <div className={styles.value}>{stats[k]}</div>
            <div className={styles.sub}>{TAB_META[k].desc}</div>
          </div>
        ))}
      </div>

      <div className={styles.tabs} style={{ marginTop: 16 }}>
        {(Object.keys(TAB_META) as KbKind[]).map((k) => (
          <span key={k} className={`${styles.tab} ${tab === k ? styles.tabActive : ""}`} onClick={() => setTab(k)}>
            {TAB_META[k].label}
          </span>
        ))}
      </div>

      <div className={styles.card}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            style={{
              flex: 1,
              minWidth: 220,
              height: 36,
              borderRadius: "var(--radius-default)",
              border: "1px solid var(--color-divider)",
              background: "var(--color-surface-container-lowest)",
              padding: "0 12px",
              font: "500 13px/1 var(--font-body)",
              color: "var(--color-text-primary)",
            }}
            placeholder={`搜索 ${TAB_META[tab].label}（名称或别名）`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
          />
          <button className={styles.btnSm} onClick={doSearch} disabled={loading}>
            搜索
          </button>
          <button className={styles.btnSm} onClick={() => { setSearchInput(""); setSearch(""); setPage(1); loadList(tab, 1, ""); }} disabled={loading}>
            清空
          </button>
          <span style={{ flex: 1 }} />
          <button className={styles.btnSm} onClick={restoreBuiltin} disabled={loading} title="用内置数据覆盖同名的内置条目">
            恢复内置数据
          </button>
          <button className={styles.btnPrimary} style={{ height: 36, fontSize: 12 }} onClick={openCreate}>
            + 新增{tab === "additive" ? "添加剂" : tab === "allergen" ? "过敏原" : "配料"}
          </button>
        </div>

        {msg && <div className={`${styles.formMsg} ${styles.sectionGap}`}>{msg}</div>}
        {err && <div className={`${styles.formMsg} ${styles.formErr} ${styles.sectionGap}`}>{err}</div>}

        <div className={`${styles.tableWrap} ${styles.sectionGap}`}>
          <table className={styles.data}>
            <thead>
              <tr>
                <th>名称</th>
                <th>别名</th>
                <th>{tab === "additive" ? "E 编号" : tab === "ingredient" ? "分类" : "触发配料"}</th>
                <th>来源</th>
                <th>更新时间</th>
                <th style={{ textAlign: "right" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: 24 }}>
                    加载中…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: 24 }}>
                    暂无数据，点击右上角「新增」添加
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <strong style={{ fontSize: 13 }}>{it.name}</strong>
                      {it.is_builtin ? (
                        <span className={`${styles.tag} ${styles.tagPrimary}`} style={{ marginLeft: 8 }}>内置</span>
                      ) : (
                        <span className={`${styles.tag} ${styles.tagOff}`} style={{ marginLeft: 8 }}>自定义</span>
                      )}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {(it.aliases ?? []).slice(0, 4).join("、") || "—"}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {tab === "additive"
                        ? it.ins_e || "—"
                        : tab === "ingredient"
                          ? it.category === "processed" ? "加工制品" : it.category === "natural" ? "天然原料" : it.category || "—"
                          : (it.aliases ?? []).slice(0, 3).join("、") || "—"}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>{it.source || "—"}</td>
                    <td style={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{it.updated_at}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className={styles.btnSm} onClick={() => openEdit(it)}>
                        编辑
                      </button>
                      <button
                        className={styles.btnSm}
                        style={{ color: "var(--color-status-additive-fg)", marginRight: 0 }}
                        onClick={() => removeItem(it)}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, justifyContent: "flex-end" }}>
            <span style={{ font: "400 12px/16px var(--font-body)", color: "var(--color-text-secondary)" }}>
              共 {total} 条 · 第 {page} / {totalPages} 页
            </span>
            <button className={styles.btnSm} disabled={page <= 1 || loading} onClick={() => loadList(tab, page - 1, search)}>
              上一页
            </button>
            <button className={styles.btnSm} disabled={page >= totalPages || loading} onClick={() => loadList(tab, page + 1, search)}>
              下一页
            </button>
          </div>
        )}
      </div>

      {renderForm()}
    </div>
  );
}
