/** @type {import('next').NextConfig} */
const nextConfig = {
  // 動的レンダリングを強制
  output: 'standalone',
  
  // Pages Router完全無効化 - 最強設定
  pageExtensions: [], // Pages Routerファイル処理を完全無効化
  
  // App Router専用環境の強制設定
  experimental: {
    appDir: true, // App Router強制有効化
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  
  // 静的生成完全無効化
  trailingSlash: false,
  generateEtags: false,
  poweredByHeader: false,
  
  // キャッシュ無効化
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  
  // 動的ビルドID
  async generateBuildId() {
    return `app-router-only-${Date.now()}-${Math.random().toString(36).substring(7)}`
  },
};

module.exports = nextConfig;