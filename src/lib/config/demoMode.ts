/**
 * Demo mode helper
 *
 * APP_ENV=demo のとき true を返す。
 * サーバー/クライアント両方で使用可能。
 * 本番復帰時は APP_ENV を staging / production に戻すだけでOK。
 */

export const IS_DEMO = process.env.APP_ENV === 'demo' || process.env.NEXT_PUBLIC_APP_ENV === 'demo'

/** サーバーサイド専用: demo時に統一レスポンスを返すヘルパー */
export function demoGuardResponse(action?: string) {
  return {
    ok: false,
    code: 'DEMO_MODE_DISABLED' as const,
    message: action
      ? `この操作（${action}）はデモ環境では無効です。`
      : 'この操作はデモ環境では無効です。',
  }
}
