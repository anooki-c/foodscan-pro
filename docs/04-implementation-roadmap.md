# 实施路线图

> 文件位置：`docs/04-implementation-roadmap.md`
> 依据：PRD V1.0 + 设计文档 + MVP 优先级（PRD §21）

## 1. 技术栈建议

| 层 | 推荐 | 理由 |
|---|---|---|
| 前端框架 | **Next.js 14+ (App Router)** | 移动优先 + SSR + 静态导出能力；与 PWA、未来小程序复用组件天然契合 |
| 样式 | **CSS Modules + design-tokens.css** | 与设计 token 解耦；避免 Tailwind 与原型字体的视觉冲突 |
| 状态 | **Zustand / Jotai** | 配料确认页需要频繁更新顺序与候选匹配 |
| OCR | **第三方 OCR API → 本地 PaddleOCR → AI Vision** | 按 PRD §7.3 优先级链实现 |
| 图像处理 | **browser-image-compression + sharp（Node 侧）** | 方向校正、压缩、清晰度优化 |
| 数据库 | **PostgreSQL + Meilisearch** | OFF 数据导入 + 多字段模糊/拼音检索 |
| 缓存 | **Redis** | 条形码查询、数据源优先级路由 |
| 后台 | **Next.js Route Groups + Admin Guard** | V1 仅管理员可入 |
| 部署 | **Vercel / 自托管 Node** | V1 用户量小，无需复杂基础设施 |

> 技术选型为建议，不绑定实现。可按团队实际情况调整。

---

## 2. 里程碑划分

按 PRD §21 的 MVP 优先级拆为 4 个里程碑：

### M1 · 基础识别与分析（P0 核心闭环）
**目标**：从任意一种入口获得配料表后，能产出标准化结果。

- [ ] 配料输入（粘贴、手动）
- [ ] 配料拆分 + Top 5 实时候选
- [ ] 配料标准化（基础原料 / 加工原料 / 食品添加剂）
- [ ] 配料顺序调整（拖拽）
- [ ] 添加剂识别 + 类型 + 用途
- [ ] 过敏原识别 + 来源标注
- [ ] 配料详情 / 添加剂详情 BottomSheet
- [ ] 单品分析结果页
- [ ] 第三方 OCR 接入（默认 Provider）
- [ ] LocalStorage 历史记录
- [ ] 后台基础 CRUD（配料 / 添加剂 / 过敏原知识库）

### M2 · 增强识别与对比
- [ ] 条形码扫描 + OFF 本地数据
- [ ] 本地 OCR（PaddleOCR / Tesseract 备选）
- [ ] 多食品对比（2–5 个）
- [ ] AI 配料解读（受控调用）
- [ ] 图片方向校正 / 清晰度优化
- [ ] 置信度评分与提示

### M3 · 后台完善与配置化
- [ ] 后台 Dashboard 统计
- [ ] OCR / AI 多 Provider 配置
- [ ] 置信度阈值后台可调
- [ ] 数据源优先级排序
- [ ] OFF 自动更新（下载 → 校验 → 切换）
- [ ] AI Vision（可选兜底）

### M4 · 体验与可访问性
- [ ] PWA 化（离线缓存历史）
- [ ] 键盘可达性
- [ ] 屏幕阅读器适配
- [ ] 错误状态统一打磨
- [ ] 性能与 LCP 优化
- [ ] 国际化（中 / 英，预留）

> P1 钩子（收藏、关注项个人化）暂不进入 M4，待 PRD V1.1 评估。

---

