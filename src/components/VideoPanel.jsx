import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DanmakuWall from './DanmakuWall';
import StrokeText from './StrokeText';
import {
  addComment,
  deleteComment,
  deleteVideo,
  getSavedNickname,
  getSession,
  isDemo,
  isOwner,
  listComments,
  listLikes,
  listVideos,
  ownerEmail,
  saveNickname,
  saveVideo,
  signIn,
  signOut,
  toggleLike
} from '../lib/store';
import { fetchBiliInfo, getCachedBili } from '../lib/bili';
import './VideoPanel.css';

const BVID_PATTERN = /^BV[0-9A-Za-z]{10}$/;

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const bilibiliUrl = (bvid) => `https://www.bilibili.com/video/${bvid}`;

const playerUrl = (video) =>
  `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(video.bvid)}&page=1&high_quality=1&danmaku=1&autoplay=1&as_wide=1`;

const emptyDraft = () => ({ bvid: '', title: '', description: '', cover_url: '', sort_order: '' });

export default function VideoPanel() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [owner, setOwner] = useState(false);

  const [activeId, setActiveId] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [draft, setDraft] = useState(null);
  const [draftError, setDraftError] = useState('');
  const [saving, setSaving] = useState(false);

  const [commentForm, setCommentForm] = useState({ nickname: getSavedNickname(), content: '' });
  const [asDanmaku, setAsDanmaku] = useState(true);
  const [commentError, setCommentError] = useState('');
  const [sending, setSending] = useState(false);

  const [danmakuOn, setDanmakuOn] = useState(true);
  const [notice, setNotice] = useState('');

  const [likes, setLikes] = useState({});
  const [likeBusy, setLikeBusy] = useState({});

  const [biliCovers, setBiliCovers] = useState({});
  const [brokenCovers, setBrokenCovers] = useState({});
  const [autoCoverBusy, setAutoCoverBusy] = useState(false);

  const demo = isDemo();
  const activeVideo = useMemo(() => videos.find((v) => v.id === activeId) || null, [videos, activeId]);

  const refreshAuth = useCallback(() => {
    setOwner(isOwner());
  }, []);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await listVideos();
      setVideos(rows || []);
    } catch (e) {
      setError(e.message || '影像列表加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
    loadVideos();
  }, [loadVideos, refreshAuth]);

  useEffect(() => {
    let alive = true;
    listLikes()
      .then((map) => {
        if (alive) setLikes(map || {});
      })
      .catch(() => {
        /* 点赞数加载失败不阻塞页面，按钮仍可点击 */
      });
    return () => {
      alive = false;
    };
  }, [videos]);

  // 没有自定义封面的影像，用 B 站公开接口自动补一张（结果缓存 7 天）
  useEffect(() => {
    let alive = true;
    const need = [];
    const cachedMap = {};
    videos.forEach((video) => {
      if (video.cover_url || !BVID_PATTERN.test(video.bvid)) return;
      const cached = getCachedBili(video.bvid);
      if (cached?.pic) cachedMap[video.bvid] = cached.pic;
      else if (!need.includes(video.bvid)) need.push(video.bvid);
    });
    if (Object.keys(cachedMap).length) {
      setBiliCovers((prev) => ({ ...prev, ...cachedMap }));
    }
    need.forEach((bvid) => {
      fetchBiliInfo(bvid)
        .then((info) => {
          if (alive && info.pic) setBiliCovers((prev) => ({ ...prev, [bvid]: info.pic }));
        })
        .catch(() => {
          /* 取不到就保持编号占位图 */
        });
    });
    return () => {
      alive = false;
    };
  }, [videos]);

  useEffect(() => {
    if (!activeId) {
      setComments([]);
      return undefined;
    }
    let alive = true;
    setCommentsLoading(true);
    setCommentError('');
    listComments(activeId)
      .then((rows) => {
        if (alive) setComments(rows || []);
      })
      .catch((e) => {
        if (alive) setCommentError(e.message || '评论加载失败');
      })
      .finally(() => {
        if (alive) setCommentsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeId]);

  const closeAll = useCallback(() => {
    setActiveId(null);
    setDraft(null);
    setShowLogin(false);
    setLoginError('');
    setDraftError('');
  }, []);

  useEffect(() => {
    const anyOpen = Boolean(activeId || draft || showLogin);
    if (!anyOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeAll();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [activeId, draft, showLogin, closeAll]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  /* ---------------------------- 站主操作 ---------------------------- */

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signIn(loginForm.email.trim(), loginForm.password);
      if (!isOwner()) {
        await signOut();
        throw new Error('这个账号不是站主账号');
      }
      setShowLogin(false);
      setLoginForm({ email: '', password: '' });
      refreshAuth();
      setNotice('站主已登录');
    } catch (err) {
      setLoginError(err.message || '登录失败');
    }
  };

  const handleLogout = async () => {
    await signOut();
    refreshAuth();
    setNotice('已退出后台');
  };

  const openEditor = (video) => {
    setDraftError('');
    setDraft(
      video
        ? {
            id: video.id,
            bvid: video.bvid || '',
            title: video.title || '',
            description: video.description || '',
            cover_url: video.cover_url || '',
            sort_order: video.sort_order ?? ''
          }
        : emptyDraft()
    );
  };

  const handleAutoCover = async () => {
    const bvid = (draft?.bvid || '').trim();
    if (!BVID_PATTERN.test(bvid)) {
      setDraftError('先填一个正确的 BV 号，再点自动获取');
      return;
    }
    setAutoCoverBusy(true);
    setDraftError('');
    try {
      const info = await fetchBiliInfo(bvid, { force: true });
      if (!info.pic) throw new Error('这支视频没有可用的封面');
      setDraft((d) => (d ? { ...d, cover_url: info.pic, title: d.title || info.title } : d));
      setBiliCovers((prev) => ({ ...prev, [bvid]: info.pic }));
      setNotice('已填入 B 站封面');
    } catch (err) {
      setDraftError(err.message || '封面获取失败，也可以直接粘贴图片地址');
    } finally {
      setAutoCoverBusy(false);
    }
  };

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    const bvid = draft.bvid.trim();
    if (!BVID_PATTERN.test(bvid)) {
      setDraftError('BV 号格式不对，例如 BV1GJ411x7h7（共 12 位，BV 开头）');
      return;
    }
    const title = draft.title.trim() || '未命名影像';
    setSaving(true);
    setDraftError('');
    try {
      await saveVideo({
        ...(draft.id ? { id: draft.id } : {}),
        bvid,
        title,
        description: draft.description.trim(),
        cover_url: draft.cover_url.trim(),
        sort_order: draft.sort_order === '' ? 0 : Number(draft.sort_order)
      });
      setDraft(null);
      await loadVideos();
      setNotice(draft.id ? '影像已更新' : '影像已添加');
    } catch (err) {
      setDraftError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVideo = async (video) => {
    if (!window.confirm(`确定删除「${video.title}」？它下面的评论也会一起删除。`)) return;
    try {
      await deleteVideo(video.id);
      if (activeId === video.id) setActiveId(null);
      await loadVideos();
      setNotice('影像已删除');
    } catch (err) {
      setNotice(err.message || '删除失败');
    }
  };

  const handleDeleteComment = async (comment) => {
    if (!window.confirm('删除这条评论？')) return;
    try {
      await deleteComment(comment.id);
      setComments((list) => list.filter((c) => c.id !== comment.id));
    } catch (err) {
      setCommentError(err.message || '删除失败');
    }
  };

  /* ---------------------------- 观众操作 ---------------------------- */

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    const content = commentForm.content.trim();
    if (!content) {
      setCommentError('先写点什么吧');
      return;
    }
    if (!activeVideo) return;
    setSending(true);
    setCommentError('');
    const nickname = (commentForm.nickname.trim() || '匿名访客').slice(0, 30);
    try {
      const created = await addComment({
        video_id: activeVideo.id,
        nickname,
        content: content.slice(0, 200),
        is_danmaku: asDanmaku
      });
      saveNickname(nickname);
      setComments((list) => [...list, created]);
      setCommentForm((form) => ({ ...form, content: '' }));
      setNotice(asDanmaku ? '弹幕已发出' : '评论已发布');
    } catch (err) {
      setCommentError(err.message || '发布失败，请稍后再试');
    } finally {
      setSending(false);
    }
  };

  /* ------------------------------ 点赞 ------------------------------ */

  const handleToggleLike = async (video) => {
    if (likeBusy[video.id]) return;
    const prev = likes[video.id] || { count: 0, liked: false };
    const optimistic = {
      count: Math.max(0, prev.count + (prev.liked ? -1 : 1)),
      liked: !prev.liked
    };
    setLikes((map) => ({ ...map, [video.id]: optimistic }));
    setLikeBusy((map) => ({ ...map, [video.id]: true }));
    try {
      const next = await toggleLike(video.id);
      setLikes((map) => ({ ...map, [video.id]: { count: next.count, liked: next.liked } }));
    } catch (err) {
      setLikes((map) => ({ ...map, [video.id]: prev }));
      setNotice(err.message || '点赞失败，稍后再试');
    } finally {
      setLikeBusy((map) => {
        const next = { ...map };
        delete next[video.id];
        return next;
      });
    }
  };

  /* ------------------------------ 渲染 ------------------------------ */

  return (
    <section className="video-section" id="video" aria-labelledby="video-title">
      <div className="video-head">
        <div className="video-head-main">
          <div className="section-kicker">VIDEO ARCHIVE / 03</div>
          <h2 id="video-title" aria-label="影像档案">
            <StrokeText
              text="影像档案"
              strokeColor="#f2f1e9"
              fillColor="#f2f1e9"
              fontSize={96}
              fontWeight={700}
              letterSpacing={-6}
              strokeWidth={1.4}
              drawDuration={1.1}
              fillDelay={0.1}
              stagger={0.05}
              fillMode="wipe"
              trigger="scroll"
            />
          </h2>
        </div>
        <div className="video-head-side">
          <p className="video-note">
            视频放在 B 站，画面里的弹幕由 B 站播放器原生提供；
            这里再留一层站内弹幕和评论，随看随发。
          </p>
          {owner ? (
            <div className="video-owner-bar">
              <span className="video-owner-flag">站主已登录</span>
              <button type="button" className="video-ghost-button" onClick={() => openEditor(null)}>
                新增影像
              </button>
              <button type="button" className="video-ghost-button" onClick={handleLogout}>
                退出后台
              </button>
            </div>
          ) : (
            <button type="button" className="video-owner-entry" onClick={() => setShowLogin(true)}>
              站主入口
            </button>
          )}
        </div>
      </div>

      {demo && (
        <p className="video-demo-banner">
          演示模式：影像与评论保存在本机浏览器。连接数据库后，只有站主能编辑，其他人只看和评论。
        </p>
      )}
      {error && <p className="video-error">{error}</p>}

      {loading ? (
        <div className="video-loading">影像加载中…</div>
      ) : videos.length === 0 ? (
        <div className="video-empty">
          <p>影像还在路上。</p>
          {owner && (
            <button type="button" className="video-ghost-button" onClick={() => openEditor(null)}>
              添加第一条影像
            </button>
          )}
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((video, index) => {
            const like = likes[video.id] || { count: 0, liked: false };
            const coverSrc = video.cover_url || biliCovers[video.bvid] || '';
            const coverBroken = Boolean(brokenCovers[video.bvid]);
            return (
              <article className="video-card" key={video.id}>
                <button
                  type="button"
                  className="video-card-media"
                  onClick={() => setActiveId(video.id)}
                  aria-label={`打开 ${video.title}`}
                >
                  {coverSrc && !coverBroken ? (
                    <img
                      src={coverSrc}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setBrokenCovers((prev) => ({ ...prev, [video.bvid]: true }))
                      }
                    />
                  ) : (
                    <span className="video-card-placeholder" aria-hidden="true">
                      <span className="video-card-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="video-card-bvid">{video.bvid}</span>
                    </span>
                  )}
                  <span className="video-card-play" aria-hidden="true">
                    ▶
                  </span>
                </button>
                <div className="video-card-meta">
                  <div className="video-card-copy">
                    <h3>{video.title}</h3>
                    {video.description && <p>{video.description}</p>}
                  </div>
                  <div className="video-card-side">
                    <button
                      type="button"
                      className={`video-like${like.liked ? ' is-liked' : ''}`}
                      onClick={() => handleToggleLike(video)}
                      aria-pressed={like.liked}
                      aria-label={like.liked ? '取消点赞' : `点赞，当前 ${like.count} 个赞`}
                      title={like.liked ? '取消点赞' : '点赞'}
                      disabled={Boolean(likeBusy[video.id])}
                    >
                      <span className="video-like-heart" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="11" height="11" focusable="false">
                          <path
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                      <span className="video-like-count">{like.count}</span>
                    </button>
                    <span className="video-card-date">{formatDate(video.created_at)}</span>
                  </div>
                </div>
                {owner && (
                  <div className="video-card-admin">
                    <button type="button" onClick={() => openEditor(video)}>
                      编辑
                    </button>
                    <button type="button" onClick={() => handleDeleteVideo(video)}>
                      删除
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* 播放 + 评论弹层 */}
      {activeVideo && (
        <div
          className="video-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAll();
          }}
        >
          <div className="video-modal" role="dialog" aria-modal="true" aria-label={activeVideo.title}>
            <header className="video-modal-head">
              <div className="video-modal-title">
                <p>{activeVideo.bvid}</p>
                <h3>{activeVideo.title}</h3>
              </div>
              <div className="video-modal-actions">
                <button
                  type="button"
                  className={`video-icon-button video-like-inline${
                    likes[activeVideo.id]?.liked ? ' is-liked' : ''
                  }`}
                  onClick={() => handleToggleLike(activeVideo)}
                  aria-pressed={Boolean(likes[activeVideo.id]?.liked)}
                  aria-label={likes[activeVideo.id]?.liked ? '取消点赞' : '点赞'}
                  disabled={Boolean(likeBusy[activeVideo.id])}
                >
                  <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true" focusable="false">
                    <path
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      fill="currentColor"
                    />
                  </svg>
                  {likes[activeVideo.id]?.count ?? 0}
                </button>
                <button
                  type="button"
                  className="video-icon-button"
                  onClick={() => setDanmakuOn((on) => !on)}
                  aria-pressed={danmakuOn}
                >
                  {danmakuOn ? '弹幕 ON' : '弹幕 OFF'}
                </button>
                <a
                  className="video-icon-button"
                  href={bilibiliUrl(activeVideo.bvid)}
                  target="_blank"
                  rel="noreferrer"
                >
                  去 B 站 ↗
                </a>
                <button type="button" className="video-icon-button video-close" onClick={closeAll} aria-label="关闭">
                  ✕
                </button>
              </div>
            </header>

            <div className="video-modal-grid">
              <div className="video-modal-stage">
                <div className="video-player">
                  <iframe
                    src={playerUrl(activeVideo)}
                    title={activeVideo.title}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>

                <DanmakuWall messages={comments} enabled={danmakuOn} onSendHint={() => setDanmakuOn(true)} />
              </div>

              <div className="video-modal-side">
                {activeVideo.description && <p className="video-modal-desc">{activeVideo.description}</p>}

                <form className="video-comment-form" onSubmit={handleSubmitComment}>
                  <div className="video-comment-row">
                    <input
                      value={commentForm.nickname}
                      onChange={(e) => setCommentForm((f) => ({ ...f, nickname: e.target.value }))}
                      placeholder="昵称（可留空）"
                      maxLength={30}
                      aria-label="昵称"
                    />
                    <label className="video-danmaku-check">
                      <input
                        type="checkbox"
                        checked={asDanmaku}
                        onChange={(e) => setAsDanmaku(e.target.checked)}
                      />
                      作为弹幕飘过
                    </label>
                    <button type="submit" disabled={sending}>
                      {sending ? '发送中…' : '发送'}
                    </button>
                  </div>
                  <textarea
                    value={commentForm.content}
                    onChange={(e) => setCommentForm((f) => ({ ...f, content: e.target.value }))}
                    placeholder="说点什么，最多 200 字"
                    maxLength={200}
                    rows={3}
                    aria-label="评论内容"
                  />
                  {commentError && <p className="video-form-error">{commentError}</p>}
                </form>

                <div className="video-comment-head">
                  <span>评论 {comments.length}</span>
                  {commentsLoading && <span>加载中…</span>}
                </div>

                <ul className="video-comments">
                  {comments.map((comment) => (
                    <li key={comment.id} className={comment.is_danmaku ? 'is-danmaku' : ''}>
                      <div className="video-comment-meta">
                        <span className="video-comment-name">{comment.nickname || '匿名访客'}</span>
                        <time>{formatDateTime(comment.created_at)}</time>
                        {comment.is_danmaku && <span className="video-comment-tag">弹幕</span>}
                        {owner && (
                          <button
                            type="button"
                            className="video-comment-delete"
                            onClick={() => handleDeleteComment(comment)}
                          >
                            删除
                          </button>
                        )}
                      </div>
                      <p>{comment.content}</p>
                    </li>
                  ))}
                  {!commentsLoading && comments.length === 0 && (
                    <li className="video-comments-empty">还没有评论，来坐第一排。</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新增 / 编辑影像 */}
      {draft && (
        <div
          className="video-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDraft(null);
          }}
        >
          <form className="video-sheet" onSubmit={handleSaveVideo} role="dialog" aria-modal="true">
            <header className="video-sheet-head">
              <h3>{draft.id ? '编辑影像' : '新增影像'}</h3>
              <button type="button" className="video-close" onClick={() => setDraft(null)} aria-label="关闭">
                ✕
              </button>
            </header>
            <label>
              <span>B 站视频号（BV 号）</span>
              <input
                value={draft.bvid}
                onChange={(e) => setDraft((d) => ({ ...d, bvid: e.target.value }))}
                placeholder="BV1GJ411x7h7"
                autoFocus
              />
            </label>
            <label>
              <span>标题</span>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="影像 01 / 夜行"
                maxLength={60}
              />
            </label>
            <label>
              <span>一句话介绍</span>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                rows={2}
                maxLength={160}
                placeholder="可选"
              />
            </label>
            <label>
              <span className="video-field-head">
                封面图链接
                <button
                  type="button"
                  className="video-inline-link"
                  onClick={handleAutoCover}
                  disabled={autoCoverBusy}
                >
                  {autoCoverBusy ? '获取中…' : '从 B 站自动获取'}
                </button>
              </span>
              <input
                value={draft.cover_url}
                onChange={(e) => setDraft((d) => ({ ...d, cover_url: e.target.value }))}
                placeholder="可选，留空就自动用 B 站封面"
              />
            </label>
            <label>
              <span>排序（数字越小越靠前）</span>
              <input
                type="number"
                value={draft.sort_order}
                onChange={(e) => setDraft((d) => ({ ...d, sort_order: e.target.value }))}
                placeholder="0"
              />
            </label>
            {draftError && <p className="video-form-error">{draftError}</p>}
            <footer className="video-sheet-foot">
              <button type="button" className="video-ghost-button" onClick={() => setDraft(null)}>
                取消
              </button>
              <button type="submit" disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* 站主登录 */}
      {showLogin && (
        <div
          className="video-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowLogin(false);
          }}
        >
          <form className="video-sheet video-sheet--login" onSubmit={handleLogin} role="dialog" aria-modal="true">
            <header className="video-sheet-head">
              <h3>站主入口</h3>
              <button
                type="button"
                className="video-close"
                onClick={() => setShowLogin(false)}
                aria-label="关闭"
              >
                ✕
              </button>
            </header>
            <p className="video-sheet-note">
              {demo
                ? '演示模式：任意账号密码都能进入后台，用于预览编辑界面。'
                : `只有站主账号（${ownerEmail() || '已配置账号'}）可以登录后台。`}
            </p>
            <label>
              <span>邮箱</span>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                autoComplete="username"
              />
            </label>
            <label>
              <span>密码</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
              />
            </label>
            {loginError && <p className="video-form-error">{loginError}</p>}
            <footer className="video-sheet-foot">
              <button type="button" className="video-ghost-button" onClick={() => setShowLogin(false)}>
                取消
              </button>
              <button type="submit">登录</button>
            </footer>
          </form>
        </div>
      )}

      {notice && <div className="video-notice">{notice}</div>}
    </section>
  );
}
