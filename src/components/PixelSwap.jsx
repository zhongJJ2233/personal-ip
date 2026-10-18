import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './PixelSwap.css';

const MAX_PIXELS = 220;
const KEYFRAME_STEPS = 14;
const PATTERNS = {
  random: () => null,
  center: (x, y) => Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2,
  edges: (x, y) => Math.min(x, 1 - x, y, 1 - y) * 2,
  'left-to-right': x => x,
  'right-to-left': x => 1 - x,
  'top-to-bottom': (_x, y) => y,
  'bottom-to-top': (_x, y) => 1 - y,
  diagonal: (x, y) => (x + y) / 2,
  spiral: (x, y) => {
    const angle = (Math.atan2(y - 0.5, x - 0.5) + Math.PI) / (Math.PI * 2);
    const radius = Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2;
    return (angle + radius) % 1;
  }
};
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const noise = seed => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};
const makeEasing = value => {
  const match = /cubic-bezier\\(([^)]+)\\)/.exec(value);
  const points = match ? match[1].split(',').map(Number) : [0.22, 1, 0.36, 1];
  const [x1, y1, x2, y2] = points;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  return progress => {
    let t = progress;
    for (let i = 0; i < 5; i += 1) {
      const slope = (3 * ax * t + 2 * bx) * t + cx;
      if (!slope) break;
      t -= (((ax * t + bx) * t + cx) * t - progress) / slope;
    }
    t = clamp(t, 0, 1);
    return ((ay * t + by) * t + cy) * t;
  };
};
const coverScale = (size, gap, radius) => {
  const p = clamp(radius, 0, 50) / 100;
  const corner = Math.SQRT1_2 / (Math.SQRT2 * (0.5 - p) + p);
  return ((size + gap) / size) * Math.max(1, corner);
};
const buildGrid = ({ width, height, pixelSize, gap, pattern, randomness }) => {
  let size = pixelSize;
  let columns = Math.max(1, Math.ceil((width + gap) / (size + gap)));
  let rows = Math.max(1, Math.ceil((height + gap) / (size + gap)));
  if (columns * rows > MAX_PIXELS) {
    size = Math.ceil(size * Math.sqrt((columns * rows) / MAX_PIXELS));
    columns = Math.max(1, Math.ceil((width + gap) / (size + gap)));
    rows = Math.max(1, Math.ceil((height + gap) / (size + gap)));
  }
  const stride = size + gap;
  const originX = (width - (columns * stride - gap)) / 2;
  const originY = (height - (rows * stride - gap)) / 2;
  const order = PATTERNS[pattern] ?? PATTERNS.random;
  const mix = clamp(randomness, 0, 1);
  const pixels = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const x = columns <= 1 ? 0.5 : column / (columns - 1);
      const y = rows <= 1 ? 0.5 : row / (rows - 1);
      const base = order(x, y);
      const random = noise(index + 1);
      pixels.push({ id: index, left: originX + column * stride, top: originY + row * stride, offset: base === null ? random : base * (1 - mix) + random * mix });
    }
  }
  return { pixels, size, gap, width, height };
};
const buildKeyframes = ({ ease, startScale, endScale, spin, fade }) => {
  const window = [];
  const content = [];
  for (let step = 0; step <= KEYFRAME_STEPS; step += 1) {
    const progress = step / KEYFRAME_STEPS;
    const eased = ease(progress);
    const scale = startScale + (endScale - startScale) * eased;
    const angle = spin * (1 - eased);
    window.push({ offset: progress, opacity: fade ? Math.min(1, eased * 1.6) : 1, transform: `rotate(${angle}deg) scale(${scale})` });
    content.push({ offset: progress, transform: `scale(${1 / scale}) rotate(${-angle}deg)` });
  }
  return { window, content };
};

