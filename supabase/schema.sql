-- =======================================================
-- SCHEMA CHO CÀ PHÊ APP TRÊN SUPABASE (PostgreSQL)
-- Chạy đoạn mã này trong mục SQL Editor trên Dashboard Supabase
-- =======================================================

-- 1. Bảng Hồ sơ người dùng
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text default 'Người dùng',
  budget numeric default 3000000,
  income numeric default 0,
  theme text default 'dark',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Bảng Nhóm ngân sách / danh mục
create table if not exists public.groups (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  share numeric default 0.1,
  color text default '#e0a24a',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Bảng Công việc / Lịch trình (Tasks)
create table if not exists public.tasks (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  date text not null,
  start_time text default '09:00',
  end_time text default '10:00',
  cat text default 'Học tập',
  pri text default 'Trung bình',
  note text default '',
  status text default 'todo',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Bảng Mục tiêu (Goals)
create table if not exists public.goals (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  target numeric not null,
  current numeric default 0,
  unit text default 'đ',
  pri text default 'Trung bình',
  auto boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Bảng Thu chi (Transactions)
create table if not exists public.transactions (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null, -- 'expense' hoặc 'income'
  amount numeric not null,
  date text not null,
  note text default '',
  task_id text,
  goal_id text,
  auto_goal boolean default true,
  grp text default 'Khác',
  tk text default '',
  alloc jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- KÍCH HOẠT ROW LEVEL SECURITY (RLS) để đảm bảo bảo mật dữ liệu riêng tư
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.tasks enable row level security;
alter table public.goals enable row level security;
alter table public.transactions enable row level security;

-- Tạo chính sách phân quyền cho từng bảng
drop policy if exists "User manages own profile" on public.profiles;
create policy "User manages own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "User manages own groups" on public.groups;
create policy "User manages own groups" on public.groups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "User manages own tasks" on public.tasks;
create policy "User manages own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "User manages own goals" on public.goals;
create policy "User manages own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "User manages own transactions" on public.transactions;
create policy "User manages own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tự động khởi tạo profile khi user mới đăng ký
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, budget, income)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    3000000,
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Người dùng chỉ có thể xóa chính tài khoản đang đăng nhập. Hàm chạy với
-- quyền của chủ sở hữu schema để có thể xóa auth.users; các bảng public sẽ
-- tự xóa nhờ các khóa ngoại `on delete cascade` ở trên.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập để xóa tài khoản.';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
