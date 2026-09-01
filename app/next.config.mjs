/** @type {import('next').NextConfig} */
const nextConfig = {
  // 输出 standalone 模式：只生成运行所需的最小文件集，大幅减小 Docker 镜像
  output: "standalone",
  // better-sqlite3 是原生模块（内含 eval 构造的查询函数），
  // webpack 打包会触发栈溢出，必须作为服务端外部包在运行时原生 require
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
};

export default nextConfig;
