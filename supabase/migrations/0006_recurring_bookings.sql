create table public.recurring_booking_requests (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  room_id      uuid not null references public.rooms(id) on delete cascade,
  reason_id    uuid references public.booking_reasons(id) on delete set null,
  reason_text  text,
  day_of_week  integer not null check (day_of_week between 0 and 6),
  start_period integer not null,
  end_period   integer not null,
  school_type  text not null check (school_type in ('יסודי', 'תיכון')),
  start_date   date not null,
  end_date     date,
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  admin_note   text,
  approved_by  uuid references public.profiles(id) on delete set null,
  approved_at  timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.recurring_booking_requests enable row level security;

-- Users see their own; admins see all
create policy "Users see own recurring requests" on public.recurring_booking_requests
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can create recurring requests" on public.recurring_booking_requests
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and approved = true
    )
  );

create policy "Admins can update recurring requests" on public.recurring_booking_requests
  for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
