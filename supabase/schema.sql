-- Rode este arquivo no Supabase: Dashboard → SQL Editor → New query → Run.
-- Os limites de tamanho são os mesmos de src/app/models/entidades/tarefa.ts (LIMITES_TAREFA).

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  status      text not null default 'todo' check (status in ('waiting', 'todo', 'doing', 'done')),
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

-- Histórico de colunas: cada linha marca quando a tarefa entrou em uma coluna (status).
create table if not exists public.task_status_history (
  id          bigint generated always as identity primary key,
  task_id     uuid not null references public.tasks (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  status      text not null check (status in ('waiting', 'todo', 'doing', 'done')),
  changed_at  timestamptz not null default now()
);

create index if not exists task_status_history_task_idx
  on public.task_status_history (task_id, changed_at);

-- Segurança: cada usuário só lê o próprio histórico. Ninguém grava direto: só o gatilho abaixo.
alter table public.task_status_history enable row level security;

drop policy if exists "task_status_history_select_own" on public.task_status_history;
create policy "task_status_history_select_own" on public.task_status_history
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Gatilho: registra a coluna ao criar a tarefa e a cada troca de coluna.
create or replace function public.registrar_status_tarefa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.task_status_history (task_id, user_id, status)
    values (new.id, new.user_id, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_registrar_status on public.tasks;
create trigger tasks_registrar_status
  after insert or update of status on public.tasks
  for each row execute function public.registrar_status_tarefa();

-- Tarefas antigas (sem histórico): contam como se estivessem na coluna atual desde a criação.
insert into public.task_status_history (task_id, user_id, status, changed_at)
select t.id, t.user_id, t.status, t.created_at
from public.tasks t
where not exists (select 1 from public.task_status_history h where h.task_id = t.id);

-- Coluna "Aguardando aprovação" (waiting): atualiza a regra de status em bancos antigos.
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status in ('waiting', 'todo', 'doing', 'done'));

alter table public.task_status_history
  drop constraint if exists task_status_history_status_check;
alter table public.task_status_history add constraint task_status_history_status_check
  check (status in ('waiting', 'todo', 'doing', 'done'));
