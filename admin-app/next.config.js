/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pages Router完全無効化
  pageExtensions: ['page.tsx', 'page.ts'], // app/以外では.page.tsx のみ許可
  
  // App Routerのみ強制
  experimental: {
    appDir: true, // App Router強制有効化
  },
  
  // 静的エクスポートでPages Router自動生成を阻止
  output: 'export',
  trailingSlash: false,
  
  // 画像最適化無効（exportモード必須）
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig