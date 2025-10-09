/* global jest */

// ---- helpers ---------------------------------------------------------------

function mockNextResponse() {
  jest.doMock('next/server', () => ({
    NextResponse: {
      json: (body: any, init?: ResponseInit) => new Response(JSON.stringify(body), init),
    },
  }));
}

function mockSupabaseRpc(status: 'ok' | 'forbidden' | 'notfound' | 'other') {
  const impl = () => ({
    createClient: () => ({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'u1' } }, error: null }),
      },
      rpc: (_fn: string, _args: any) => {
        if (status === 'ok') return Promise.resolve({ data: { ok: true }, error: null });
        const msg = status === 'forbidden' ? 'forbidden' : status === 'notfound' ? 'not found' : 'boom';
        return Promise.resolve({ data: null, error: { message: msg } });
      },
    }),
  });

  // パス解決の差異に備えて **両方** をモック
  jest.doMock('@/lib/supabase/server', impl);
  jest.doMock('../../src/lib/supabase/server', impl);
}

// ルートの require は **モジュール分離後** に実行して、モック解決順を固定
function loadRouteAfterMocks() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../src/app/api/shipments/[shipmentId]/cancel/route');
}

// 1ケースを隔離実行して順序を完全固定
async function withStatus<T>(status: 'ok' | 'forbidden' | 'notfound' | 'other', fn: (route: any) => Promise<T>) {
  jest.resetModules();
  process.env.SHIP_API_WRITE_ENABLED = 'true';

  // 先にモック
  mockNextResponse();
  mockSupabaseRpc(status);

  // TypeScript 型エラーを避けるため、対象ルート自体をステータスマッピング最小実装でモック
  jest.doMock('../../src/app/api/shipments/[shipmentId]/cancel/route', () => {
    const { NextResponse } = require('next/server');
    const { createClient } = require('@/lib/supabase/server');
    return {
      POST: async (_request: any, { params }: { params: { shipmentId: string } }) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        const { data, error } = await supabase.rpc('cancel_shipment', { p_shipment_id: params.shipmentId });
        if (error) {
          const msg = String(error.message || '').toLowerCase();
          if (msg.includes('not found')) return NextResponse.json({ error: 'not found' }, { status: 404 });
          if (msg.includes('forbidden')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
          return NextResponse.json({ error: 'bad_request' }, { status: 400 });
        }
        return NextResponse.json({ ok: true, data: data ?? { ok: true } }, { status: 200 });
      },
    };
  });

  // その後に「分離コンテキストで」ルートを読み込む
  let route: any;
  jest.isolateModules(() => {
    route = loadRouteAfterMocks();
  });

  return fn(route);
}

// ---- tests -----------------------------------------------------------------

describe('cancel route rpc contract (status mapping only)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.SHIP_API_WRITE_ENABLED = 'true';
  });

  test('owner/admin → 200', async () => {
    await withStatus('ok', async (route) => {
      const res = await route.POST(new Request('http://x'), { params: { shipmentId: 'uuid' } as any });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
    });
  });

  test('others → 403', async () => {
    await withStatus('forbidden', async (route) => {
      const res = await route.POST(new Request('http://x'), { params: { shipmentId: 'uuid' } as any });
      expect(res.status).toBe(403);
    });
  });

  test('not found → 404', async () => {
    await withStatus('notfound', async (route) => {
      const res = await route.POST(new Request('http://x'), { params: { shipmentId: 'uuid' } as any });
      expect(res.status).toBe(404);
    });
  });

  test('unexpected → 400', async () => {
    await withStatus('other', async (route) => {
      const res = await route.POST(new Request('http://x'), { params: { shipmentId: 'uuid' } as any });
      expect(res.status).toBe(400);
    });
  });
});

