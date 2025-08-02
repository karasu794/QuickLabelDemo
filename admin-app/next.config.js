/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14: 動的レンダリングを強制
  output: 'standalone',
  
  // プリレンダリングを完全に無効化  
  trailingSlash: false,
  
  // 実験的機能でSupabaseを外部パッケージとして扱う
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  
  // Pages Routerを完全に無効化
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // 全てのページで動的レンダリングを強制
  async generateBuildId() {
    return `dynamic-${Date.now()}`
  },
  
  // 画像最適化を無効化（静的生成回避）
  images: {
    unoptimized: true,
  },
  
  webpack: (config, { isServer }) => {
    // punycode deprecation 警告を抑制
    config.resolve.fallback = {
      ...config.resolve.fallback,
      punycode: false,
    };
    
    // Pages Routerの自動生成を防止
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'next/dist/pages/_document': false,
        'next/dist/pages/_app': false,
        'next/dist/pages/_error': false,
      };
    }
    
    return config;
  },
}

module.exports = nextConfig