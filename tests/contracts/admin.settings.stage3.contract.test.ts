/* global jest */

// ===== 1) 強制デバッグ: 例外を絶対可視化 =====
const dbg = (...a: any[]) => process.stderr.write(a.join(' ') + '\n');
process.on('unhandledRejection', (e: any) => {
  dbg('[unhandledRejection]', e?.stack || e);
});
process.on('uncaughtException', (e: any) => {
  dbg('[uncaughtException]', e?.stack || e);
});

// ===== 2) NextResponse を Response 非依存でスタブ =====
function mockNext() {
  const mk = (body: any, init?: ResponseInit) => ({
    status: init?.status ?? 200,
    headers: init?.headers ?? {},
    async json() { return body; }
  });
  jest.doMock('next/server', () => ({ NextResponse: { json: mk } }));
}

// ===== 3) isAdminServer を常にモック（複数パス） =====
function mockIsAdmin(isAdmin: boolean) {
  const impl = () => ({ isAdminServer: () => Promise.resolve(isAdmin) });
  jest.doMock('@/lib/auth/isAdmin', impl);                 // alias: @/...
  jest.doMock('../../src/lib/auth/isAdmin', impl);         // 相対パス（テスト基準）
}


// ===== 4) Supabase を alias/相対/直下の全パスでモック =====
function implSupabase(rows: Array<{ key: string; value: any }>, isAdmin: boolean) {
  const appSettingsChain = {
    select: (_cols: string) => ({
      eq: (k: string, v: any) => ({
        limit: (_n: number) => ({
          maybeSingle: async () => {
            const hit = rows.find(r => k === 'key' && r.key === v) || null;
            return { data: hit, error: null };
          }
        })
      })
    }),
    upsert: async (_: any) => ({ error: null })
  };

  const appSettingsList = {
    select: async (_: string) => ({ data: rows, error: null }),
    upsert: async (_: any) => ({ error: null })
  };

  const factory = () => ({
    createClient: () => ({
      auth: {
        getUser: async () => ({
          data: { user: isAdmin ? { id: 'u1', email: 'a@x' } : null },
          error: null
        })
      },
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: (_cols: string) => ({
              eq: (_k: string, _v: any) => ({
                maybeSingle: async () => ({
                  data: isAdmin ? { id: 'u1', is_admin: true, role: 'admin' } : null,
                  error: null
                })
              })
            })
          };
        }
        if (table === 'app_settings') {
          return new Proxy({}, {
            get(_t, prop) {
              if (prop === 'select') {
                return (cols: string) =>
                  cols?.includes('key') ? appSettingsList.select(cols) : appSettingsChain.select(cols);
              }
              if (prop === 'upsert') return appSettingsList.upsert;
              return undefined;
            }
          }) as any;
        }
        return { select: async (_: string) => ({ data: null, error: null }) };
      }
    })
  });

  return factory;
}

function mockSupabase(rows: Array<{ key: string; value: any }>, isAdmin: boolean) {
  const impl = implSupabase(rows, isAdmin);
  jest.doMock('@/lib/supabase/server', impl);
  jest.doMock('../../src/lib/supabase/server', impl);
}

// ===== 5) getAppSettingBoolean を安全モック（ENV依存を遮断） =====
function mockGetSettingBoolean() {
  const impl = { getAppSettingBoolean: async (_k: string, envDefault: boolean) => envDefault };
  jest.doMock('@/lib/settings/getAppSettingBoolean', () => impl);
  jest.doMock('../../src/lib/settings/getAppSettingBoolean', () => impl);
}

// ===== 6) ルートをモック適用後に require。ロード失敗時に必ず落とす =====
async function withMocks<T>(
  rows: Array<{ key: string; value: any }>,
  isAdmin: boolean,
  fn: (route: any) => Promise<T>
) {
  jest.resetModules();
  mockNext();
  mockIsAdmin(isAdmin);
  mockSupabase(rows, isAdmin);
  mockGetSettingBoolean();

  let route: any;
  jest.isolateModules(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      route = require('../../src/app/api/admin/settings/route');
    } catch (e: any) {
      dbg('[require-failed]', e?.stack || e);
      throw e;
    }
  });

  if (!route || typeof route.GET !== 'function' || typeof route.POST !== 'function') {
    throw new Error('route functions not loaded (GET/POST undefined). Check import paths & mocks.');
  }
  return fn(route);
}

// ===== 7) テスト本体 =====
describe('admin.settings.stage3', () => {
  test('GET: forbidden for non-admin', async () => {
    await withMocks([], false, async (route) => {
      let res: any;
      try {
        res = await route.GET();
      } catch (e: any) {
        dbg('[GET forbidden error]', e?.stack || e);
        throw e;
      }
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('forbidden');
    });
  });

  test('GET: returns normalized booleans for known keys', async () => {
    await withMocks(
      [
        { key: 'FORCE_PHOENIX_LETTERHEAD', value: { enabled: true } },
        { key: 'FORCE_PHOENIX_SIGNATURE',  value: { enabled: false } },
        { key: 'OTHER_KEY',                value: { enabled: true } },
      ],
      true,
      async (route) => {
        let res: any;
        try {
          res = await route.GET();
        } catch (e: any) {
          dbg('[GET ok error]', e?.stack || e);
          throw e;
        }
        expect(res.status).toBe(200);
        const { settings } = await res.json();
        expect(settings.FORCE_PHOENIX_LETTERHEAD).toBe(true);
        expect(settings.FORCE_PHOENIX_SIGNATURE).toBe(false);
      }
    );
  });

  test('POST: rejects non-admin', async () => {
    await withMocks([], false, async (route) => {
      const req = new Request('http://x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ FORCE_PHOENIX_LETTERHEAD: true }),
      });
      let res: any;
      try {
        res = await route.POST(req);
      } catch (e: any) {
        dbg('[POST forbidden error]', e?.stack || e);
        throw e;
      }
      expect(res.status).toBe(403);
    });
  });

  test('POST: validates booleans and upserts (admin)', async () => {
    await withMocks([], true, async (route) => {
      // invalid type
      let req = new Request('http://x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ FORCE_PHOENIX_LETTERHEAD: 'maybe' }),
      });
      let res: any;
      try {
        res = await route.POST(req);
      } catch (e: any) {
        dbg('[POST invalid error]', e?.stack || e);
        throw e;
      }
      expect(res.status).toBe(400);

      // ok
      req = new Request('http://x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          FORCE_PHOENIX_LETTERHEAD: true,
          FORCE_PHOENIX_SIGNATURE: false,
        }),
      });
      try {
        res = await route.POST(req);
      } catch (e: any) {
        dbg('[POST ok error]', e?.stack || e);
        throw e;
      }
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });
});
