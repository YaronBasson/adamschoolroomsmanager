-- Schedule templates: named weekly occupancy patterns
create table public.schedule_templates (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  school_type text not null check (school_type in ('יסודי', 'תיכון')),
  -- Array of {day: 0-5, period: 1-10} — only occupied entries stored
  periods     jsonb not null default '[]',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Per-room schedule: linked to a template (or custom)
create table public.room_schedules (
  room_id        uuid primary key references public.rooms(id) on delete cascade,
  template_id    uuid references public.schedule_templates(id) on delete set null,
  -- NULL = use template as-is; non-null = fully custom override
  custom_periods jsonb,
  updated_at     timestamptz not null default now()
);

-- Seed default templates
-- Helper: generate array of {day, period} for days 0-5, periods 1..n
insert into public.schedule_templates (name, school_type, periods) values
(
  'יסודי סיום 13:00',
  'יסודי',
  '[
    {"day":0,"period":1},{"day":0,"period":2},{"day":0,"period":3},{"day":0,"period":4},{"day":0,"period":5},
    {"day":1,"period":1},{"day":1,"period":2},{"day":1,"period":3},{"day":1,"period":4},{"day":1,"period":5},
    {"day":2,"period":1},{"day":2,"period":2},{"day":2,"period":3},{"day":2,"period":4},{"day":2,"period":5},
    {"day":3,"period":1},{"day":3,"period":2},{"day":3,"period":3},{"day":3,"period":4},{"day":3,"period":5},
    {"day":4,"period":1},{"day":4,"period":2},{"day":4,"period":3},{"day":4,"period":4},{"day":4,"period":5},
    {"day":5,"period":1},{"day":5,"period":2},{"day":5,"period":3},{"day":5,"period":4}
  ]'::jsonb
),
(
  'יסודי סיום 14:00',
  'יסודי',
  '[
    {"day":0,"period":1},{"day":0,"period":2},{"day":0,"period":3},{"day":0,"period":4},{"day":0,"period":5},{"day":0,"period":6},
    {"day":1,"period":1},{"day":1,"period":2},{"day":1,"period":3},{"day":1,"period":4},{"day":1,"period":5},{"day":1,"period":6},
    {"day":2,"period":1},{"day":2,"period":2},{"day":2,"period":3},{"day":2,"period":4},{"day":2,"period":5},{"day":2,"period":6},
    {"day":3,"period":1},{"day":3,"period":2},{"day":3,"period":3},{"day":3,"period":4},{"day":3,"period":5},{"day":3,"period":6},
    {"day":4,"period":1},{"day":4,"period":2},{"day":4,"period":3},{"day":4,"period":4},{"day":4,"period":5},{"day":4,"period":6},
    {"day":5,"period":1},{"day":5,"period":2},{"day":5,"period":3},{"day":5,"period":4}
  ]'::jsonb
),
(
  'תיכון סיום 14:45',
  'תיכון',
  '[
    {"day":0,"period":1},{"day":0,"period":2},{"day":0,"period":3},{"day":0,"period":4},{"day":0,"period":5},{"day":0,"period":6},{"day":0,"period":7},
    {"day":1,"period":1},{"day":1,"period":2},{"day":1,"period":3},{"day":1,"period":4},{"day":1,"period":5},{"day":1,"period":6},{"day":1,"period":7},
    {"day":2,"period":1},{"day":2,"period":2},{"day":2,"period":3},{"day":2,"period":4},{"day":2,"period":5},{"day":2,"period":6},{"day":2,"period":7},
    {"day":3,"period":1},{"day":3,"period":2},{"day":3,"period":3},{"day":3,"period":4},{"day":3,"period":5},{"day":3,"period":6},{"day":3,"period":7},
    {"day":4,"period":1},{"day":4,"period":2},{"day":4,"period":3},{"day":4,"period":4},{"day":4,"period":5},{"day":4,"period":6},{"day":4,"period":7},
    {"day":5,"period":1},{"day":5,"period":2},{"day":5,"period":3},{"day":5,"period":4},{"day":5,"period":5}
  ]'::jsonb
),
(
  'תיכון סיום 15:30',
  'תיכון',
  '[
    {"day":0,"period":1},{"day":0,"period":2},{"day":0,"period":3},{"day":0,"period":4},{"day":0,"period":5},{"day":0,"period":6},{"day":0,"period":7},{"day":0,"period":8},
    {"day":1,"period":1},{"day":1,"period":2},{"day":1,"period":3},{"day":1,"period":4},{"day":1,"period":5},{"day":1,"period":6},{"day":1,"period":7},{"day":1,"period":8},
    {"day":2,"period":1},{"day":2,"period":2},{"day":2,"period":3},{"day":2,"period":4},{"day":2,"period":5},{"day":2,"period":6},{"day":2,"period":7},{"day":2,"period":8},
    {"day":3,"period":1},{"day":3,"period":2},{"day":3,"period":3},{"day":3,"period":4},{"day":3,"period":5},{"day":3,"period":6},{"day":3,"period":7},{"day":3,"period":8},
    {"day":4,"period":1},{"day":4,"period":2},{"day":4,"period":3},{"day":4,"period":4},{"day":4,"period":5},{"day":4,"period":6},{"day":4,"period":7},{"day":4,"period":8},
    {"day":5,"period":1},{"day":5,"period":2},{"day":5,"period":3},{"day":5,"period":4},{"day":5,"period":5}
  ]'::jsonb
);
