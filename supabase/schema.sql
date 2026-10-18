-- ============================================================================
-- 影像面板 / Supabase 建表脚本
-- 用法：Supabase 控制台 → SQL Editor → 新建查询 → 整段粘贴 → Run
-- 使用前把下面 'YOUR_EMAIL_HERE' 改成你自己的登录邮箱（两处都要改）。
-- ============================================================================

-- 1. 影像表：一条记录 = 一条 B 站视频
create table if not exists public.videos (
  id          uuid primary key default gen_random_uuid(),
  bvid        text not null check (bvid ~ '^BV[0-9A-Za-z]{10}$'),
  title       text not null check (char_length(title) between 1 and 80),
  description text not null default '',
  cover_url   text not null default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- 2. 评论表：is_danmaku = true 的评论会同时出现在视频上方弹幕墙
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  video_id    uuid not null references public.videos(id) on delete cascade,
  nickname    text not null default '匿名访客' check (char_length(nickname) between 1 and 20),
  content     text not null check (char_length(content) between 1 and 300),
  is_danmaku  boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists videos_sort_idx   on public.videos (sort_order asc, created_at desc);
create index if not exists comments_video_idx on public.comments (video_id asc, created_at asc);

-- 3. 站主判定：JWT 里的邮箱 === 你的邮箱
--    把 'YOUR_EMAIL_HERE' 换成你注册 Supabase 账号用的邮箱。
create or replace function public.is_owner()
returns boolean
language sql
stable
security invoker
as $$
  select coalesce(lower(auth.jwt() ->> 'email') = lower('YOUR_EMAIL_HERE'), false);
$$;

-- 4. 开启行级安全（RLS）
alter table public.videos   enable row level security;
alter table public.comments enable row level security;

-- 5. 策略：所有人可读
drop policy if exists "videos read for all"   on public.videos;
drop policy if exists "comments read for all" on public.comments;
create policy "videos read for all"   on public.videos   for select using (true);
create policy "comments read for all" on public.comments for select using (true);

-- 6. 策略：只有站主可增删改影像
drop policy if exists "videos insert by owner" on public.videos;
drop policy if exists "videos update by owner" on public.videos;
drop policy if exists "videos delete by owner" on public.videos;
create policy "videos insert by owner" on public.videos for insert to authenticated with check (public.is_owner());
create policy "videos update by owner" on public.videos for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "videos delete by owner" on public.videos for delete to authenticated using (public.is_owner());

-- 7. 策略：访客（含未登录匿名）可以发评论，但不能改、不能删
drop policy if exists "comments insert for everyone" on public.comments;
drop policy if exists "comments delete by owner"    on public.comments;
create policy "comments insert for everyone" on public.comments
  for insert to anon, authenticated
  with check (char_length(content) between 1 and 300);
create policy "comments delete by owner" on public.comments
  for delete to authenticated using (public.is_owner());

-- 8. 可选：如果你想预置一条示例影像，取消下面注释再运行
-- insert into public.videos (bvid, title, description, sort_order)
-- values ('BV1GJ411x7h7', '示例影像 / 夜行', '换成你自己的 B 站视频即可。', 1);

-- ============================================================================
-- 运行完之后回到 Supabase：
--   Project Settings → API → Project URL / anon public key
-- 把这两个值填进项目根目录的 .env.local（或 GitHub 仓库 Variables）：
--   VITE_SUPABASE_URL=...
--   VITE_SUPABASE_ANON_KEY=...
--   VITE_OWNER_EMAIL=你注册用的邮箱（与上面 is_owner() 里填的一致）
-- ============================================================================
