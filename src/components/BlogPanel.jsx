import React, { useCallback, useEffect, useRef, useState } from 'react';
import StrokeText from './StrokeText';
import {
  addPostComment,
  deletePost,
  deletePostComment,
  getSavedNickname,
  isDemo,
  isOwner,
  listPostCommentCounts,
  listPostComments,
  listPostLikes,
  listPosts,
  saveNickname,
  savePost,
  signIn,
  signOut,
  togglePostLike
} from '../lib/store';
import './BlogPanel.css';

const EMOJIS = [
  '😀', '😄', '😊', '🥹', '😍', '🤔', '😮', '😂',
  '🥳', '😴', '👀', '🙌', '👍', '👏', '🙏', '🔥',
  '✨', '💡', '🌿', '🌊', '☀️', '🌙', '🎧', '📚',
  '✍️', '🎬', '❤️', '💬', '🎉', '🍵'
];

const emptyDraft = () => ({ id: '', title: '', body: '' });

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

const plainText = (body) => (body || '').replace(/\s+/g, ' ').trim();

const excerptOf = (post) => {
  const text = plainText(post.body);
  return text.length > 110 ? `${text.slice(0, 110)}…` : text;
};

const paragraphsOf = (body) =>
  (body || '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

const readingTime = (body) => {
  const chars = plainText(body).length;
  return Math.max(1, Math.round(chars / 400));
};

const postUrl = (id) => `${window.location.origin}${window.location.pathname}#post/${id}`;

/* 点赞图标用内联 SVG，避免界面里出现 emoji 字符 */
function HeartIcon() {
  return (
    <svg className="blog-heart" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        d="M8 13.4 2.5 7.9a3.2 3.2 0 0 1 4.5-4.5L8 4.4l1-1a3.2 3.2 0 0 1 4.5 4.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* 复制链接：优先剪贴板 API，失败时退回老式 execCommand，保证 http / 无权限环境也能转发 */
async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* 继续走兜底 */
    }
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-9999px';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

export default function BlogPanel() {
  const demo = isDemo();

  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [owner, setOwner] = useState(false);

  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState('');

  const [active, setActive] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentForm, setCommentForm] = useState({ nickname: '', content: '' });
  const [commentError, setCommentError] = useState('');
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [notice, setNotice] = useState('');
  const commentRef = useRef(null);

  /* ------------------------------ 数据 ------------------------------ */

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, likeMap, countMap] = await Promise.all([
        listPosts(),
        listPostLikes(),
        listPostCommentCounts()
      ]);
      setPosts(Array.isArray(list) ? list : []);
      setLikes(likeMap || {});
      setCommentCounts(countMap || {});
    } catch (err) {
      setError(err.message || '帖子加载失败，稍后再试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setOwner(isOwner());
    setCommentForm((form) => ({ ...form, nickname: getSavedNickname() }));
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 2800);
    return () => clearTimeout(timer);
  }, [notice]);

  const closePost = useCallback(() => {
    setActive(null);
    setComments([]);
    setPickerOpen(false);
    setCommentError('');
    if (window.location.hash.startsWith('#post/')) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  const openPost = useCallback(async (post, { syncHash = true } = {}) => {
    setActive(post);
    setCommentForm((form) => ({ ...form, content: '' }));
    setCommentError('');
    setPickerOpen(false);
    setComments([]);
    setCommentsLoading(true);
    if (syncHash) window.history.replaceState(null, '', `#post/${post.id}`);
    try {
      const list = await listPostComments(post.id);
      setComments(Array.isArray(list) ? list : []);
    } catch (err) {
      setCommentError(err.message || '评论加载失败');
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  /* 支持分享出去的 #post/<id> 直接打开对应帖子 */
  useEffect(() => {
    if (!posts.length) return undefined;
    const openFromHash = () => {
      const matched = window.location.hash.match(/^#post\/(.+)$/);
      if (!matched) return;
      const found = posts.find((post) => post.id === decodeURIComponent(matched[1]));
      if (found) openPost(found, { syncHash: false });
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, [posts, openPost]);

  /* 弹层打开时锁滚动 + Esc 关闭 */
  useEffect(() => {
    const locked = Boolean(active || draft || showLogin);
    document.body.style.overflow = locked ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [active, draft, showLogin]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (pickerOpen) {
        setPickerOpen(false);
      } else if (draft) {
        setDraft(null);
      } else if (showLogin) {
        setShowLogin(false);
      } else if (active) {
        closePost();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, draft, showLogin, pickerOpen, closePost]);

  /* ------------------------------ 交互 ------------------------------ */

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');
    try {
      await signIn(loginForm.email.trim(), loginForm.password);
      setOwner(isOwner());
      setShowLogin(false);
      setLoginForm({ email: '', password: '' });
      setNotice('站主已登录');
    } catch (err) {
      setLoginError(err.message || '登录失败');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setOwner(false);
    setDraft(null);
    setNotice('已退出站主模式');
  };

  const openDraft = (post) => {
    setDraftError('');
    setDraft(post ? { id: post.id, title: post.title, body: post.body } : emptyDraft());
  };

  const handleSavePost = async (event) => {
    event.preventDefault();
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title) {
      setDraftError('给这篇起个名字吧');
      return;
    }
    if (!body) {
      setDraftError('正文还是空的');
      return;
    }
    setSaving(true);
    setDraftError('');
    try {
      const saved = await savePost({ id: draft.id || undefined, title, body });
      setPosts((list) => {
        const rest = list.filter((post) => post.id !== saved.id);
        return [saved, ...rest].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      });
      setDraft(null);
      setNotice(draft.id ? '已更新' : '已发布');
      if (active && active.id === saved.id) setActive(saved);
    } catch (err) {
      setDraftError(err.message || '保存失败，稍后再试');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (post) => {
    if (deleteTarget !== post.id) {
      setDeleteTarget(post.id);
      setTimeout(() => setDeleteTarget((current) => (current === post.id ? '' : current)), 3200);
      return;
    }
    setDeleteTarget('');
    try {
      await deletePost(post.id);
      setPosts((list) => list.filter((item) => item.id !== post.id));
      if (active && active.id === post.id) closePost();
      setNotice('帖子已删除');
    } catch (err) {
      setNotice(err.message || '删除失败，稍后再试');
    }
  };

  const handleLike = async (postId) => {
    try {
      const result = await togglePostLike(postId);
      setLikes((map) => ({ ...map, [postId]: { count: result.count, liked: result.liked } }));
    } catch (err) {
      setNotice(err.message || '点赞失败，稍后再试');
    }
  };

  const handleShare = async (post) => {
    const url = postUrl(post.id);
    const payload = { title: post.title, text: excerptOf(post), url };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    try {
      const copied = await copyToClipboard(url);
      setNotice(copied ? '链接已复制，可以粘贴转发了' : '复制失败，请手动复制地址栏链接');
    } catch {
      setNotice('复制失败，请手动复制地址栏链接');
    }
  };

  const handleComment = async (event) => {
    event.preventDefault();
    const content = commentForm.content.trim();
    if (!content) {
      setCommentError('写点什么再发吧');
      return;
    }
    if (!active) return;
    setSending(true);
    setCommentError('');
    try {
      const nickname = (commentForm.nickname.trim() || '匿名访客').slice(0, 20);
      const created = await addPostComment({
        post_id: active.id,
        nickname,
        content: content.slice(0, 200)
      });
      setComments((list) => [...list, created]);
      setCommentForm((form) => ({ ...form, content: '' }));
      saveNickname(commentForm.nickname.trim());
      setCommentCounts((map) => ({ ...map, [active.id]: (map[active.id] || 0) + 1 }));
      setPickerOpen(false);
      setNotice('评论已发布');
    } catch (err) {
      setCommentError(err.message || '发送失败，稍后再试');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (comment) => {
    try {
      await deletePostComment(comment.id);
      setComments((list) => list.filter((item) => item.id !== comment.id));
      if (active) setCommentCounts((map) => ({ ...map, [active.id]: Math.max(0, (map[active.id] || 1) - 1) }));
      setNotice('评论已删除');
    } catch (err) {
      setNotice(err.message || '删除失败，稍后再试');
    }
  };

  const insertEmoji = (emoji) => {
    const element = commentRef.current;
    const start = element && typeof element.selectionStart === 'number' ? element.selectionStart : commentForm.content.length;
    const end = element && typeof element.selectionEnd === 'number' ? element.selectionEnd : start;
    const next = `${commentForm.content.slice(0, start)}${emoji}${commentForm.content.slice(end)}`.slice(0, 200);
    setCommentForm((form) => ({ ...form, content: next }));
    const caret = Math.min(start + emoji.length, 200);
    requestAnimationFrame(() => {
      if (!element) return;
      element.focus();
      element.setSelectionRange(caret, caret);
    });
  };

  /* ------------------------------ 渲染 ------------------------------ */

  return (
    <section className="blog-section" id="blog" aria-labelledby="blog-title">
      <div className="blog-head">
        <div className="blog-head-main">
          <div className="section-kicker">NOTES / 03</div>
          <h2 id="blog-title" aria-label="近期我说的">
            <StrokeText
              text="近期我说的"
              strokeColor="#0e2a33"
              fillColor="#0e2a33"
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
        <div className="blog-head-side">
          <p className="blog-note">不定期更新。不追热点，只写还带着温度的具体时刻；看的人可以点赞、转发、留言。</p>
          {owner ? (
            <div className="blog-owner-bar">
              <span className="blog-owner-flag">站主模式</span>
              <button type="button" className="blog-primary" onClick={() => openDraft(null)}>
                写新帖
              </button>
              <button type="button" className="blog-ghost" onClick={handleSignOut}>
                退出
              </button>
            </div>
          ) : (
            <button type="button" className="blog-owner-entry" onClick={() => setShowLogin(true)}>
              站主入口
            </button>
          )}
        </div>
      </div>

      {error && <p className="blog-error">{error}</p>}
      {loading && <p className="blog-loading">正在取回文字…</p>}

      {!loading && !error && posts.length === 0 && (
        <div className="blog-empty">
          <p>还没有帖子。第一篇，等站主来写。</p>
        </div>
      )}

      <div className="blog-list">
        {posts.map((post) => {
          const like = likes[post.id] || { count: 0, liked: false };
          const commentCount = commentCounts[post.id] || 0;
          return (
            <article className="blog-card" key={post.id}>
              <button
                type="button"
                className="blog-card-hit"
                onClick={() => openPost(post)}
                aria-label={`阅读《${post.title}》`}
              />
              <div className="blog-card-date">
                <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
                <span>{readingTime(post.body)} 分钟</span>
              </div>
              <div className="blog-card-main">
                <h3 className="blog-card-title">{post.title}</h3>
                <p className="blog-card-excerpt">{excerptOf(post)}</p>
              </div>
              <div className="blog-card-side">
                <div className="blog-card-stats">
                  <span>{commentCount} 条评论</span>
                  <span>{like.count} 赞</span>
                </div>
                <div className="blog-card-actions">
                  <button
                    type="button"
                    className={`blog-action${like.liked ? ' is-liked' : ''}`}
                    onClick={() => handleLike(post.id)}
                    aria-pressed={like.liked}
                  >
                    <HeartIcon /> {like.count}
                  </button>
                  <button type="button" className="blog-action" onClick={() => handleShare(post)}>
                    转发
                  </button>
                  <button type="button" className="blog-action blog-action--read" onClick={() => openPost(post)}>
                    阅读
                  </button>
                </div>
                {owner && (
                  <div className="blog-card-admin">
                    <button type="button" onClick={() => openDraft(post)}>
                      编辑
                    </button>
                    <button
                      type="button"
                      className={deleteTarget === post.id ? 'is-confirm' : ''}
                      onClick={() => handleDeletePost(post)}
                    >
                      {deleteTarget === post.id ? '确认删除' : '删除'}
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* 阅读帖子 */}
      {active && (
        <div
          className="video-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePost();
          }}
        >
          <article className="blog-post" role="dialog" aria-modal="true" aria-labelledby="blog-post-title">
            <header className="blog-post-head">
              <div className="blog-post-head-main">
                <p className="blog-post-date">
                  {formatDateTime(active.created_at)} · {readingTime(active.body)} 分钟
                </p>
                <h3 id="blog-post-title">{active.title}</h3>
              </div>
              <div className="blog-post-head-actions">
                {owner && (
                  <button
                    type="button"
                    className="video-icon-button"
                    onClick={() => {
                      openDraft(active);
                      closePost();
                    }}
                  >
                    编辑
                  </button>
                )}
                <button type="button" className="video-icon-button" onClick={() => handleShare(active)}>
                  转发
                </button>
                <button type="button" className="video-close" onClick={closePost} aria-label="关闭">
                  ✕
                </button>
              </div>
            </header>

            <div className="blog-post-body">
              {paragraphsOf(active.body).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            <div className="blog-post-bar">
              <button
                type="button"
                className={`blog-like${(likes[active.id] || {}).liked ? ' is-liked' : ''}`}
                onClick={() => handleLike(active.id)}
                aria-pressed={Boolean((likes[active.id] || {}).liked)}
              >
                <HeartIcon /> 赞 {(likes[active.id] || {}).count || 0}
              </button>
              <button type="button" className="blog-like" onClick={() => handleShare(active)}>
                转发这篇
              </button>
              <span className="blog-post-comment-count">{comments.length} 条评论</span>
            </div>

            <div className="blog-post-comments">
              <form className="blog-comment-form" onSubmit={handleComment}>
                <div className="blog-comment-row">
                  <input
                    type="text"
                    value={commentForm.nickname}
                    onChange={(event) => setCommentForm((form) => ({ ...form, nickname: event.target.value }))}
                    placeholder="昵称（可留空）"
                    maxLength={20}
                    aria-label="昵称"
                  />
                  <button
                    type="button"
                    className={`blog-emoji-toggle${pickerOpen ? ' is-open' : ''}`}
                    onClick={() => setPickerOpen((open) => !open)}
                    aria-expanded={pickerOpen}
                    aria-label="选择表情"
                  >
                    😊 表情
                  </button>
                  <button type="submit" disabled={sending}>
                    {sending ? '发送中…' : '发送'}
                  </button>
                </div>
                {pickerOpen && (
                  <div className="blog-emoji-picker" role="group" aria-label="常用表情">
                    {EMOJIS.map((emoji) => (
                      <button type="button" key={emoji} onClick={() => insertEmoji(emoji)} aria-label={`插入 ${emoji}`}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  ref={commentRef}
                  value={commentForm.content}
                  onChange={(event) => setCommentForm((form) => ({ ...form, content: event.target.value }))}
                  placeholder="说点什么，可以带表情，最多 200 字"
                  maxLength={200}
                  rows={3}
                  aria-label="评论内容"
                />
                <p className="blog-comment-hint">{commentForm.content.length} / 200</p>
                {commentError && <p className="video-form-error">{commentError}</p>}
              </form>

              <ul className="blog-comments">
                {commentsLoading && <li className="blog-comments-empty">评论加载中…</li>}
                {!commentsLoading &&
                  comments.map((comment) => (
                    <li key={comment.id}>
                      <div className="blog-comment-meta">
                        <span className="blog-comment-name">{comment.nickname || '匿名访客'}</span>
                        <time dateTime={comment.created_at}>{formatDateTime(comment.created_at)}</time>
                        {owner && (
                          <button
                            type="button"
                            className="blog-comment-delete"
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
                  <li className="blog-comments-empty">还没有评论，来坐第一排。</li>
                )}
              </ul>
            </div>
          </article>
        </div>
      )}

      {/* 写 / 编辑帖子 */}
      {draft && (
        <div
          className="video-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDraft(null);
          }}
        >
          <form className="video-sheet blog-sheet" onSubmit={handleSavePost} role="dialog" aria-modal="true">
            <header className="video-sheet-head">
              <h3>{draft.id ? '编辑帖子' : '写新帖'}</h3>
              <button type="button" className="video-close" onClick={() => setDraft(null)} aria-label="关闭">
                ✕
              </button>
            </header>
            <label>
              <span>标题</span>
              <input
                value={draft.title}
                onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))}
                placeholder="给这篇起个名字"
                maxLength={60}
                autoFocus
              />
            </label>
            <label>
              <span>正文（空一行分段）</span>
              <textarea
                value={draft.body}
                onChange={(event) => setDraft((value) => ({ ...value, body: event.target.value }))}
                placeholder="写点什么…"
                rows={14}
                maxLength={5000}
              />
            </label>
            <p className="blog-sheet-hint">{draft.body.length} / 5000 字</p>
            {draftError && <p className="video-form-error">{draftError}</p>}
            <footer className="video-sheet-foot">
              <button type="button" className="video-ghost-button" onClick={() => setDraft(null)}>
                取消
              </button>
              <button type="submit" disabled={saving}>
                {saving ? '保存中…' : draft.id ? '保存修改' : '发布'}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* 站主登录 */}
      {showLogin && (
        <div
          className="video-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowLogin(false);
          }}
        >
          <form className="video-sheet" onSubmit={handleLogin} role="dialog" aria-modal="true">
            <header className="video-sheet-head">
              <h3>站主入口</h3>
              <button type="button" className="video-close" onClick={() => setShowLogin(false)} aria-label="关闭">
                ✕
              </button>
            </header>
            <p className="video-sheet-note">
              {demo
                ? '演示模式：任意账号密码都能进入后台，用于预览编辑界面。'
                : '只有站主账号登录后，才能发布、编辑和删除帖子。'}
            </p>
            <label>
              <span>邮箱</span>
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((form) => ({ ...form, email: event.target.value }))}
                placeholder="you@example.com"
                autoComplete="username"
              />
            </label>
            <label>
              <span>密码</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((form) => ({ ...form, password: event.target.value }))}
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
