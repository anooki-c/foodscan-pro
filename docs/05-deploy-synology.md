# 群晖（Synology）Docker 部署指南

> 本文档引导你在群晖 NAS 上部署「食品配料分析」。
> 目标：最终通过 `http://<群晖IP>:3001` 访问。

## 部署方式选择

| 方式 | 适用场景 | 构建位置 |
|---|---|---|
| **A · GitHub Actions 自动构建（推荐）** | 想省事、镜像想长期维护、CI 自动出包 | GitHub 云端 |
| B · 群晖本地构建 | 项目尚未上 GitHub、或 NAS 不常访问外网 | 群晖本机 |

方式 A 只要推代码到 GitHub，Actions 自动构建镜像推到 GHCR，群晖一行命令拉取运行；后续更新代码只需 `git push`，群晖再拉一次。本文以 **A 为主**，B 见第 5 节。

> 本部署方案构建 **amd64** 镜像（覆盖绝大多数群晖：DS920+ / DS923+ / DS224+ 等 Intel/AMD 机型）。ARM 机型（如 DS220j）请改用第 5 节本地构建。

---

## 0. 前置条件

| 项 | 要求 |
|---|---|
| 群晖系统 | DSM 7.x（DSM 6.2 亦可，步骤略不同） |
| 套件 | **Container Manager**（DSM 7.2 后内置）或 **Docker**（旧版） |
| 群晖架构 | CI 构建 **amd64** 镜像（Intel/AMD 机型） |
| GitHub | 一个 GitHub 账号（免费） |
| SSH | 推荐开启（控制面板 → 终端机和 SNMP → 启用 SSH），命令行操作更直观 |

---

## 1. 把项目推送到 GitHub

### 1.1 在 GitHub 新建仓库

- 打开 github.com → New repository → 填仓库名（如 `foodscan-pro`）→ 选 **Private 或 Public** 均可 → 创建（**不要**勾选 README/.gitignore 初始化，避免冲突）。

### 1.2 本地推送

在项目根目录（`2026-08-31-foodscan-pro/`）执行：

```bash
cd /path/to/2026-08-31-foodscan-pro
git init
git add .
git commit -m "init: 食品配料分析 V1"
git branch -M main
git remote add origin https://github.com/<你的用户名>/foodscan-pro.git
git push -u origin main
```

> 推送前确认 **`app/.env.local` 不会上传**（`.gitignore` 已含 `.env*.local`）。项目根目前没有 `.gitignore`，可在推送前补一个（见 1.3）。

### 1.3 项目根 .gitignore（建议）

在项目根创建 `.gitignore`，避免把密钥/构建产物推上去：

```gitignore
node_modules/
.next/
.env
.env*.local
*.pem
.DS_Store
```

---

## 2. 首次构建（GitHub Actions）

推送后 Actions 会自动触发：

1. 打开仓库 → **Actions** 标签页
2. 应看到 `Build Docker Image` 正在运行（约 3-6 分钟）
3. 完成后镜像已推送到 **GHCR**：`ghcr.io/<你的用户名>/foodscan-pro:latest`

### 2.1 将镜像设为 Public（必须）

GHCR 默认 private，群晖拉取需要登录。设为 public 后群晖可直接拉取：

1. 打开 https://github.com/settings/packages
2. 找到 `foodscan-pro` → **Package settings**
3. 拉到 **Danger Zone** → `Change visibility` → **Public** → 确认

> 如果你不想公开镜像，也可以走第 5 节本地构建，或用 `GHCR_TOKEN`（GitHub → Settings → Developer settings → Personal access token，勾选 `read:packages`），在群晖登录后拉取。

---

## 3. 群晖拉取部署（方式 A 核心）

### 3.1 准备 compose 文件

把 `app/docker-compose.ghcr.yml` 上传到群晖 `/docker/foodscan/`，并把 `image` 的占位符改成你的真实镜像名：

```yaml
image: ghcr.io/<你的GitHub用户名>/foodscan-pro:latest
```

> 也可以直接用 `docker run` 一行启动（DSM 6.2 无 compose 时）：
> ```bash
> docker pull ghcr.io/<你的GitHub用户名>/foodscan-pro:latest
> docker run -d --name foodscan-pro -p 3001:3000 --restart unless-stopped \
>   -e OFF_ENABLED=true ghcr.io/<你的GitHub用户名>/foodscan-pro:latest
> ```

### 3.2 启动

```bash
cd /volume1/docker/foodscan
sudo docker compose -f docker-compose.ghcr.yml up -d
```

### 3.3 查看状态

