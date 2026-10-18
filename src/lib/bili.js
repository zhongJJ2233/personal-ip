// 用 B 站公开接口取视频封面/标题。
// 为什么走 JSONP：api.bilibili.com 对带 Origin 的跨域请求返回 403，
// 普通 fetch 会被 CORS 拦掉；JSONP 用 <script> 加载，不受 CORS 限制。
// 图片本身走 i*.hdslb.com，必须用 referrerPolicy="no-referrer"，
// 带 Referer 会被 403。

const CACHE_KEY = 'li_video_bili_cache_v1';
const TTL = 7 * 24 * 60 * 60 * 1000;
const BVID_PATTERN = /^BV[0-9A-Za-z]{10}$/;

const normalizePic = (pic) => {
  if (!pic) return '';
  // 接口给的是 http，页面是 https，混用会被浏览器拦成「不安全内容」
  return pic.replace(/^http:\/\//i, 'https://');
};

const readCache = () => {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeCache = (cache) => {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* 隐私模式写不进去就算了，不影响显示 */
  }
};

export const getCachedBili = (bvid) => {
  if (!BVID_PATTERN.test(bvid)) return null;
  const entry = readCache()[bvid];
  if (!entry) return null;
  if (!entry.ts || Date.now() - entry.ts > TTL) return null;
  return { pic: entry.pic || '', title: entry.title || '', duration: entry.duration || 0 };
};

const saveCache = (bvid, info) => {
  const cache = readCache();
  cache[bvid] = { ...info, ts: Date.now() };
  // 缓存别无限长，只留最近 80 个
  const keys = Object.keys(cache);
  if (keys.length > 80) {
    keys
      .sort((a, b) => (cache[a].ts || 0) - (cache[b].ts || 0))
      .slice(0, keys.length - 80)
      .forEach((key) => delete cache[key]);
  }
  writeCache(cache);
};

let seq = 0;

export const fetchBiliInfo = (bvid, { timeout = 9000, force = false } = {}) => {
  const cached = !force && getCachedBili(bvid);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    if (!BVID_PATTERN.test(bvid)) {
      reject(new Error('BV 号格式不对'));
      return;
    }
    const cbName = `__biliCover_${Date.now()}_${seq++}`;
    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      settled = true;
      window.clearTimeout(timer);
      try {
        delete window[cbName];
      } catch {
        window[cbName] = undefined;
      }
      script.remove();
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      cleanup();
      reject(new Error('B 站接口超时'));
    }, timeout);

    window[cbName] = (payload) => {
      if (settled) return;
      cleanup();
      if (!payload || payload.code !== 0 || !payload.data) {
        reject(new Error(payload?.message || 'B 站返回异常'));
        return;
      }
      const info = {
        pic: normalizePic(payload.data.pic),
        title: payload.data.title || '',
        duration: payload.data.duration || 0
      };
      if (info.pic) saveCache(bvid, info);
      resolve(info);
    };

    script.onerror = () => {
      if (settled) return;
      cleanup();
      reject(new Error('B 站接口连不上'));
    };

    script.src = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(
      bvid
    )}&jsonp=jsonp&callback=${cbName}`;
    document.head.appendChild(script);
  });
};
