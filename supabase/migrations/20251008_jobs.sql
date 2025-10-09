-- jobs / job_events schema and RPC for atomic pick & lock

-- 1) jobs table
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  status text not null check (status in ('queued','running','succeeded','failed')),
  attempts int not null default 0,
  locked boolean not null default false,
  next_run_at timestamptz,
  status_detail text,
  last_error_code text,
  last_error text,
  idempotency_key text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_pick
  on public.jobs (type, status, locked, next_run_at);

create unique index if not exists uq_jobs_idempotency
  on public.jobs (idempotency_key)
  where idempotency_key is not null;

-- 2) job_events table
create table if not exists public.job_events (
  id bigserial primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  at timestamptz not null default now(),
  event text not null,      -- queued|running|rescheduled|succeeded|failed
  note text,
  payload jsonb
);

create index if not exists idx_job_events_job_id on public.job_events(job_id);

-- 3) touch updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_jobs_touch on public.jobs;
create trigger trg_jobs_touch before update on public.jobs
for each row execute procedure public.touch_updated_at();

-- 4) RPC: jobs_pick_for_update
create or replace function public.jobs_pick_for_update(p_type text, p_now timestamptz)
returns public.jobs
language sql
security definer
as $$
  with cte as (
    select id
    from public.jobs
    where type = p_type
      and status = 'queued'
      and locked = false
      and (next_run_at is null or next_run_at <= p_now)
    order by next_run_at nulls first, created_at
    limit 1
    for update skip locked
  )
  update public.jobs j
    set status = 'running',
        locked = true,
        attempts = j.attempts + 1,
        updated_at = now()
  from cte
  where j.id = cte.id
  returning j.*;
$$;


