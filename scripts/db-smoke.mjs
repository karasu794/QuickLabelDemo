// scripts/db-smoke.mjs
// Minimal DB smoke: checks tables/RPC, inserts a job, picks & locks, appends events, prints summary.
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role).
import { createClient } from '@supabase/supabase-js';

function reqEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const supabaseUrl = reqEnv('SUPABASE_URL');
const serviceKey = reqEnv('SUPABASE_SERVICE_ROLE_KEY');
const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

function nowIso() { return new Date().toISOString(); }

async function main() {
  const summary = { checks: [], jobId: null };

  // 0) sanity: tables exist (select 0 rows)
  {
    const { error: e1 } = await sb.from('jobs').select('id').limit(1);
    const { error: e2 } = await sb.from('job_events').select('id').limit(1);
    if (e1) throw new Error(`jobs table not accessible: ${e1.message}`);
    if (e2) throw new Error(`job_events table not accessible: ${e2.message}`);
    summary.checks.push('tables-ok');
  }

  // 1) RPC exists (call with no data; should not error)
  {
    const { data, error } = await sb.rpc('jobs_pick_for_update', { p_type: 'cancel_payment', p_now: nowIso() });
    if (error) throw new Error(`rpc jobs_pick_for_update failed: ${error.message}`);
    // data can be null if no queued jobs; that's fine.
    summary.checks.push('rpc-ok');
  }

  // 2) Insert a queued job
  const insertJob = {
    type: 'cancel_payment',
    status: 'queued',
    attempts: 0,
    locked: false,
    payload: { paymentId: 'smoke-1', expectedAction: 'void', idempotencyKey: `idem-smoke-${Date.now()}` },
    next_run_at: null,
    status_detail: null,
    last_error_code: null,
    last_error: null,
    idempotency_key: `idem-smoke-${Date.now()}`
  };
  const ins = await sb.from('jobs').insert(insertJob).select('*').single();
  if (ins.error) throw new Error(`insert job failed: ${ins.error.message}`);
  const job = ins.data;
  summary.jobId = job.id;

  // 3) Pick & lock via RPC
  {
    const { data: picked, error } = await sb.rpc('jobs_pick_for_update', { p_type: 'cancel_payment', p_now: nowIso() });
    if (error) throw new Error(`pick rpc failed: ${error.message}`);
    if (!picked) throw new Error('pick returned null (expected one running job)');
    if (picked.id !== job.id) throw new Error(`picked another job (${picked.id}) != inserted (${job.id})`);
    if (picked.status !== 'running' || !picked.locked) throw new Error('picked job not running+locked');
    summary.checks.push('pick-ok');
  }

  // 4) Append events and read back
  {
    const evs = [
      { job_id: job.id, at: nowIso(), event: 'queued', note: 'smoke' },
      { job_id: job.id, at: nowIso(), event: 'running', note: 'smoke' },
    ];
    const evIns = await sb.from('job_events').insert(evs);
    if (evIns.error) throw new Error(`insert events failed: ${evIns.error.message}`);

    const { data: listed, error } = await sb.from('job_events')
      .select('id,job_id,at,event,note')
      .eq('job_id', job.id)
      .order('at', { ascending: true });
    if (error) throw new Error(`list events failed: ${error.message}`);
    if (!listed || listed.length < 2) throw new Error('events not found or insufficient length');

    summary.checks.push('events-ok');
  }

  // 5) Update status → succeeded (integration touch)
  {
    const patch = { status: 'succeeded', status_detail: 'smoke-finish', locked: true };
    const upd = await sb.from('jobs').update(patch).eq('id', job.id).select('*').single();
    if (upd.error) throw new Error(`update status failed: ${upd.error.message}`);
    if (upd.data.status !== 'succeeded') throw new Error('job not marked succeeded');
    summary.checks.push('update-ok');
  }

  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }, null, 2));
  process.exit(1);
});


