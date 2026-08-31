# 组件库规范 V1

> 文件位置：`docs/02-component-library.md`
> 目的：定义 V1 全站复用的 UI 组件，统一调用接口
> 所有组件命名、props 命名沿用 React 风格，便于后续工程化

---

## 全局约定

- 所有交互元素必须支持键盘可达（`Tab` / `Enter` / `Esc`）。
- 触控目标 ≥ 44 × 44 px（移动端）。
- 文案沿用 `docs/01-design-reconciliation.md` 第 5 节基线。
- 颜色仅使用 `tokens/design-tokens.css` 中定义的变量，禁止硬编码色值。

---

## 1. Button

### 1.1 变体

| 变体 | 用途 | 样式 |
|---|---|---|
| `primary` | 主操作（确认分析、查看详情） | 实心 `var(--color-primary)` 背景，白字 |
| `secondary` | 次要操作（取消、返回） | 1px `var(--color-primary)` 描边，透明背景，蓝字 |
| `ghost` | 弱操作（清空、删除） | 无背景无描边，文字按钮，主色字 |
| `danger` | 不可逆操作（删除历史） | `var(--color-error)` 背景 |
| `disabled` | 不可点击 | 灰底 `#e0e8ff`，`#737685` 字 |

### 1.2 尺寸

| 尺寸 | 高度 | 内边距 | 字号 |
|---|---|---|---|
| `sm` | 32px | 0 12px | 14px |
| `md` | 40px | 0 16px | 14px |
| `lg` | 48px | 0 20px | 16px |

### 1.3 Props（示意）

```ts
type ButtonProps = {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'disabled';
  size: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};
```

---

## 2. Input

### 2.1 变体

- `default`：默认文本输入
- `textarea`：多行（配料文字输入用）
- `search`：搜索框（带右侧图标按钮）

### 2.2 状态

- 默认：1px `var(--color-outline-variant)` 描边
- Hover：描边变 `var(--color-outline)`
- Focus：2px `var(--color-primary)` + 4px `var(--color-primary-fixed)` 外发光
- Error：1px `var(--color-error)` + 错误提示文案
- Disabled：背景 `var(--color-surface-container)`

### 2.3 Props

```ts
type InputProps = {
  value: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
  leftIcon?: IconName;
  rightSlot?: ReactNode;   // 用于候选弹出 / 搜索按钮
  suggestions?: string[];  // 实时候选
  confidence?: 'high' | 'medium' | 'low' | 'manual';  // 用于配料确认页
  error?: string;
  onChange: (v: string) => void;
  onSelectSuggestion?: (s: string) => void;
};
```

---

## 3. Card

通用容器，按用途细分。

| 类型 | 用途 | 备注 |
|---|---|---|
| `Card` | 通用白底容器 | 1px 描边 + 8px 圆角 |
| `Card.stat` | 统计数字卡 | 大号数字 + 趋势/进度条 |
| `Card.entry` | 首页入口卡 | 大图标 + 标题 + 描述 |
| `Card.ingredient` | 配料项 | 序号 + 名称 + 分类标签 + 状态徽章 |
| `Card.allergen` | 过敏原项 | 红色描边 + 来源配料列表 |
| `Card.additive` | 添加剂项 | 名称 + 类型 + 用途 + 关注人群 |
| `Card.history` | 历史项 | 产品图 + 名称 + 时间 + 操作 |

---

## 4. Chip / Tag / Badge

### 4.1 语义映射（强制）

> 2026-08-31 业务方指定：天然=浅绿 · 加工=浅黄 · 添加剂=浅红 · 过敏原=浅紫

| 含义 | 背景 | 文字 | 边框 | 示意色值 |
|---|---|---|---|---|
| 天然 / 基础原料 | `--color-status-natural-bg` | `--color-status-natural-fg` | `--color-status-natural-border` | 浅绿 |
| 加工原料 | `--color-status-processed-bg` | `--color-status-processed-fg` | `--color-status-processed-border` | 浅黄 |
| 食品添加剂 | `--color-status-additive-bg` | `--color-status-additive-fg` | `--color-status-additive-border` | 浅红 |
| 潜在过敏原 | `--color-status-allergen-bg` | `--color-status-allergen-fg` | `--color-status-allergen-border` | 浅紫 |
| 关注提示 | `--color-status-warning-bg` | `--color-status-warning-fg` | `--color-status-warning-border` | — |
| 信息提示 | `--color-status-info-bg` | `--color-status-info-fg` | `--color-status-info-border` | — |

> 颜色仅为分类事实标签，不代表安全/危险评价。

### 4.2 尺寸

- `sm`：高度 20px，字号 10px，内边距 0 6px
- `md`：高度 24px，字号 12px，内边距 0 8px

### 4.3 置信度徽章（配料确认页专用）

| 等级 | 标签 | 颜色 |
|---|---|---|
| `high` | 高可信 | `--color-secondary-container` |
| `medium` | 中可信 | `--color-status-warning-bg` |
| `low` | 低可信 | `--color-status-allergen-bg` |
| `manual` | 人工修改 | `--color-status-info-bg` |

---

## 5. BottomSheet / Modal

### 5.1 BottomSheet

- 移动端：底部弹出，圆角 12px 顶部，背景 `var(--color-surface-container-lowest)`。
- PC 端：右侧抽屉（480px 宽），圆角 12px 左侧。
- 遮罩：`rgba(4, 27, 60, 0.32)` + `var(--backdrop-blur)`。
- 关闭：点击遮罩、`Esc`、顶部关闭按钮、上滑关闭（移动端）。

