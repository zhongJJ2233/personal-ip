import { backend } from './config.js';

const LS = {
  videos: 'li_video_videos_v1',
  comments: 'li_video_comments_v1',
  session: 'li_video_session_v1',
  nickname: 'li_video_nickname',
  likes: 'li_video_likes_v1',
  liked: 'li_video_liked_v1',
  visitor: 'li_video_visitor_v1'
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
