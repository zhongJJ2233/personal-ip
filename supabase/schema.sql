-- ============================================================================
-- 影像面板 / Supabase 建表脚本
-- 用法：Supabase 控制台 → SQL Editor → 新建查询 → 整段粘贴 → Run
-- 使用前把下面 'YOUR_EMAIL_HERE' 改成你自己的登录邮箱（两处都要改）。
-- ============================================================================

-- 1. 影像表：一条记录 = 一条影像（B 站或抖音）
--    bvid 存「外部视频 ID」：B 站是 BV 号，抖音是 15-25 位数字
create table if not exists public.videos (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null default 'bili' check (platform in ('bili', 'douyin')),
  bvid        text not null check (bvid ~ '^(BV[0-9A-Za-z]{10}|[0-9]{15,25})$'),
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

-- 8. 点赞表：同一访客对同一条影像最多一个赞
--    visitor_id 由浏览器本地随机生成，用来去重和记住「我赞过」，不含个人信息。
create table if not exists public.video_likes (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid not null references public.videos(id) on delete cascade,
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  created_at timestamptz not null default now(),
  unique (video_id, visitor_id)
);

create index if not exists video_likes_video_idx on public.video_likes (video_id asc);

alter table public.video_likes enable row level security;

drop policy if exists "likes read for all"       on public.video_likes;
drop policy if exists "likes insert for everyone" on public.video_likes;
drop policy if exists "likes delete for everyone" on public.video_likes;
create policy "likes read for all"        on public.video_likes for select using (true);
create policy "likes insert for everyone" on public.video_likes
  for insert to anon, authenticated
  with check (char_length(visitor_id) between 8 and 64);
create policy "likes delete for everyone" on public.video_likes
  for delete to anon, authenticated using (true);

-- 9. 可选：如果你想预置一条示例影像，取消下面注释再运行
-- insert into public.videos (bvid, title, description, sort_order)
-- values ('BV1GJ411x7h7', '示例影像 / 夜行', '换成你自己的 B 站视频即可。', 1);

-- ============================================================================
-- 10. 近期我说的（博客面板）
--     站主可以发布 / 编辑 / 删除帖子；访客可以浏览、点赞、转发、评论（可带 emoji）。
--     转发 = 复制带 #post/<id> 的链接，不落库。
-- ============================================================================

-- 10.1 帖子表：只有站主能写
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 60),
  body        text not null check (char_length(body) between 1 and 5000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists posts_created_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

drop policy if exists "posts read for all"     on public.posts;
drop policy if exists "posts insert by owner"  on public.posts;
drop policy if exists "posts update by owner"  on public.posts;
drop policy if exists "posts delete by owner"  on public.posts;
create policy "posts read for all"    on public.posts for select using (true);
create policy "posts insert by owner" on public.posts for insert to authenticated with check (public.is_owner());
create policy "posts update by owner" on public.posts for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "posts delete by owner" on public.posts for delete to authenticated using (public.is_owner());

-- 10.2 帖子评论：访客可发（含 emoji），站主可删
create table if not exists public.post_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  nickname    text not null default '匿名访客' check (char_length(nickname) between 1 and 20),
  content     text not null check (char_length(content) between 1 and 200),
  created_at  timestamptz not null default now()
);

create index if not exists post_comments_post_idx on public.post_comments (post_id asc, created_at asc);

alter table public.post_comments enable row level security;

drop policy if exists "post comments read for all"        on public.post_comments;
drop policy if exists "post comments insert for everyone" on public.post_comments;
drop policy if exists "post comments delete by owner"     on public.post_comments;
create policy "post comments read for all" on public.post_comments for select using (true);
create policy "post comments insert for everyone" on public.post_comments
  for insert to anon, authenticated
  with check (char_length(content) between 1 and 200);
create policy "post comments delete by owner" on public.post_comments
  for delete to authenticated using (public.is_owner());

-- 10.3 帖子点赞：同一访客对同一篇最多一个赞
create table if not exists public.post_likes (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  created_at timestamptz not null default now(),
  unique (post_id, visitor_id)
);

create index if not exists post_likes_post_idx on public.post_likes (post_id asc);

alter table public.post_likes enable row level security;

drop policy if exists "post likes read for all"        on public.post_likes;
drop policy if exists "post likes insert for everyone" on public.post_likes;
drop policy if exists "post likes delete for everyone" on public.post_likes;
create policy "post likes read for all"        on public.post_likes for select using (true);
create policy "post likes insert for everyone" on public.post_likes
  for insert to anon, authenticated
  with check (char_length(visitor_id) between 8 and 64);
create policy "post likes delete for everyone" on public.post_likes
  for delete to anon, authenticated using (true);

-- 10.4 可选：预置一篇示例帖子（把标题和正文换成你自己的）
-- insert into public.posts (title, body) values
--   ('第一篇', '这里是正文。空一行分段。');

-- ============================================================================
-- 11. 影像支持抖音：新增 platform 字段，放宽 bvid 的校验
--     已经跑过前面脚本的，把这一节再执行一次即可（幂等）。
-- ============================================================================

-- 11.1 平台：bili（B 站）或 douyin（抖音），老数据默认 B 站
alter table public.videos add column if not exists platform text not null default 'bili';

-- 11.2 bvid 现在存「外部视频 ID」：B 站是 BV 号，抖音是 15-25 位数字
alter table public.videos drop constraint if exists videos_bvid_check;
alter table public.videos add constraint videos_bvid_check
  check (bvid ~ '^(BV[0-9A-Za-z]{10}|[0-9]{15,25})$');

-- 11.3 平台取值只能是这两个
alter table public.videos drop constraint if exists videos_platform_check;
alter table public.videos add constraint videos_platform_check
  check (platform in ('bili', 'douyin'));

-- ============================================================================
-- 运行完之后回到 Supabase：
--   Project Settings → API → Project URL / anon public key
-- 把这两个值填进项目根目录的 .env.local（或 GitHub 仓库 Variables）：
--   VITE_SUPABASE_URL=...
--   VITE_SUPABASE_ANON_KEY=...
--   VITE_OWNER_EMAIL=你注册用的邮箱（与上面 is_owner() 里填的一致）
-- ============================================================================
