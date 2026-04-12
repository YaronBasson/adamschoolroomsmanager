create table public.school_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.school_settings (key, value) values
  ('school_year_start',         '"2025-09-01"'),
  ('school_year_end_primary',   '"2026-06-30"'),
  ('school_year_end_secondary', '"2026-06-20"');
