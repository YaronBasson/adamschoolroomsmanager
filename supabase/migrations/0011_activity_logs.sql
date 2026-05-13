-- Activity log: records admin + booking activity for auditing.
-- Actor identity is denormalized (name/email snapshot) so logs survive
-- profile deletion.

create table public.activity_logs (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_name  text,
  actor_email text,
  action      text not null,
  entity_type text,
  entity_id   text,
  summary     text not null,
  details     jsonb
);

create index activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index activity_logs_actor_id_idx   on public.activity_logs (actor_id);
create index activity_logs_action_idx     on public.activity_logs (action);

alter table public.activity_logs enable row level security;

drop policy if exists "Admins can manage activity logs" on public.activity_logs;

create policy "Admins can manage activity logs"
  on public.activity_logs for all
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );
