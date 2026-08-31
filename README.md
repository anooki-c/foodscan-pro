# 食品配料分析 · 设计交付包（V1）

> 基于 **PRD V1.0** 与 **FoodScan Pro 视觉原型** 衍生的设计基线。
> 2026-08-31 修订：视觉方向从 Clinical 蓝调切换为 **Wellness 调**（淡紫 → 粉），移动端优先。
> 已进入工程化：Next.js 14 + TypeScript + CSS Modules + Zustand。

## 📦 目录结构

```
2026-08-31-foodscan-pro/
├── README.md                       # 本文件
├── docs/                           # 设计文档
│   ├── 01-design-reconciliation.md   # PRD × 原型冲突备忘录（合规基线，含 §3.5 视觉方向变更）
│   ├── 02-component-library.md       # 组件库规范
│   ├── 03-page-designs.md            # 各页面设计规范
│   ├── 04-implementation-roadmap.md  # 实施路线图与数据模型
│   └── 05-deploy-synology.md         # 群晖 Docker 部署指南
├── tokens/
│   └── design-tokens.css             # 全站共享 CSS 变量（Wellness 调）
├── mockups/                          # 高保真 HTML 原型（P01–P14 全部已交付）
└── app/                              # Next.js 14 工程（核心闭环已落地）
    ├── Dockerfile                    # 多阶段构建（standalone 输出）
    ├── docker-compose.yml            # 群晖/任意 Docker 一键部署
    ├── .dockerignore                 # 排除依赖/密钥/构建产物
    ├── .env.example                  # 环境变量示例
    ├── app/                          # 路由与页面
    │   ├── page.tsx                  # 首页
    │   ├── confirm/                  # 配料确认页（核心）
    │   ├── result/[id]/              # 分析结果页（核心）
    │   ├── compare/                  # 多食品对比页
    │   ├── history/                  # 历史记录
    │   ├── settings/                 # 过敏原关注项
    │   ├── scan/                     # 条码查询（真实 OFF API）
    │   ├── admin/                    # 后台管理（7 页）
    │   └── api/                      # OFF/OCR/AI/知识库/config API
    ├── components/                   # 组件库（Button/Chip/GlassCard/BottomSheet/…）
    ├── store/                        # Zustand 状态（含 LocalStorage 持久化）
    ├── lib/                          # 类型 + mock 数据 + server 配置
    └── public/                       # manifest/sw.js/图标/本地字体
```

## 🎯 项目目标

帮助用户看懂食品配料表中的成分与添加剂，理解其类型与用途，识别潜在过敏原。
**不评判好坏，不做医疗诊断，不替代专业建议。**

## 🚦 关键设计决策（先读！）

1. **视觉风格 = Wellness（淡紫 → 粉）**：紫粉渐变主色 + 24px 大圆角卡片 + 玻璃药丸 Tab。详见 `docs/01-design-reconciliation.md` §3.5。
2. **内容模型遵循 PRD**：去掉了原型中的安全评分、严重风险、个性化医疗建议等所有价值判断元素。
3. **颜色语义已重映射**：红/黄/绿/紫 = 添加剂/加工/天然/过敏原 事实标签，不代表"危险/健康"。
4. **必读合规基线**：`docs/01-design-reconciliation.md` §5 的语气基线是所有文案的不可越线。

## ✅ 工程化已落地（核心闭环）

| 能力 | 说明 |
|---|---|
| 首页 | 4 入口 + 最近分析（读 LocalStorage） |
| 配料确认页 | 置信度标签 + 编辑 BottomSheet（Top5 候选）+ 新增/删除 + 手动输入 |
| 分析结果页 | SVG 环形图（成分构成）+ 添加剂统计 + 过敏原卡 + AI 解读 + 加入对比 |
| 配料/添加剂详情 | BottomSheet（PRD §12 / §10.3 三层结构，知识库 API 驱动） |
| 对比页 | 统计矩阵 + 顺序 Diff + 横向滚动 + 空状态 |
| 历史记录 | LocalStorage 持久化 + 删除 + 加入对比 |
| 过敏原设置 | 8 类开关（本机保存） |
| 状态管理 | Zustand + persist（history/compare） |

## ✅ 真实 API 接入

| API | 说明 | 配置 |
|---|---|---|
| `GET /api/product/[barcode]` | **Open Food Facts 真实查询**（无需 key） | `OFF_ENABLED` / `OFF_API_URL` |
| `POST /api/ocr` | 第三方 OCR → 本地拆分兜底 | `OCR_*`（未配置回退本地模拟） |
| `POST /api/ai/summary` | AI 配料解读（中性约束）→ mock 兜底 | `AI_*`（未配置回退中性文案） |
| `GET /api/knowledge` | 知识库查询（配料/添加剂） | 内置 JSON，可替换数据库 |
| `GET /api/config` | 前端脱敏配置（条码入口显隐） | — |

配置文件：`app/.env.example` → 复制为 `app/.env.local`

## ✅ 后台管理（/admin）

- Dashboard / 食品数据源 / OFF 更新 / OCR 配置 / AI 配置 / 知识库 / 系统状态
- 侧边栏导航 + 实时读取 /api/config 状态

## ✅ PWA

- `public/manifest.json` + SVG 图标 + `public/sw.js`
- 离线缓存：导航网络优先 + 静态资源 Cache First
- 生产构建自动注册 SW

## 🚀 运行方式

```bash
cd app
npm install        # 已安装
npm run dev        # 开发模式 → http://localhost:3000
npm run build      # 生产构建
npm run start      # 生产运行
```

> 注意：本机 npm 需绕过系统代理 127.0.0.1:7897（`unset HTTP_PROXY HTTPS_PROXY`）。

## 🐳 Docker 部署（含群晖）

**方式 A（推荐）· GitHub Actions 自动构建 → GHCR 拉取**

```bash
# 1. 推代码到 GitHub（触发 Actions 自动构建 amd64+arm64 镜像 → GHCR）
git add . && git commit -m "init" && git push origin main
# 2. GHCR 镜像设为 Public
# 3. 群晖拉取运行
docker pull ghcr.io/<用户名>/foodscan-pro:latest
docker run -d --name foodscan-pro -p 3001:3000 ghcr.io/<用户名>/foodscan-pro:latest
```

**方式 B · 群晖本地构建**

```bash
cd app
docker compose up -d --build     # 构建并启动 → http://localhost:3001
```

群晖完整步骤见 [`docs/05-deploy-synology.md`](docs/05-deploy-synology.md)。CI workflow 见 [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)。

## 🛠 下一步可做

- [ ] 接入真实 OCR / 数据库 / 知识库 API（当前为 mock 数据）
- [ ] 配料详情 / 添加剂详情 BottomSheet（结果页弹层）
- [ ] 条形码扫描页（需摄像头权限）
- [ ] 后台管理页工程化（mockups/admin 已有高保真）
- [ ] PWA 化 + 微信小程序适配

## 📐 设计自检（每个屏交付前必跑）

详见 `docs/01-design-reconciliation.md` §8。

## 📜 验收原则

详见 PRD §22 与 `docs/04-implementation-roadmap.md` §5。

---

> 维护者注意：任何 PRD 冲突、组件变更、页面变更请同步更新对应的 docs/ 文件，保持设计与实现同源。