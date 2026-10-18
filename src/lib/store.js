import { backend } from './config.js';

const LS = {
  videos: 'li_video_videos_v1',
  comments: 'li_video_comments_v1',
  session: 'li_video_session_v1',
  nickname: 'li_video_nickname',
  likes: 'li_video_likes_v1',
  liked: 'li_video_liked_v1',
  visitor: 'li_video_visitor_v1',
  posts: 'li_blog_posts_v1',
  postComments: 'li_blog_comments_v1',
  postLikes: 'li_blog_likes_v1',
  postLiked: 'li_blog_liked_v1'
};

const readLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeLS = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 忽略隐私模式下的写入失败 */
  }
};

const nowISO = () => new Date().toISOString();
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `v-${Date.now()}-${Math.random().toString(16).slice(2)}`);

/** 访客标识：只存在本机，用来记住「我点过赞」并防止重复点赞。 */
function visitorId() {
  let id = '';
  try {
    id = localStorage.getItem(LS.visitor) || '';
  } catch {
    id = '';
  }
  if (!id) {
    id = uid();
    try {
      localStorage.setItem(LS.visitor, id);
    } catch {
      /* 忽略隐私模式下的写入失败 */
    }
  }
  return id;
}

const DEMO_VIDEOS = [
  {
    id: 'demo-video-1',
    bvid: 'BV1GJ411x7h7',
    title: '示例影像 / 夜行',
    description: '这是一条示例影像。站主登录后台后，可以把它替换成自己的 B 站视频。',
    cover_url: '',
    sort_order: 1,
    created_at: '2025-01-10T20:00:00.000Z'
  }
];

const DEMO_COMMENTS = [
  {
    id: 'demo-comment-1',
    video_id: 'demo-video-1',
    nickname: '路过的朋友',
    content: '这个站的气质很对。',
    is_danmaku: false,
    created_at: '2025-01-11T09:12:00.000Z'
  },
  {
    id: 'demo-comment-2',
    video_id: 'demo-video-1',
    nickname: '匿名观察者',
    content: '弹幕测试：第一排留给好奇的人',
    is_danmaku: true,
    created_at: '2025-01-11T09:15:00.000Z'
  }
];

const DEMO_POSTS = [
  {
    id: 'demo-post-1',
    title: '把灵感变成可以参与的东西',
    body:
      '最近在整理这半年做过的事，发现一个共同点：真正留下来的，不是那些「想得很完整」的方案，而是那些「先让人玩起来」的小实验。\n\n' +
      '比如一场只有二十个人的线下分享，我准备了三页纸，剩下的时间都在听大家说。散场后有两个人留下来，聊到路灯亮起来。那天的收获比任何一次正经的复盘都多。\n\n' +
      '所以这条博客大概会是这样：不追热点，不写正确的废话，只记录那些还带着温度的具体时刻。更新随缘，但每次都会认真写。',
    created_at: '2025-01-08T12:30:00.000Z',
    updated_at: '2025-01-08T12:30:00.000Z'
  },
  {
    id: 'demo-post-2',
    title: '为什么我还在写长文',
    body:
      '短视频教会我节奏，长文教会我耐心。前者是把手伸出去，后者是把手收回来。\n\n' +
      '写长文的时候，我必须真的想清楚一件事的来龙去脉：它从哪来，中间绕了哪些弯路，最后为什么停在这里。这个过程没人看，但它决定了我说话时有没有底气。\n\n' +
      '如果你也刚好在写点什么，别急着发。先写完，放一晚，第二天再读一遍。你会发现有一半的句子可以删掉，而剩下的那一半，才是你想说的。',
    created_at: '2024-12-21T09:05:00.000Z',
    updated_at: '2024-12-21T09:05:00.000Z'
  }
];

const DEMO_POST_COMMENTS = [
  {
    id: 'demo-post-comment-1',
    post_id: 'demo-post-1',
    nickname: '路过的朋友',
    content: '「先让人玩起来」这句记下了 🙌',
    created_at: '2025-01-09T03:20:00.000Z'
  },
  {
    id: 'demo-post-comment-2',
    post_id: 'demo-post-1',
    nickname: '匿名观察者',
    content: '期待更新，随缘也没关系 🌿',
    created_at: '2025-01-09T11:02:00.000Z'
  },
  {
    id: 'demo-post-comment-3',
    post_id: 'demo-post-2',
    nickname: '一个也在写的人',
    content: '「先写完，放一晚」很受用 ✍️',
    created_at: '2024-12-22T02:40:00.000Z'
  }
];

export const isDemo = () => !backend.enabled;

/* ------------------------------------------------------------------ */
/* 演示模式：localStorage                                              */
/* ------------------------------------------------------------------ */