function PixelSwap({ firstContent, secondContent, pixelSize = 52, gap = 0, pixelRadius = 0, pixelSpin = 0, pixelScale = 0.35, fade = true, duration = 1100, pixelDuration = 420, pattern = 'spiral', randomness = 0.15, easing = 'cubic-bezier(0.22, 1, 0.36, 1)', trigger = 'click', initialActive = false, className = '', style }) {
  const [internalActive, setInternalActive] = useState(initialActive);
  const [shownActive, setShownActive] = useState(initialActive);
  const [transition, setTransition] = useState(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  const layerRefs = useRef([]);
  const pixelRefs = useRef([]);
  const animationsRef = useRef([]);
  const timerRef = useRef(0);
  const desiredActive = internalActive;
  const incomingIndex = transition?.to ? 1 : 0;
  const grid = useMemo(() => buildGrid({ width: box.width, height: box.height, pixelSize: Math.max(8, Math.round(pixelSize)), gap: Math.max(0, Math.round(gap)), pattern, randomness }), [box.width, box.height, pixelSize, gap, pattern, randomness]);
  const stopAnimations = useCallback(() => {
    animationsRef.current.forEach(animation => animation.cancel());
    animationsRef.current = [];
    pixelRefs.current.forEach(pixel => pixel?.replaceChildren());
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = 0;
  }, []);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const measure = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      setBox(current => current.width === width && current.height === height ? current : { width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  useEffect(() => stopAnimations, [stopAnimations]);
  useEffect(() => {
    if (transition || desiredActive === shownActive) return;
    setTransition({ to: desiredActive, grid });
  }, [desiredActive, shownActive, transition, grid]);
  useEffect(() => {
    if (!transition) return undefined;
    const source = layerRefs.current[transition.to ? 1 : 0];
    const finish = () => { stopAnimations(); setShownActive(transition.to); setTransition(null); };
    if (!source || !transition.grid.pixels.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return undefined; }
    const total = Math.max(200, duration);
    const pixelMs = clamp(pixelDuration, 60, total);
    const spread = Math.max(0, total - pixelMs);
    const endScale = coverScale(transition.grid.size, transition.grid.gap, pixelRadius);
    const keyframes = buildKeyframes({ ease: makeEasing(easing), startScale: clamp(pixelScale, 0.05, 1) * endScale, endScale, spin: pixelSpin, fade });
    transition.grid.pixels.forEach((pixel, index) => {
      const pixelElement = pixelRefs.current[index];
      if (!pixelElement) return;
      const content = document.createElement('div');
      content.className = 'pixel-swap__pixel-content';
      content.style.left = `${-pixel.left}px`;
      content.style.top = `${-pixel.top}px`;
      content.style.width = `${transition.grid.width}px`;
      content.style.height = `${transition.grid.height}px`;
      content.style.transformOrigin = `${pixel.left + transition.grid.size / 2}px ${pixel.top + transition.grid.size / 2}px`;
      const clone = source.cloneNode(true);
      clone.dataset.visible = 'true';
      clone.removeAttribute('aria-hidden');
      content.appendChild(clone);
      pixelElement.replaceChildren(content);
      const timing = { duration: pixelMs, delay: pixel.offset * spread, easing: 'linear', fill: 'both' };
      animationsRef.current.push(pixelElement.animate(keyframes.window, timing), content.animate(keyframes.content, timing));
    });
    timerRef.current = window.setTimeout(finish, total);
    return stopAnimations;
  }, [transition, stopAnimations, duration, pixelDuration, pixelSpin, pixelScale, pixelRadius, fade, easing]);
  const requestActive = next => setInternalActive(next);
  const interactionProps = trigger === 'click' ? { onClick: () => requestActive(!desiredActive), onKeyDown: event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); requestActive(!desiredActive); } }, role: 'button', tabIndex: 0 } : {};
  const renderLayer = (content, index) => {
    const isShown = index === (shownActive ? 1 : 0);
    return <div key={index} ref={element => { layerRefs.current[index] = element; }} className="pixel-swap__layer" data-visible={isShown && !(transition && index === incomingIndex)} style={{ zIndex: isShown ? 2 : 1 }} aria-hidden={!isShown}>{content}</div>;
  };
  return <div ref={containerRef} className={`pixel-swap ${className}`.trim()} style={{ aspectRatio: '4 / 5', ...style }} data-active={shownActive} data-transitioning={!!transition} {...interactionProps}>
    {renderLayer(firstContent, 0)}
    {renderLayer(secondContent, 1)}
    {transition && <div className="pixel-swap__grid" aria-hidden="true">{transition.grid.pixels.map((pixel, index) => <div key={pixel.id} ref={element => { pixelRefs.current[index] = element; }} className="pixel-swap__pixel" style={{ left: pixel.left, top: pixel.top, width: transition.grid.size, height: transition.grid.size, borderRadius: `${clamp(pixelRadius, 0, 50)}%` }} />)}</div>}
  </div>;
}


export default PixelSwap;


