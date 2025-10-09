import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteClient } from "@/lib/supabase/routeClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function mask(v?: string) {
  if (!v) return null;
  return v.slice(0, 8) + "…" + v.slice(-4);
}

export async function GET() {
  const cookieStore = cookies();
  const supabase = createRouteClient();

  const sessionRes = await supabase.auth.getSession();
  const userRes = await supabase.auth.getUser();

  const all = cookieStore
    .getAll()
    .filter((c) => c.name.startsWith("sb-") || c.name.startsWith("__Host-sb-"))
    .map((c) => ({ name: c.name, len: (c.value?.length ?? 0) }));

  return NextResponse.json({
    ok: true,
    runtime: "nodejs",
    env: {
      SUPABASE_URL_present: !!process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_URL_preview: mask(process.env.SUPABASE_URL || null),
      ANON_key_preview: mask(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null),
    },
    cookiesPresent: all,
    sessionPresent: !!sessionRes.data.session,
    userPresent: !!userRes.data.user,
    error: sessionRes.error?.message || userRes.error?.message || null,
  });
}