function demoVideos() {
  return readLS(LS.videos, DEMO_VIDEOS);
}
function demoComments() {
  return readLS(LS.comments, DEMO_COMMENTS);
}
function demoPosts() {
  return readLS(LS.posts, DEMO_POSTS);
}
function demoPostComments() {
  return readLS(LS.postComments, DEMO_POST_COMMENTS);
}

const demoApi = {
  async listVideos() {
    return [...demoVideos()].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  },
  async saveVideo(input) {
    const list = demoVideos();
    if (input.id) {
      const next = list.map((v) => (v.id === input.id ? { ...v, ...input } : v));
      writeLS(LS.videos, next);
      return next.find((v) => v.id === input.id);
    }
    const created = { ...input, id: uid(), created_at: nowISO() };
    writeLS(LS.videos, [...list, created]);
    return created;
  },
  async deleteVideo(id) {
    writeLS(LS.videos, demoVideos().filter((v) => v.id !== id));
    writeLS(LS.comments, demoComments().filter((c) => c.video_id !== id));
    const counts = readLS(LS.likes, {});
    delete counts[id];
    writeLS(LS.likes, counts);
    writeLS(LS.liked, readLS(LS.liked, []).filter((likedId) => likedId !== id));
  },
  async listLikes() {
    const counts = readLS(LS.likes, {});
    const liked = readLS(LS.liked, []);
    const map = {};
    Object.entries(counts).forEach(([id, count]) => {
      map[id] = { count, liked: liked.includes(id) };
    });
    return map;
  },
  async toggleLike(videoId) {
    const counts = readLS(LS.likes, {});
    const liked = readLS(LS.liked, []);
    const wasLiked = liked.includes(videoId);
    const nextLiked = wasLiked ? liked.filter((id) => id !== videoId) : [...liked, videoId];
    const count = Math.max(0, (counts[videoId] || 0) + (wasLiked ? -1 : 1));
    writeLS(LS.liked, nextLiked);
    writeLS(LS.likes, { ...counts, [videoId]: count });
    return { videoId, count, liked: !wasLiked };
  },
  async listComments(videoId) {
    return demoComments()
      .filter((c) => c.video_id === videoId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },
  async addComment(input) {
    const created = { ...input, id: uid(), created_at: nowISO() };
    writeLS(LS.comments, [...demoComments(), created]);
    return created;
  },
  async deleteComment(id) {
    writeLS(LS.comments, demoComments().filter((c) => c.id !== id));
  },

  /* ---------------- 近期我说的（博客） ---------------- */

  async listPosts() {
    return [...demoPosts()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  async savePost(input) {
    const list = demoPosts();
    if (input.id) {
      const next = list.map((p) => (p.id === input.id ? { ...p, ...input, updated_at: nowISO() } : p));
      writeLS(LS.posts, next);
      return next.find((p) => p.id === input.id);
    }
    const created = { ...input, id: uid(), created_at: nowISO(), updated_at: nowISO() };
    writeLS(LS.posts, [created, ...list]);
    return created;
  },
  async deletePost(id) {
    writeLS(LS.posts, demoPosts().filter((p) => p.id !== id));
    writeLS(LS.postComments, demoPostComments().filter((c) => c.post_id !== id));
    const counts = readLS(LS.postLikes, {});
    delete counts[id];
    writeLS(LS.postLikes, counts);
    writeLS(LS.postLiked, readLS(LS.postLiked, []).filter((likedId) => likedId !== id));
  },
  async listPostLikes() {
    const counts = readLS(LS.postLikes, {});
    const liked = readLS(LS.postLiked, []);
    const map = {};
    Object.entries(counts).forEach(([id, count]) => {
      map[id] = { count, liked: liked.includes(id) };
    });
    return map;
  },
  async togglePostLike(postId) {
    const counts = readLS(LS.postLikes, {});
    const liked = readLS(LS.postLiked, []);
    const wasLiked = liked.includes(postId);
    writeLS(LS.postLiked, wasLiked ? liked.filter((id) => id !== postId) : [...liked, postId]);
    const count = Math.max(0, (counts[postId] || 0) + (wasLiked ? -1 : 1));
    writeLS(LS.postLikes, { ...counts, [postId]: count });
    return { postId, count, liked: !wasLiked };
  },
  async listPostComments(postId) {
    return demoPostComments()
      .filter((c) => c.post_id === postId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },
  async listPostCommentCounts() {
    const map = {};
    demoPostComments().forEach((c) => {
      map[c.post_id] = (map[c.post_id] || 0) + 1;
    });
    return map;
  },
  async addPostComment(input) {
    const created = { ...input, id: uid(), created_at: nowISO() };
    writeLS(LS.postComments, [...demoPostComments(), created]);
    return created;
  },
  async deletePostComment(id) {
    writeLS(LS.postComments, demoPostComments().filter((c) => c.id !== id));
  }
};

/* ------------------------------------------------------------------ */
/* Supabase：REST + Auth，直接用 fetch，不引入 SDK                     */
/* ------------------------------------------------------------------ */

let session = readLS(LS.session, null);

function sessionValid(s) {
  return s && s.access_token && s.expires_at && s.expires_at > Date.now();
}

async function refreshSession() {
  if (!session?.refresh_token) return null;
  const res = await fetch(`${backend.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: backend.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token })
  });
  if (!res.ok) {
    session = null;
    writeLS(LS.session, null);
    return null;
  }
  const data = await res.json();
  session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000 - 60_000,
    user: data.user
  };
  writeLS(LS.session, session);
  return session;
}

async function authHeaders() {
  let s = session;
  if (s && !sessionValid(s)) s = await refreshSession();
  return {
    apikey: backend.anonKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${s?.access_token || backend.anonKey}`
  };
}

async function rest(path, { method = 'GET', body, prefer } = {}) {
  const headers = await authHeaders();
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${backend.url}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data?.message || data?.error_description || data?.hint || `请求失败（${res.status}）`;
    throw new Error(message);
  }
  return data;
}

const supabaseApi = {
  async listVideos() {
    return rest('/rest/v1/videos?select=*&order=sort_order.asc,created_at.desc');
  },
  async saveVideo(input) {
    if (input.id) {
      const rows = await rest(`/rest/v1/videos?id=eq.${encodeURIComponent(input.id)}`, {
        method: 'PATCH',
        body: input,
        prefer: 'return=representation'
      });
      return rows?.[0];
    }
    const rows = await rest('/rest/v1/videos', {
      method: 'POST',
      body: { ...input, created_at: nowISO() },
      prefer: 'return=representation'
    });
    return rows?.[0];
  },
  async deleteVideo(id) {
    await rest(`/rest/v1/videos?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async listComments(videoId) {
    return rest(
      `/rest/v1/comments?video_id=eq.${encodeURIComponent(videoId)}&select=*&order=created_at.asc&limit=200`
    );
  },
  async addComment(input) {
    const rows = await rest('/rest/v1/comments', {
      method: 'POST',
      body: { ...input, created_at: nowISO() },
      prefer: 'return=representation'
    });
    return rows?.[0];
  },
  async deleteComment(id) {
    await rest(`/rest/v1/comments?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async listLikes() {
    const rows = await rest('/rest/v1/video_likes?select=video_id,visitor_id');
    const me = visitorId();
    const map = {};
    (rows || []).forEach((row) => {
      const entry = map[row.video_id] || { count: 0, liked: false };
      entry.count += 1;
      if (row.visitor_id === me) entry.liked = true;
      map[row.video_id] = entry;
    });
    return map;
  },
  async toggleLike(videoId) {
    const me = visitorId();
    const mine = await rest(
      `/rest/v1/video_likes?video_id=eq.${encodeURIComponent(videoId)}&visitor_id=eq.${encodeURIComponent(me)}&select=id`
    );
    const wasLiked = Array.isArray(mine) && mine.length > 0;
    if (wasLiked) {
      await rest(
        `/rest/v1/video_likes?video_id=eq.${encodeURIComponent(videoId)}&visitor_id=eq.${encodeURIComponent(me)}`,
        { method: 'DELETE' }
      );
    } else {
      await rest('/rest/v1/video_likes', {
        method: 'POST',
        body: { video_id: videoId, visitor_id: me, created_at: nowISO() },
        prefer: 'return=minimal'
      });
    }
    const rows = await rest(
      `/rest/v1/video_likes?video_id=eq.${encodeURIComponent(videoId)}&select=visitor_id`
    );
    return { videoId, count: Array.isArray(rows) ? rows.length : 0, liked: !wasLiked };
  },

  /* ---------------- 近期我说的（博客） ---------------- */

  async listPosts() {
    return rest('/rest/v1/posts?select=*&order=created_at.desc');
  },
  async savePost(input) {
    if (input.id) {
      const rows = await rest(`/rest/v1/posts?id=eq.${encodeURIComponent(input.id)}`, {
        method: 'PATCH',
        body: { ...input, updated_at: nowISO() },
        prefer: 'return=representation'
      });
      return rows?.[0];
    }
    const rows = await rest('/rest/v1/posts', {
      method: 'POST',
      body: { ...input, created_at: nowISO(), updated_at: nowISO() },
      prefer: 'return=representation'
    });
    return rows?.[0];
  },
  async deletePost(id) {
    await rest(`/rest/v1/posts?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async listPostLikes() {
    const rows = await rest('/rest/v1/post_likes?select=post_id,visitor_id');
    const me = visitorId();
    const map = {};
    (rows || []).forEach((row) => {
      const entry = map[row.post_id] || { count: 0, liked: false };
      entry.count += 1;
      if (row.visitor_id === me) entry.liked = true;
      map[row.post_id] = entry;
    });
    return map;
  },
  async togglePostLike(postId) {
    const me = visitorId();
    const mine = await rest(
      `/rest/v1/post_likes?post_id=eq.${encodeURIComponent(postId)}&visitor_id=eq.${encodeURIComponent(me)}&select=id`
    );
    const wasLiked = Array.isArray(mine) && mine.length > 0;
    if (wasLiked) {
      await rest(
        `/rest/v1/post_likes?post_id=eq.${encodeURIComponent(postId)}&visitor_id=eq.${encodeURIComponent(me)}`,
        { method: 'DELETE' }
      );
    } else {
      await rest('/rest/v1/post_likes', {
        method: 'POST',
        body: { post_id: postId, visitor_id: me, created_at: nowISO() },
        prefer: 'return=minimal'
      });
    }
    const rows = await rest(
      `/rest/v1/post_likes?post_id=eq.${encodeURIComponent(postId)}&select=visitor_id`
    );
    return { postId, count: Array.isArray(rows) ? rows.length : 0, liked: !wasLiked };
  },
  async listPostComments(postId) {
    return rest(
      `/rest/v1/post_comments?post_id=eq.${encodeURIComponent(postId)}&select=*&order=created_at.asc&limit=200`
    );
  },
  async listPostCommentCounts() {
    const rows = await rest('/rest/v1/post_comments?select=post_id');
    const map = {};
    (rows || []).forEach((row) => {
      map[row.post_id] = (map[row.post_id] || 0) + 1;
    });
    return map;
  },
  async addPostComment(input) {
    const rows = await rest('/rest/v1/post_comments', {
      method: 'POST',
      body: { ...input, created_at: nowISO() },
      prefer: 'return=representation'
    });
    return rows?.[0];
  },
  async deletePostComment(id) {
    await rest(`/rest/v1/post_comments?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
};

const api = backend.enabled ? supabaseApi : demoApi;

/* ------------------------------------------------------------------ */
/* 对外接口                                                            */
/* ------------------------------------------------------------------ */

export const listVideos = () => api.listVideos();
export const saveVideo = (input) => api.saveVideo(input);
export const deleteVideo = (id) => api.deleteVideo(id);
export const listComments = (videoId) => api.listComments(videoId);
export const addComment = (input) => api.addComment(input);
export const deleteComment = (id) => api.deleteComment(id);
export const listLikes = () => api.listLikes();
export const toggleLike = (videoId) => api.toggleLike(videoId);

/* 近期我说的（博客） */
export const listPosts = () => api.listPosts();
export const savePost = (input) => api.savePost(input);
export const deletePost = (id) => api.deletePost(id);
export const listPostLikes = () => api.listPostLikes();
export const togglePostLike = (postId) => api.togglePostLike(postId);
export const listPostComments = (postId) => api.listPostComments(postId);
export const listPostCommentCounts = () => api.listPostCommentCounts();
export const addPostComment = (input) => api.addPostComment(input);
export const deletePostComment = (id) => api.deletePostComment(id);

export function getSession() {
  return session;
}

export function isOwner() {
  if (isDemo()) return Boolean(session?.demo);
  if (!session?.user) return false;
  if (!backend.ownerEmail) return true;
  return (session.user.email || '').toLowerCase() === backend.ownerEmail;
}

export function ownerEmail() {
  return backend.ownerEmail;
}

export async function signIn(email, password) {
  if (isDemo()) {
    session = { demo: true, user: { email }, access_token: 'demo', expires_at: Date.now() + 86400000 };
    writeLS(LS.session, session);
    return session;
  }
  const res = await fetch(`${backend.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: backend.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description || data?.msg || '邮箱或密码不正确');
  }
  session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000 - 60_000,
    user: data.user
  };
  writeLS(LS.session, session);
  return session;
}

export async function signOut() {
  if (backend.enabled) {
    try {
      await fetch(`${backend.url}/auth/v1/logout`, {
        method: 'POST',
        headers: await authHeaders()
      });
    } catch {
      /* 忽略退出请求失败 */
    }
  }
  session = null;
  writeLS(LS.session, null);
}

export function getSavedNickname() {
  try {
    return localStorage.getItem(LS.nickname) || '';
  } catch {
    return '';
  }
}

export function saveNickname(name) {
  try {
    localStorage.setItem(LS.nickname, name);
  } catch {
    /* 忽略 */
  }
}
