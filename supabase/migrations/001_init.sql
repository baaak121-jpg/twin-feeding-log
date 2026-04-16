-- Enable pgcrypto for UUID generation
create extension if not exists "pgcrypto";

-- ========================
-- users
-- ========================
create table if not exists public.users (
  id           uuid primary key default gen_random_uuid(),
  toss_user_key bigint unique not null,
  ai_credits   int not null default 10,
  created_at   timestamptz default now()
);

alter table public.users enable row level security;

create policy "users: read own" on public.users
  for select using (auth.uid() = id);

create policy "users: update own" on public.users
  for update using (auth.uid() = id);

-- ========================
-- families
-- ========================
create table if not exists public.families (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references public.users(id) on delete set null,
  invite_code  text unique not null default encode(gen_random_bytes(16), 'hex'),
  first_name   text not null default '첫째',
  second_name  text not null default '둘째',
  created_at   timestamptz default now()
);

alter table public.families enable row level security;

-- ========================
-- family_members
-- ========================
create table if not exists public.family_members (
  family_id  uuid references public.families(id) on delete cascade,
  user_id    uuid references public.users(id) on delete cascade,
  joined_at  timestamptz default now(),
  primary key (family_id, user_id)
);

alter table public.family_members enable row level security;

create policy "family_members: read own" on public.family_members
  for select using (user_id = auth.uid());

create policy "family_members: insert own" on public.family_members
  for insert with check (user_id = auth.uid());

-- families RLS (family_members 테이블 생성 후)
create policy "families: member read" on public.families
  for select using (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = id and fm.user_id = auth.uid()
    )
  );

create policy "families: owner update" on public.families
  for update using (owner_id = auth.uid());

-- ========================
-- logs
-- ========================
create table if not exists public.logs (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid references public.families(id) on delete cascade,
  date       date not null,
  time       text not null,       -- 'HH:MM'
  baby       text not null check (baby in ('1', '2', 'both')),
  volume     int,
  unit       text check (unit in ('ml', 'min', 'nap')),
  poop       boolean not null default false,
  created_at timestamptz default now()
);

alter table public.logs enable row level security;

create policy "logs: family member read" on public.logs
  for select using (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = logs.family_id and fm.user_id = auth.uid()
    )
  );

create policy "logs: family member insert" on public.logs
  for insert with check (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = family_id and fm.user_id = auth.uid()
    )
  );

create policy "logs: family member update" on public.logs
  for update using (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = logs.family_id and fm.user_id = auth.uid()
    )
  );

create policy "logs: family member delete" on public.logs
  for delete using (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = logs.family_id and fm.user_id = auth.uid()
    )
  );

-- Index for fast date queries
create index if not exists logs_family_date_idx on public.logs (family_id, date);
