/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静的最適化を完全に無効化してSSGエラーを回避
  output: 'standalone',
  
  experimental: {
    // 静的生成を無効化
    isrMemoryCacheSize: 0,
  },
  
  // 全ページで動的レンダリングを強制
  async rewrites() {
    return []
  },
  
  webpack: (config, { isServer }) => {
    // punycode deprecation 警告を抑制
    config.resolve.fallback = {
      ...config.resolve.fallback,
      punycode: false,
    };
    
    return config;
  },
}

module.exports = nextConfig 