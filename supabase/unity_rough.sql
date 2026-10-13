-- ============================================================================
-- Module: unity_rough
-- Stores the device-permission outcomes (camera / microphone / location) and
-- the captured geolocation for each Self Video KYC journey run.
-- Run this in the Supabase SQL Editor of your target project.
-- ============================================================================

create table if not exists public.unity_rough (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  session_id          uuid,
  camera_granted      boolean,
  microphone_granted  boolean,
  location_granted    boolean,
  latitude            double precision,
  longitude           double precision,
  accuracy            double precision,
  user_agent          text
);

-- Row Level Security: this is a prototype ("rough") module, so we allow the
-- public anon role to INSERT its own rows from the browser. No SELECT is
-- granted to anon, so data can only be read with the service role / dashboard.
alter table public.unity_rough enable row level security;

drop policy if exists "unity_rough anon insert" on public.unity_rough;
create policy "unity_rough anon insert"
  on public.unity_rough
  for insert
  to anon, authenticated
  with check (true);
