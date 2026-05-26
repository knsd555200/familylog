-- auth 이벤트 로그 테이블
create table if not exists public.auth_logs (
  id         bigserial    primary key,
  event      text         not null,
  uid        text,
  message    text,
  pathname   text,
  created_at timestamptz  not null default now()
);

-- RLS 활성화: anon/authenticated 모두 insert 허용, select는 service_role만
alter table public.auth_logs enable row level security;

create policy "auth_logs_insert"
  on public.auth_logs
  for insert
  to anon, authenticated
  with check (true);
