// STAB: lightweight health endpoint
import { NextResponse } from "next/server";
import { decideBackendsFromHealth } from '@/lib/runtime/health'
import { getCommitSha7, getEnvName } from '@/lib/version'

export async function GET() {
  try {
    const d = await decideBackendsFromHealth()
    return NextResponse.json({
      ok: d.health.ok,
      jobsOk: d.health.jobsOk,
      paymentsOk: d.health.paymentsOk,
      jobsBackend: d.JOBS_BACKEND,
      paymentsBackend: d.PAYMENTS_BACKEND,
      details: d.health.details,
      version: getCommitSha7() ?? (process.env.npm_package_version ?? 'dev'),
      env: getEnvName(),
      time: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 200 })
  }
}


