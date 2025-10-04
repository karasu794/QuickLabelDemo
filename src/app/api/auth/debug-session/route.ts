import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function mask(v?: string) {
  if (!v) return null;
  return v.slice(0, 8) + "…" + v.slice(-4);
}

export async function GET() {
  const cookieStore = cookies();

  // 1) ENV 可視化（値はマスク）
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 2) 現在ブラウザから来ている sb- クッキー名だけ確認
  const all = cookieStore.getAll().map((c) => c.name);
  const sbNames = all.filter((n) => n.startsWith("sb-") || n.startsWith("__Host-sb-"));

  // 3) Supabase クライアント（cookies: get/set/remove 実装）
  const supabase = createServerClient(supabaseUrl!, anonKey!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: any) {
        cookieStore.set(name, "", { ...options, maxAge: 0 });
      },
    },
  });

  // 4) セッション取得（失敗も握りつぶさず返す）
  const sessionRes = await supabase.auth.getSession();
  const userRes = await supabase.auth.getUser();

  return NextResponse.json({
    ok: true,
    runtime: "nodejs",
    env: {
      SUPABASE_URL_present: !!supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_present: !!anonKey,
      SUPABASE_URL_preview: mask(supabaseUrl || undefined),
      ANON_key_preview: mask(anonKey || undefined),
    },
    cookiesPresent: sbNames,
    sessionPresent: !!sessionRes.data.session,
    userPresent: !!userRes.data.user,
    user: userRes.data.user ? { id: userRes.data.user.id, email: userRes.data.user.email } : null,
    error: sessionRes.error?.message || userRes.error?.message || null,
  });
}


