# ============================================================
# 食品配料分析 · Docker 镜像
# 多阶段构建：
#   Stage 1: 安装依赖 + 构建（含 next standalone 输出）
#   Stage 2: 运行时镜像（仅包含运行所需最小文件，非 root）
#
# 构建：docker build -t foodscan-pro .
# 平台：自动适配群晖架构（amd64 / arm64）
# ============================================================

# ---------- Stage 1: Builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

# 可选 npm 镜像源（CI 慢网或国内构建时通过 --build-arg NPM_REGISTRY=... 注入）
ARG NPM_REGISTRY
RUN if [ -n "$NPM_REGISTRY" ]; then npm config set registry "$NPM_REGISTRY"; fi

# 先复制依赖清单，利用层缓存
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码并构建
COPY . .
RUN npm run build

# ---------- Stage 2: Runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 非 root 运行（安全实践）
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# standalone 输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# 静态资源
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# public（manifest / sw.js / 字体 / 图标）
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 运行时配置目录（后台 OCR/AI 配置持久化在 data/config.json）
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
