/** @type {import('next').NextConfig} */
const nextConfig = {
  // 输出 standalone 模式：只生成运行所需的最小文件集，大幅减小 Docker 镜像
  output: "standalone",
};

export default nextConfig;
