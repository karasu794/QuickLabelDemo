import { isSafePath, buildAuthCallbackUrl } from '@/lib/auth/redirect'

describe('auth signup redirect contracts', () => {
  test('isSafePath positive cases', () => {
    expect(isSafePath('/')).toBe(true)
    expect(isSafePath('/mypage')).toBe(true)
    expect(isSafePath('/foo?x=1')).toBe(true)
    expect(isSafePath('/a/b#c')).toBe(true)
  })

  test('isSafePath negative cases', () => {
    expect(isSafePath('')).toBe(false)
    expect(isSafePath('http://evil.com')).toBe(false)
    expect(isSafePath('https://evil.com/a')).toBe(false)
    expect(isSafePath('//evil.com')).toBe(false)
    expect(isSafePath('javascript:alert(1)')).toBe(false)
    expect(isSafePath('data:text/plain,hi')).toBe(false)
  })

  test('buildAuthCallbackUrl attaches next when safe', () => {
    const url = buildAuthCallbackUrl('/mypage', 'signup')
    expect(url).toContain('/auth/callback')
    expect(url).toContain('type=signup')
    expect(url).toContain('next=%2Fmypage')
  })

  test('buildAuthCallbackUrl ignores unsafe next', () => {
    const url = buildAuthCallbackUrl('https://evil.com', 'signup')
    expect(url).toContain('/auth/callback')
    expect(url).toContain('type=signup')
    expect(url).not.toContain('evil.com')
    expect(url).not.toContain('next=')
  })
})


