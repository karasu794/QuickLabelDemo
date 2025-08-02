/** @type {import('next').NextConfig} */
const nextConfig = {
  // 完全に動的レンダリングを強制
  output: 'standalone',
  
  // プリレンダリングを完全に無効化
  trailingSlash: false,
  
  // 実験的機能でSupabaseを外部パッケージとして扱う
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