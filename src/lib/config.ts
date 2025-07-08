/**
 * アプリケーションの設定ファイル
 * 環境に応じて適切なベースURLを自動的に決定します
 */

/**
 * 現在の環境に応じてサイトのベースURLを決定
 * - Vercel環境の場合: https://[VERCEL_URL]
 * - ローカル環境の場合: NEXT_PUBLIC_SITE_URL または http://localhost:3000
 */
export const siteUrl = (() => {
  // Vercel環境の場合、VERCEL_URLを使用
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // ローカル環境の場合、NEXT_PUBLIC_SITE_URLを使用、なければデフォルト値
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
})();

/**
 * 開発環境かどうかを判定
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 本番環境かどうかを判定
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Vercel環境かどうかを判定
 */
export const isVercel = !!process.env.VERCEL_URL; 