### 5.2 内容结构（配料详情弹窗）

```
┌─────────────────────────────────┐
│  山梨酸钾              [✕]      │  标题 + 关闭
├─────────────────────────────────┤
│  类型：防腐剂                   │  一句话解释
│  主要用途：抑制微生物生长…      │
│  关注程度：相关人群需注意       │
├─────────────────────────────────┤
│  为什么添加 / 是什么           │  折叠区 1
│  注意事项                       │
│  关注人群                       │
├─────────────────────────────────┤
│  INS / E 编号、来源、更新时间   │  折叠区 2（默认收起）
├─────────────────────────────────┤
│  配料表位置：第 5 项           │
│  发现识别错误？[修改配料名称]   │  底部操作
└─────────────────────────────────┘
```

### 5.3 Props

```ts
type BottomSheetProps = {
  open: boolean;
  title: string;
  size?: 'sm' | 'md' | 'lg';   // sm: 详情 / md: 编辑 / lg: 全屏
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};
```

---

## 6. ConfidenceBar（置信度条）

配料确认页 / 后台 OCR 统计专用。

| 状态 | 颜色 |
|---|---|
| 高（≥ 80%） | `var(--color-secondary)` |
| 中（60-79%） | `var(--color-status-warning-fg)` |
| 低（< 60%） | `var(--color-error)` |

---

## 7. IngredientRow（配料行）

```text
┌─────────────────────────────────────────────────┐
│ 01   小麦粉              [天然] [高可信]   ⋯    │
│ 02   白砂糖              [天然] [高可信]   ⋯    │
│ 03   植物油              [天然] [高可信]   ⋯    │
│ 04   乳粉         ⚠建议确认  [天然] [中可信]   ⋯  │
│ 05   山梨酸钾             [添加剂] [高可信] ⋯  │
└─────────────────────────────────────────────────┘
```

- 序号：等宽字体 `var(--font-mono)`，12px，灰色。
- 名称：14-16px，可点击打开 BottomSheet。
- 标签：`Chip` 语义映射。
- 操作：拖拽手柄、删除、编辑（点击名称或 `⋯`）。

---

## 8. AllergenCard（过敏原项）

```text
┌─ 红色描边 ────────────────────────────────────┐
│  ⚠ 小麦                                       │
│  来源：                                        │
│    · 小麦粉（第 4 项）                         │
│    · 麦芽糖浆（第 7 项）                       │
│                                                │
│  配料中包含可能属于常见过敏原类别的成分，       │
│  请相关人群注意。请以食品包装上的过敏原         │
│  声明及专业建议为准。                          │
└────────────────────────────────────────────────┘
```

---

## 9. CompositionRing（成分构成环形图）

替换原型的"Safety Grade"环形。展示分类构成，**不表达好坏**。

- 4 段（按需）：天然 / 加工 / 添加剂 / 过敏原提示项。
- 中心文字：配料总项数。
- 配色：`--ring-natural` / `--ring-processed` / `--ring-additive` / `--ring-allergen`，轨道色 `--ring-track`。
- 必须配图例，不能单靠颜色区分。

---

## 10. ComparisonMatrix（对比矩阵）

```text
┌──────────────┬──────┬──────┬──────┐
│ 类型         │ 食品 A │ 食品 B │ 食品 C │
├──────────────┼──────┼──────┼──────┤
│ 配料数量     │  12   │  15   │  11   │
│ 食品添加剂   │   3   │   5   │   2   │
│ 潜在过敏原   │   2   │   2   │   1   │
│ 防腐剂       │   1   │   2   │   0   │
│ 甜味剂       │   0   │   1   │   0   │
└──────────────┴──────┴──────┴──────┘
```

- 移动端横向滚动。
- 共同项 / 独有项 / 缺少项按 PRD §15.4 标记。

---

## 11. AppBar / TabBar

### 11.1 PC 顶部 AppBar

- 高度 64px，背景 `var(--color-surface-container-lowest)`，底部 1px 描边。
- 左：Logo + 产品名。
- 右：过敏原关注项入口 + 后台入口（仅管理员）。
- 不显示通知、头像、订阅、Pro 标签。

### 11.2 移动端 BottomTabBar

- 高度 64px + 安全区。
- Tab：`首页 / 历史 / 对比 / 我的`。
- 选中态：`var(--color-primary-container)` 背景圆角 12px。
- 不显示：饮食计划 / 社区 / 个人健康档案。

---

## 12. Toast / Snackbar

- 顶部居中（移动端）或右下角（PC）。
- 4 秒自动关闭。
- 变体：`info` / `success` / `warning` / `error`。

---

## 13. EmptyState

- 图标 + 标题 + 描述 + 主操作按钮。
- 例：暂无历史分析 / 配料表无数据 / 数据库加载失败。

---

## 14. LoadingState

- 三种：`skeleton`（骨架屏）/ `spinner`（转圈）/ `progress`（带百分比，用于 OCR / AI）。
- 全局 loading 时锁滚动。

---

## 15. Icon 系统

- 库：Material Symbols Rounded（与原型风格一致）。
- 尺寸：`sm` 16px / `md` 20px / `lg` 24px / `xl` 32px。
- 颜色：继承 `currentColor`。

---

## 16. 必读

1. 所有颜色引用 `tokens/design-tokens.css`，禁止在组件内部硬编码。
2. 所有文案遵守 `docs/01-design-reconciliation.md` §5 语气基线。
3. 所有详情用 BottomSheet / Modal，不跳页。
4. 移动端触控目标 ≥ 44 × 44 px。
5. 设计稿交付前必须跑完 §8 自检清单。