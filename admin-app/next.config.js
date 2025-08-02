/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pages Router完全封印 - 最強設定
  pageExtensions: [], // Pages Router拡張子を完全に空にする
  
  // App Routerのみ強制
  experimental: {
    appDir: true, // App Router強制有効化
  },
  
  // 静的エクスポートでPages Router自動生成を完全阻止
  output: 'export',
  trailingSlash: false,
  
  // 画像最適化無効（exportモード必須）
  images: {
    unoptimized: true,
  },
  
  // 明示的にPages Router無効化
  target: 'serverless', // 追加設定
  
  // エラーページの自動生成を完全に無効化
  generateEtags: false,
  poweredByHeader: false,
}

module.exports = nextConfig