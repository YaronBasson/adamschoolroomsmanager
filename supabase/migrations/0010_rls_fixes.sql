-- Enable RLS on tables that were missing it.
-- All write operations go through admin-only API routes (server-side auth check),
-- so these policies only affect direct PostgREST / anon-key access.
-- Idempotent: drops policies before recreating so this can be re-run safely.

-- ============================================================
-- Fix mutable search_path on helper functions (is_approved, is_admin).
-- security definer functions are especially sensitive: without a fixed
-- search_path an attacker could shadow auth or public objects.
-- ============================================================
create or replace function public.is_approved()
returns boolean language sql security definer
set search_path = public
as $$
  select coalesce(
    (select approved from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean language sql security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- Fix mutable search_path on check_room_availability trigger function.
-- Without a fixed search_path a malicious user could shadow public objects
-- via schema injection. SET search_path = public pins the lookup.
-- ============================================================
create or replace function public.check_room_availability()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.bookings
    where room_id = new.room_id
      and status = 'active'
      and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and (new.start_time, new.end_time) overlaps (start_time, end_time)
  ) then
    raise exception 'Room is already booked for this time slot';
  end if;
  return new;
end;
$$;

-- ============================================================
-- school_settings
-- ============================================================
alter table public.school_settings enable row level security;

drop policy if exists "Approved users can read school settings" on public.school_settings;
drop policy if exists "Admins can manage school settings"       on public.school_settings;

create policy "Approved users can read school settings"
  on public.school_settings for select
  using (
    (select approved from public.profiles where id = auth.uid())
  );

create policy "Admins can manage school settings"
  on public.school_settings for all
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- ============================================================
-- schedule_templates
-- ============================================================
alter table public.schedule_templates enable row level security;

drop policy if exists "Approved users can read schedule templates" on public.schedule_templates;
drop policy if exists "Admins can manage schedule templates"       on public.schedule_templates;

create policy "Approved users can read schedule templates"
  on public.schedule_templates for select
  using (
    (select approved from public.profiles where id = auth.uid())
  );

create policy "Admins can manage schedule templates"
  on public.schedule_templates for all
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- ============================================================
-- room_schedules
-- ============================================================
alter table public.room_schedules enable row level security;

drop policy if exists "Approved users can read room schedules" on public.room_schedules;
drop policy if exists "Admins can manage room schedules"       on public.room_schedules;

create policy "Approved users can read room schedules"
  on public.room_schedules for select
  using (
    (select approved from public.profiles where id = auth.uid())
  );

create policy "Admins can manage room schedules"
  on public.room_schedules for all
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );
