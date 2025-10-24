import { NextRequest } from 'next/server'
import { GET as SearchGET } from '@/app/api/hslookup/search/route'
import { GET as DetailGET } from '@/app/api/hslookup/edtdetail/route'

function makeReq(url: string) {
  return new NextRequest(url)
}

describe('HS/HTS lookup API', () => {
  test('search 正規化: ピリオド付きでも数字のみ化される', async () => {
    const res = await SearchGET(makeReq('http://test/hslookup/search?q=2204.21.3110'))
    const j = await res.json()
    expect(j.ok).toBe(true)
    expect(j.code).toBe('2204213110')
  })

  test('edtdetail 正規化: ハイフンを除去', async () => {
    const res = await DetailGET(makeReq('http://test/hslookup/edtdetail?q=22-04-21-3110'))
    const j = await res.json()
    expect(j.ok).toBe(true)
    expect(j.code).toBe('2204213110')
  })
})


