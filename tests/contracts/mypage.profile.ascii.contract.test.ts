import { toAsciiForShipping } from '@/lib/text/toAsciiForShipping'

describe('MyPage Profile ASCII contract', () => {
  test('toAsciiForShipping basic cases', () => {
    expect(toAsciiForShipping('ＡＢＣ１２３')).toBe('ABC123')
    expect(toAsciiForShipping('東京都 渋谷区')).toBe('') // 非許可文字は除去（スペースのみ残る→trimで消える）
    expect(toAsciiForShipping('Yamada 太郎')).toBe('Yamada')
    expect(toAsciiForShipping('  foo　bar  ')).toBe('foo bar')
  })
})


