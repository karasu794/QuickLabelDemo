/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14: 静的生成を完全に無効化
  output: 'standalone',
  
  // プリレンダリングを完全に無効化  
  trailingSlash: false,
  
  // 静的最適化を完全に無効化
  generateStaticParams: false,
  
  // 実験的機能でSupabaseを外部パッケージとして扱う
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // 静的最適化を無効化
    isrMemoryCacheSize: 0,
    // Next.js 14では appDir は不要（デフォルトで有効）
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
    
    // 静的最適化を無効化
    config.optimization = {
      ...config.optimization,
      usedExports: false,
      sideEffects: false,
    };
    
    return config;
  },
  
  // 環境変数でSSGを無効化
  env: {
    NEXT_RUNTIME: 'nodejs',
  },
}

module.exports = nextConfig