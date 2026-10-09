-- Rode este arquivo no Supabase: Dashboard → SQL Editor → New query → Run.
-- Os limites de tamanho são os mesmos de src/app/models/entities/task.ts (TASK_LIMITS).

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  status      text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Prioridade e prazo (pode rodar de novo em bancos antigos: só cria o que faltar).
alter table public.tasks
  add column if not exists priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  add column if not exists due_date date;

create index if not exists tasks_user_status_position_idx
  on public.tasks (user_id, status, position);

-- Segurança: cada usuário só enxerga e altera as próprias tarefas.
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);
