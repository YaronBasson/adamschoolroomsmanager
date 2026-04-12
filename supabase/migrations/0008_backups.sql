create table public.backups (
  id         uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  label      text not null,
  data       jsonb not null
);

alter table public.backups enable row level security;

create policy "Admins can manage backups" on public.backups
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