```bash
docker compose -f docker-compose.ghcr.yml ps
docker compose -f docker-compose.ghcr.yml logs -f
```

### 3.4 访问

浏览器打开 `http://<群晖IP>:3001`。

---

## 4. 后续更新（一次代码改动 → 群晖两步）

```bash
# 本地：
git add . && git commit -m "fix: ..." && git push

# 群晖：
cd /volume1/docker/foodscan
sudo docker compose -f docker-compose.ghcr.yml pull   # 拉最新镜像
sudo docker compose -f docker-compose.ghcr.yml up -d  # 滚动更新
```

> 想全自动？可给 Actions 加 SSH Deploy Key 实现 CI 构建后自动在群晖上 `pull`（见第 6 节进阶）。

---

## 5. 方式 B：群晖本地构建（不上 GitHub 时）

### 5.1 上传项目

把 `app/` 目录内容传到群晖 `/docker/foodscan/`（File Station 或 SCP）：

```bash
scp -r app/* user@<群晖IP>:/volume1/docker/foodscan/
```

### 5.2 构建并启动

```bash
cd /volume1/docker/foodscan
sudo docker compose up -d --build
```

> 首次构建下载 node:20-alpine 并安装依赖，约 5-15 分钟。国内网络慢：取消 compose 里 `NPM_REGISTRY=https://registry.npmmirror.com` 的注释。

---

## 6. 配置 OCR / AI（后台管理页）

> **推荐方式：无需重启、无需重建镜像。** OCR 与 AI 配置已迁移到后台管理页，持久化在挂载卷 `data/config.json`，修改后立即生效。

### 6.1 网页配置（推荐）

1. 打开 `http://<群晖IP>:3001/admin/ocr`，填写服务商 / API 地址 / Key，点「保存配置」
2. 打开 `http://<群晖IP>:3001/admin/ai`，同样填写后保存
3. 首页状态（Dashboard）会实时反映开关状态

### 6.2 环境变量（仅首次默认值）

`OFF_ENABLED` 及 `OCR_*` / `AI_*` 环境变量仅在**首次启动、尚无配置文件时**作为默认值。一旦后台保存过配置，以后台文件为准：

```yaml
environment:
  OFF_ENABLED: "true"
  OCR_ENABLED: "false"
  AI_ENABLED: "false"
```

> 后台保存的 API Key 存在群晖挂载卷 `data/config.json` 里，**不写进代码、不推 GitHub**。如要彻底清空配置：删除该文件后重启容器即可恢复环境变量默认值。

---

## 7. 数据持久化

- **OCR/AI 配置**：`data/config.json`（挂载卷），后台修改后立即生效，重建容器不丢失。
- **历史记录**：浏览器 LocalStorage，服务端无需持久化。
- **数据卷**：compose 已声明 `foodscan_data` 挂载到 `/app/data`。

---

## 8. 常见问题

| 现象 | 原因 / 解决 |
|---|---|
| Actions 失败 | 看 Actions 日志；常见为依赖装不上（CI 环境网络正常，一般不会） |
| 群晖拉取 401/denied | 镜像未 Public，或账号拼写错。确认 `ghcr.io/<用户名>/foodscan-pro` 与实际一致 |
| 群晖拉取很慢 | GHCR 国内访问可能慢；可换 Docker Hub（把 CI 的 registry 改为 docker.io）或走方式 B |
| 启动后访问 502 | 端口映射错：容器端口必须 3000（`- "3001:3000"`） |
| OFF 查不到产品 | 群晖无法访问外网 OFF API；检查代理/防火墙 |
| 图标不显示 | 已本地化字体，确认镜像内 public/fonts 存在（`docker exec foodscan-pro ls public/fonts`） |
| 想改对外端口 | 改 compose 左侧数字，如 `- "8080:3000"` |
| DSM 6.2 无 compose | 用第 3.1 节 `docker run` 一行命令 |

---

## 9. 卸载

```bash
docker compose -f docker-compose.ghcr.yml down   # 或 docker-compose.yml
docker rmi ghcr.io/<你的GitHub用户名>/foodscan-pro:latest
```

---

## 10. 验证清单

- [ ] Actions 构建成功（GitHub → Actions 绿色勾）
- [ ] GHCR 包已设 Public
- [ ] `docker compose ps` 显示 `Up`
- [ ] `http://<群晖IP>:3001` 打开首页
- [ ] 首页图标正常（本地字体）
- [ ] 条码查询返回 OFF 数据（3017624010701 → Nutella）
- [ ] 手动输入 → 确认 → 结果页完整走通
- [ ] 后台 `http://<群晖IP>:3001/admin` 可访问
