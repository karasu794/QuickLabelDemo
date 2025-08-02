/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静的最適化を完全に無効化してSSGエラーを回避
  output: 'standalone',
  
  // プリレンダリング設定
  trailingSlash: false,
  
  // 動的レンダリングを強制
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
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