/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  // Server Component対応のため standalone に戻す
  output: 'standalone',
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  
  // App Routerのみを使用してPages Routerを完全無効化
  pageExtensions: ['tsx', 'ts'],
  
  // 実験的機能でSupabaseの最適化設定
  experimental: {
    // SSGを完全に無効化する追加設定
    optimizePackageImports: ['@supabase/supabase-js'],
    esmExternals: true,
    forceSwcTransforms: true,
    // 静的生成を完全に無効化
    workerThreads: false,
    // usePathnameエラー対策
    scrollRestoration: false,
    // App Routerのみを強制 (Pages Router無効化)
    // appDir: true, // REMOVED: Invalid in Next.js 14
    typedRoutes: false,
    // キャッシュを完全に無効化
    // turbo: false, // REMOVED: Invalid boolean, expects object
    // 静的最適化を無効化
    // staticPageGenerationTimeout: 0, // REMOVED: Invalid config
  },
  
  // SWCミニ化を無効化してSSG問題を回避
  swcMinify: false,
  
  // 静的生成を完全に無効化
  distDir: '.next',
  generateEtags: false,
  
  // 強制的にサーバーサイドレンダリング
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
  
  // App Routerのみを強制するビルドID
  async generateBuildId() {
    return `app-router-${Date.now()}`
  },
  
  // ランタイム設定でSSGを阻止
  async rewrites() {
    return []
  },
  
  async redirects() {
    return []
  },
  
  webpack: (config, { isServer, dev }) => {
    // punycode deprecation 警告を抑制
    config.resolve.fallback = {
      ...config.resolve.fallback,
      punycode: false,
    };
    
    // SSGと静的最適化を完全に無効化
    if (isServer) {
      // 静的生成関連の全プラグインを除去
      config.plugins = config.plugins.filter(plugin => {
        const name = plugin.constructor.name;
        return !name.includes('StaticGeneration') &&
               !name.includes('NextJsSSGPlugin') &&
               !name.includes('StaticOptimization') &&
               !name.includes('BuildManifestPlugin');
      });
      
      // モジュールの強制的な動的解決
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, 'src'),
      };
    }
    
    // Client-sideレンダリングを強制
    config.optimization = {
      ...config.optimization,
      splitChunks: false,
      minimize: false,
    };
    
    return config;
  },
  
  // ビルド時の最適化を無効化
  compiler: {
    removeConsole: false,
  },
  
  // デバッグ情報
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 60,
  },
}

module.exports = nextConfig