## 3. 关键风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| OFF 数据全量过大（>10GB） | 本地索引构建慢 | 拆分为产品/配料/添加剂/过敏原四个独立索引；按需加载 |
| OCR 多 Provider 行为不一致 | 置信度评分混乱 | 在抽象层统一为内部评分（见 PRD §7.7） |
| AI 越界（替用户判断健康） | 违反 PRD §14.3 | prompt 强约束 + 后台调用审计；输出包含强制免责语 |
| 配料名多样化（别名 / 拼写差异） | 匹配命中率低 | 多级匹配：完全 / 前缀 / 包含 / 别名 / 拼音 / 语义（PRD §8.2） |
| 拖拽在移动端不灵敏 | 体验差 | 引入 `react-dnd` 或 `framer-motion` Reorder；提供上下箭头备用 |
| 过敏原误报 | 用户被误导 | 来源配料必须明示 + 不做医疗判断（PRD §11.2） |

---

## 4. 数据模型骨架

> ✅ V1 已落地：SQLite（better-sqlite3，`data/foodscan.db`，Docker 挂载卷持久化）。
> 实现见 `app/lib/server/db.ts`，工程化取舍如下：
> - **kb_entries**：配料/添加剂/过敏原合一表，`kind` 区分；配料与添加剂的异构字段
>   （配料：processingNature/detail/allergens；添加剂：safetyNote/caution/audience 等）
>   用 `aliases` / `extra` 两个 JSON 列承载，统一一套 CRUD，后台可直接管理。
> - **scan_records**：扫描历史，`analysis_id` 唯一（幂等写入），快照存 JSON。
> - **compare_sets**：V1 已建表，UI 暂仍用 localStorage，后续迁移。
> - 种子数据来自 `app/lib/knowledge.ts`（159 条）+ 内置 8 大类过敏原；
>   `meta.kb_seed_version` 控制升级增量播种，后台可一键「恢复内置数据」。

```text
kb_entries               知识库条目（配料 / 添加剂 / 过敏原）
  id, kind(ingredient|additive|allergen), name, aliases[],
  category, ins_e, one_liner, purpose, extra{}, source, is_builtin, updated_at

scan_record              历史分析
  id, analysis_id(UNIQUE), product_name, barcode, data_source,
  ingredient_count, snapshot{}, created_at

compare_set              对比组合（V1 建表，暂未启用）
  id, name, analysis_ids[], created_at, updated_at

meta                     元信息
  key, value（如 kb_seed_version）
```

规划参考（原表设计，供后续拆表/检索演进）：

```text
food_product            食品（来自数据库或手动）
  id, name, brand, barcode, source, source_updated_at, spec

food_ingredient         配料（确认后）
  id, product_id, original_text, final_text, std_id, original_pos, final_pos,
  match_score, match_method, source, confidence, is_manual

ingredient_std          标准配料
  id, std_name, aliases[], category(base/processed/additive), description, source

additive                添加剂
  id, name, ins_e_number, type, purpose, safety_note, caution, audience,
  usage_scope, source, updated_at

allergen                过敏原
  id, category, ingredient_ids[], aliases[], rules, source

scan_record             历史分析
  id, product_snapshot, ingredients_snapshot, result_snapshot,
  image_ref, created_at, updated_at

compare_set             对比组合
  id, product_ids[], created_at
```

所有 `source` / `updated_at` 字段强制保留，确保知识可追溯（PRD §17.6）。

---

## 5. 验收对照

每完成一个里程碑，逐条核验 PRD §22 的 14 条验收原则：
1. 多种入口触发
2. 条形码入口根据数据源启用状态显隐
3. OCR 三级优先级
4. 强制确认页
5. Top 5 实时候选
6. 用户确认结果进入正式分析
7. 三大分类
8. 添加剂详情完整
9. 过敏原中性表达
10. 详情用 BottomSheet
11. 2–5 个对比 + 顺序保留
12. AI 不越界
13. 后台可配全部项
14. V1 不含小程序 / 用户系统 / 营养成分表

---

## 6. 文档维护

- 任何 PRD 冲突解决 → 更新 `docs/01-design-reconciliation.md`
- 任何组件新增 / 变更 → 更新 `docs/02-component-library.md`
- 任何页面变更 → 更新 `docs/03-page-designs.md`
- 任何里程碑进度变化 → 更新本文件 §2