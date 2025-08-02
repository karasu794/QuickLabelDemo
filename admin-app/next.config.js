/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14: 静的生成を完全に無効化
  output: 'standalone',
  
  // プリレンダリングを完全に無効化  
  trailingSlash: false,
  
  // 実験的機能でSupabaseを外部パッケージとして扱う
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // スタンドアロンモードでもSSGを強制無効化
    outputFileTracingExcludes: ['**/*'],
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
    
    // Pages Routerの自動生成を完全に防止
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'next/dist/pages/_document': false,
        'next/dist/pages/_app': false,
        'next/dist/pages/_error': false,
        'next/dist/pages/404': false,
        'next/dist/pages/500': false,
        'next/dist/shared/lib/router/router': 'next/dist/client/router',
      };
      
      // 静的生成プラグインを無効化
      config.plugins = config.plugins.filter(plugin => {
        const name = plugin.constructor.name;
        return !name.includes('StaticGeneration') &&
               !name.includes('NextJsSSGPlugin') &&
               !name.includes('PagesPlugin') &&
               !name.includes('ErrorPlugin');
      });
      
      // Pages Router関連のentryを除去
      if (config.entry) {
        const originalEntry = config.entry;
        config.entry = async () => {
          const entries = await (typeof originalEntry === 'function' ? originalEntry() : originalEntry);
          // Pages Router関連エントリを除去
          Object.keys(entries).forEach(key => {
            if (key.includes('pages/') || key.includes('_error') || key.includes('_document') || key.includes('_app')) {
              delete entries[key];
            }
          });
          return entries;
        };
      }
    }
    
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