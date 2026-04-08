-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- Extends auth.users with role and approval status
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text not null default '',
  role       text not null default 'user' check (role in ('user', 'admin')),
  approved   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROOMS
-- ============================================================
create table public.rooms (
  id          uuid primary key default uuid_generate_v4(),
  floor       integer not null,
  room_number text not null,
  capacity    integer not null default 1,
  equipment   text[] not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (floor, room_number)
);

-- ============================================================
-- BOOKING REASONS
-- ============================================================
create table public.booking_reasons (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed some default reasons
insert into public.booking_reasons (name) values
  ('חזרה לבחינה'),
  ('שיעור פרטי'),
  ('חוג מוזיקה'),
  ('חוג ריקוד'),
  ('ישיבת צוות'),
  ('אירוע בית ספרי'),
  ('אחר');

-- ============================================================
-- BOOKINGS
-- ============================================================
create table public.bookings (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  room_id    uuid not null references public.rooms(id) on delete cascade,
  reason_id  uuid references public.booking_reasons(id) on delete set null,
  reason_text text,           -- custom reason if not from list
  start_time timestamptz not null,
  end_time   timestamptz not null,
  status     text not null default 'active' check (status in ('active', 'canceled')),
  created_at timestamptz not null default now(),
  constraint bookings_time_check check (end_time > start_time)
);

-- Prevent double-booking: no two active bookings on the same room at overlapping times
create or replace function check_room_availability()
returns trigger language plpgsql as $$
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

create trigger enforce_room_availability
  before insert or update on public.bookings
  for each row when (new.status = 'active')
  execute procedure check_room_availability();

-- ============================================================
-- SWITCH REQUESTS
-- ============================================================
create table public.switch_requests (
  id                    uuid primary key default uuid_generate_v4(),
  requester_booking_id  uuid not null references public.bookings(id) on delete cascade,
  target_booking_id     uuid not null references public.bookings(id) on delete cascade,
  status                text not null default 'pending' check (status in ('pending', 'approved', 'canceled')),
  created_at            timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.rooms           enable row level security;
alter table public.booking_reasons enable row level security;
alter table public.bookings        enable row level security;
alter table public.switch_requests enable row level security;

-- Helper: check if current user is approved
create or replace function public.is_approved()
returns boolean language sql security definer as $$
  select coalesce(
    (select approved from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- PROFILES policies
create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin());

-- ROOMS policies
create policy "Approved users can view active rooms"
  on public.rooms for select
  using (public.is_approved() and is_active = true or public.is_admin());

create policy "Admins can manage rooms"
  on public.rooms for all
  using (public.is_admin());

-- BOOKING REASONS policies
create policy "Approved users can view active reasons"
  on public.booking_reasons for select
  using (public.is_approved() and is_active = true or public.is_admin());

create policy "Admins can manage reasons"
  on public.booking_reasons for all
  using (public.is_admin());

-- BOOKINGS policies
create policy "Approved users can view all active bookings"
  on public.bookings for select
  using (public.is_approved());

create policy "Approved users can create own bookings"
  on public.bookings for insert
  with check (user_id = auth.uid() and public.is_approved());

create policy "Users can cancel own bookings"
  on public.bookings for update
  using (user_id = auth.uid() and public.is_approved())
  with check (user_id = auth.uid());

create policy "Admins can manage all bookings"
  on public.bookings for all
  using (public.is_admin());

-- SWITCH REQUESTS policies
create policy "Approved users can view own switch requests"
  on public.switch_requests for select
  using (
    public.is_approved() and (
      exists (select 1 from public.bookings where id = requester_booking_id and user_id = auth.uid())
      or
      exists (select 1 from public.bookings where id = target_booking_id and user_id = auth.uid())
    )
    or public.is_admin()
  );

create policy "Approved users can create switch requests"
  on public.switch_requests for insert
  with check (
    public.is_approved() and
    exists (select 1 from public.bookings where id = requester_booking_id and user_id = auth.uid())
  );

create policy "Involved users can update switch requests"
  on public.switch_requests for update
  using (
    exists (select 1 from public.bookings where id = requester_booking_id and user_id = auth.uid())
    or
    exists (select 1 from public.bookings where id = target_booking_id and user_id = auth.uid())
    or public.is_admin()
  );
