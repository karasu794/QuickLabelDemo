/** @type {import('next').NextConfig} */
const nextConfig = {
  // 完全に動的レンダリングを強制
  output: 'standalone',
  
  // プリレンダリングを完全に無効化  
  trailingSlash: false,
  
  // ビルドキャッシュを強制的にクリア
  distDir: '.next-clean',
  
  // App Routerを明示的に指定
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    appDir: true,
  },
  
  // Pages Routerを完全に無効化
  pageExtensions: ['tsx', 'ts'],
  
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