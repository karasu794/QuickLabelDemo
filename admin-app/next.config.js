/** @type {import('next').NextConfig} */
const nextConfig = {
  // 動的レンダリングを強制し、静的生成に起因する問題を回避
  output: 'standalone',

  // 必要であれば、ここに必要な設定を追加
  // experimental: {
  //   serverComponentsExternalPackages: ['@supabase/supabase-js'],
  // },
};

module.exports = nextConfig;