import React, { useMemo } from 'react';

/**
 * 站内弹幕墙：与 B 站播放器原生弹幕并存。
 * B 站视频画面里的弹幕由 B 站播放器自己渲染（按秒同步）；
 * 这里的弹幕墙展示的是站内观众发的「弹幕式评论」，实时飘过。
 */
export default function DanmakuWall({ messages = [], enabled = true, onSendHint }) {
  const items = useMemo(() => {
    return messages
      .filter((m) => m.is_danmaku && (m.content || '').trim())
      .slice(-14)
      .map((m, index) => ({
        id: m.id,
        text: m.content,
        top: 8 + (index % 3) * 30 + (index % 2) * 6,
        duration: 11 + (index % 5) * 1.7,
        delay: -(index * 2.1)
      }));
  }, [messages]);

  if (!enabled) {
    return (
      <div className="danmaku-strip danmaku-strip--off">
        <span>弹幕已关闭</span>
        <button type="button" className="danmaku-toggle" onClick={onSendHint}>
          打开弹幕
        </button>
      </div>
    );
  }

  return (
    <div className="danmaku-strip" aria-label="站内弹幕墙">
      {items.length === 0 ? (
        <span className="danmaku-empty">还没有弹幕 · 在下面发一条，它会从这里飘过去</span>
      ) : (
        items.map((item) => (
          <span
            key={item.id}
            className="danmaku-item"
            style={{
              top: `${item.top}%`,
              animationDuration: `${item.duration}s`,
              animationDelay: `${item.delay}s`
            }}
          >
            {item.text}
          </span>
        ))
      )}
      <span className="danmaku-strip-label">站内弹幕</span>
    </div>
  );
}
