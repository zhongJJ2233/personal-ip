import React, { useEffect, useRef, memo } from 'react';

import './DotField.css';

const TWO_PI = Math.PI * 2;

// React Bits DotField adapted for fixed backgrounds, idle suspension,
// reduced-motion preferences, and pointer events that do not block page controls.

const DotField = memo(({
  dotRadius = 1.5,
  dotSpacing = 14,
  cursorRadius = 500,
  cursorForce = 0.1,
  bulgeOnly = true,
  bulgeStrength = 67,
  glowRadius = 160,
  sparkle = false,
  waveAmplitude = 0,
  gradientFrom = 'rgba(168, 85, 247, 0.35)',
  gradientTo = 'rgba(180, 151, 207, 0.25)',
  glowColor = '#120F17',
  className = '',
  ...rest
}) => {
  const canvasRef = useRef(null);
  const glowRef = useRef(null);
  const dotsRef = useRef([]);
  const mouseRef = useRef({ x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 });
  const rafRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const glowOpacity = useRef(0);
  const engagement = useRef(0);
  const propsRef = useRef({});
  propsRef.current = { dotRadius, dotSpacing, cursorRadius, cursorForce, bulgeOnly, bulgeStrength, sparkle, waveAmplitude, gradientFrom, gradientTo };
  const rebuildRef = useRef(null);
  const glowIdRef = useRef(`dot-field-glow-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    const canvas = canvasRef.current;
    const glowEl = glowRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(any-pointer: fine)');
    const interactive = () => !reducedMotion.matches && finePointer.matches;
    let visible = true;
    let idleFrames = 0;
    let gradient;
    let resizeTimer;

    function resize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doResize, 100);
    }

    function doResize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      sizeRef.current = {
        w,
        h,
      };

      buildDots(w, h);
      gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, propsRef.current.gradientFrom);
      gradient.addColorStop(1, propsRef.current.gradientTo);
      idleFrames = 0;
      requestFrame();
    }

    function buildDots(w, h) {
      const p = propsRef.current;
      // Bound the canvas workload on large screens and tiny requested spacing.
      const step = Math.max(6, p.dotRadius + p.dotSpacing, Math.sqrt(w * h / 9000));
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const padX = (w % step) / 2;
      const padY = (h % step) / 2;
      const dots = new Array(rows * cols);
      let idx = 0;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ax = padX + col * step + step / 2;
          const ay = padY + row * step + step / 2;
          dots[idx++] = { ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
        }
      }
      dotsRef.current = dots;
    }

    function onMouseMove(e) {
      if (e.pointerType === 'touch' || !interactive() || !visible) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const m = mouseRef.current;
      m.clientX = e.clientX;
      m.clientY = e.clientY;
      m.x = e.clientX - rect.left;
      m.y = e.clientY - rect.top;
      if (m.prevX === -9999) { m.prevX = m.x; m.prevY = m.y; }
      idleFrames = 0;
      requestFrame();
    }

    function updateMouseSpeed() {
      const m = mouseRef.current;
      const dx = m.prevX - m.x;
      const dy = m.prevY - m.y;
      const dist = Math.min(50, Math.sqrt(dx * dx + dy * dy));
      m.speed += (dist - m.speed) * 0.5;
      if (m.speed < 0.001) m.speed = 0;
      m.prevX = m.x;
      m.prevY = m.y;
    }

    function requestFrame() {
      if (!rafRef.current && visible && !document.hidden) rafRef.current = requestAnimationFrame(tick);
    }

    function resetPointer() {
      mouseRef.current = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
      idleFrames = 0;
      requestFrame();
    }

    function onVisibility() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      resetPointer();
    }

    function onPreference() {
      engagement.current = 0;
      glowOpacity.current = 0;
      dotsRef.current.forEach(d => { d.sx = d.ax; d.sy = d.ay; d.vx = 0; d.vy = 0; });
      resetPointer();
    }

    let frameCount = 0;

    function tick() {
      rafRef.current = null;
      if (!visible || document.hidden) return;
      frameCount++;
      const dots = dotsRef.current;
      const m = mouseRef.current;
      const { w, h } = sizeRef.current;
      const p = propsRef.current;
      const len = dots.length;
      const t = frameCount * 0.02;
      const animate = interactive();
      if (m.clientX !== undefined) {
        // Client coordinates stay correct for both fixed and scrolling sections.
        const rect = canvas.parentElement.getBoundingClientRect();
        m.x = m.clientX - rect.left;
        m.y = m.clientY - rect.top;
      }
      updateMouseSpeed();

      const inside = m.x >= 0 && m.x <= w && m.y >= 0 && m.y <= h;
      const targetEngagement = animate && inside ? Math.min(m.speed / 5, 1) : 0;
      engagement.current += (targetEngagement - engagement.current) * 0.06;
      if (engagement.current < 0.001) engagement.current = 0;
      const eng = engagement.current;

      glowOpacity.current += (eng - glowOpacity.current) * 0.08;

      if (glowEl) {
        glowEl.setAttribute('cx', m.x);
        glowEl.setAttribute('cy', m.y);
        glowEl.style.opacity = glowOpacity.current;
      }

      ctx.clearRect(0, 0, w, h);

      if (!gradient) return;
      ctx.fillStyle = gradient;

      const cr = Math.max(1, p.cursorRadius);
      const crSq = cr * cr;
      const rad = Math.max(0.1, p.dotRadius / 2);
      const isBulge = p.bulgeOnly;

      ctx.beginPath();

      for (let i = 0; i < len; i++) {
        const d = dots[i];
        const dx = m.x - d.ax;
        const dy = m.y - d.ay;
        const distSq = dx * dx + dy * dy;

        if (animate && inside && distSq < crSq && eng > 0.01) {
          const dist = Math.max(1, Math.sqrt(distSq));
          if (isBulge) {
            const t = 1 - dist / cr;
            const push = t * t * p.bulgeStrength * eng;
            const angle = Math.atan2(dy, dx);
            d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
            d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
          } else {
            const angle = Math.atan2(dy, dx);
            const move = Math.min(30, (500 / dist) * (m.speed * p.cursorForce));
            d.vx += Math.cos(angle) * -move;
            d.vy += Math.sin(angle) * -move;
          }
        } else if (isBulge) {
          d.sx += (d.ax - d.sx) * 0.1;
          d.sy += (d.ay - d.sy) * 0.1;
        }

        if (!isBulge) {
          d.vx *= 0.9;
          d.vy *= 0.9;
          d.x = d.ax + d.vx;
          d.y = d.ay + d.vy;
          d.sx += (d.x - d.sx) * 0.1;
          d.sy += (d.y - d.sy) * 0.1;
        }

        let drawX = d.sx;
        let drawY = d.sy;
        if (animate && p.waveAmplitude > 0) {
          drawY += Math.sin(d.ax * 0.03 + t) * p.waveAmplitude;
          drawX += Math.cos(d.ay * 0.03 + t * 0.7) * p.waveAmplitude * 0.5;
        }

        if (animate && p.sparkle) {
          const hash = ((i * 2654435761) ^ (frameCount >> 3)) >>> 0;
          if ((hash % 100) < 3) {
            ctx.moveTo(drawX + rad * 1.8, drawY);
            ctx.arc(drawX, drawY, rad * 1.8, 0, TWO_PI);
          } else {
            ctx.moveTo(drawX + rad, drawY);
            ctx.arc(drawX, drawY, rad, 0, TWO_PI);
          }
        } else {
          ctx.moveTo(drawX + rad, drawY);
          ctx.arc(drawX, drawY, rad, 0, TWO_PI);
        }
      }

      ctx.fill();

      idleFrames++;
      // Only animate while moving or settling; static devices draw once.
      if (animate && (idleFrames < 160 || p.sparkle || p.waveAmplitude > 0)) requestFrame();
    }

    doResize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { idleFrames = 0; requestFrame(); }
      else { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    });
    intersectionObserver.observe(canvas.parentElement);
    window.addEventListener('pointermove', onMouseMove, { passive: true });
    window.addEventListener('blur', resetPointer);
    document.addEventListener('pointerleave', resetPointer);
    document.addEventListener('visibilitychange', onVisibility);
    reducedMotion.addEventListener('change', onPreference);
    finePointer.addEventListener('change', onPreference);

    rebuildRef.current = () => {
      doResize();
    };

    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('pointermove', onMouseMove);
      window.removeEventListener('blur', resetPointer);
      document.removeEventListener('pointerleave', resetPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      reducedMotion.removeEventListener('change', onPreference);
      finePointer.removeEventListener('change', onPreference);
      rebuildRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    rebuildRef.current?.();
  }, [dotRadius, dotSpacing, gradientFrom, gradientTo]);

  return (
    <div className={`dot-field-container ${className}`.trim()} aria-hidden="true" {...rest}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <radialGradient id={glowIdRef.current}>
            <stop offset="0%" stopColor={glowColor} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle
          ref={glowRef}
          cx="-9999"
          cy="-9999"
          r={glowRadius}
          fill={`url(#${glowIdRef.current})`}
          style={{ opacity: 0, willChange: 'opacity' }}
        />
      </svg>
    </div>
  );
});

DotField.displayName = 'DotField';

export default DotField;


