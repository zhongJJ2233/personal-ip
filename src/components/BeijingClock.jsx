import React, { useEffect, useState } from 'react';

// 固定用 Asia/Shanghai 时区格式化，跟访客本机时区无关：
// 无论对方在哪个国家，这里显示的都是中国标准时间（UTC+8）。
const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Shanghai',
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

const DATE_FORMAT = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  weekday: 'long'
});

const readClock = () => {
  const now = new Date();
  const [hours = '00', minutes = '00', seconds = '00'] = TIME_FORMAT.format(now).split(':');
  return {
    hours,
    minutes,
    seconds,
    date: DATE_FORMAT.format(now),
    weekday: WEEKDAY_FORMAT.format(now)
  };
};

export default function BeijingClock() {
  const [clock, setClock] = useState(readClock);

  useEffect(() => {
    // 对齐到整秒再跳，秒数不会因为进入页面的时间点而偏一格
    let timer = null;
    const tick = () => {
      setClock(readClock());
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <aside className="hero-clock" aria-label="北京时间（UTC+8）">
      <p className="clock-kicker">
        <span className="clock-live" aria-hidden="true" />
        <span>北京时间 · BEIJING TIME</span>
      </p>
      <p className="clock-time" aria-live="off">
        <span className="clock-hm">
          {clock.hours}:{clock.minutes}
        </span>
        <span className="clock-seconds">:{clock.seconds}</span>
      </p>
      <p className="clock-date">
        {clock.date} · {clock.weekday}
      </p>
      <p className="clock-zone">UTC+8 · ASIA/SHANGHAI</p>
    </aside>
  );
}
