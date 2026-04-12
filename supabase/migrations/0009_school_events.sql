create table public.school_events (
  id                  uuid primary key default uuid_generate_v4(),
  title               text not null,
  event_date          date,
  school_type         text check (school_type in ('יסודי', 'תיכון', 'שניהם')),
  description         text,
  responsible_user_id uuid references public.profiles(id) on delete set null,
  classes             text[] not null default '{}',
  booking_ids         uuid[] not null default '{}',
  reminder_sent       boolean not null default false,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now()
);

alter table public.school_events enable row level security;

-- All approved users can read; only admins can write
create policy "Approved users can view events" on public.school_events
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and approved = true
    )
  );

create policy "Admins can manage events" on public.school_events
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
