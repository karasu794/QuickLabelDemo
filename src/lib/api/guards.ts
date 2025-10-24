export function assertActionToken(req: Request) {
  if ((process.env.E2E_TEST_MODE || '') === '1') return
  const header = req.headers.get('x-actions-token') || req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : header
  const valid = process.env.ACTIONS_TOKEN || ''
  if (!valid || token !== valid) {
    throw new Response('Unauthorized', { status: 401 })
  }
}


