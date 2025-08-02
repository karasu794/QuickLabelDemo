/** @type {import('next').NextConfig} */
const nextConfig = {
  // 動的レンダリングを強制
  output: 'standalone',
  
  // 最小限のキャッシュ無効化設定
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
};

module.exports = nextConfig;