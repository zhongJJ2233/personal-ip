import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import './AccordionGallery.css';

const AccordionGallery = ({
  items = [],
  defaultIndex = 0,
  accentColor = '#d7fb55',
  overlayColor = '#11130f',
  textColor = '#f2f1e9',
  height = 430,
  gap = 10,
  radius = 0,
  expandRatio = 0.5,
  orientation = 'horizontal',
  duration = 0.6,
  ease = 'power3.out',
  parallax = 0.5,
  tilt = 7,
  stagger = 0.06,
  trigger = 'hover',
  showLabels = true,
  grayscale = true,
  className = ''
}) => {
  const rootRef = useRef(null);
  const panelRefs = useRef([]);
  const mediaRefs = useRef([]);
  const barRefs = useRef([]);
  const textRefs = useRef([]);
  const tlRef = useRef(null);
  const firstRunRef = useRef(true);
  const mediaSizeRef = useRef(320);
  const vertical = orientation === 'vertical';
  const count = items.length;
  const safeDefault = Math.min(Math.max(defaultIndex, 0), Math.max(count - 1, 0));
  const [active, setActive] = useState(safeDefault);
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

  const applyLayout = useCallback(animate => {
    const panels = panelRefs.current;
    if (!panels.length || !count) return;
    const r = Math.min(Math.max(expandRatio, 0.2), 0.9);
    const grow = count > 1 ? (r * (count - 1)) / (1 - r) : 1;
    const mediaSize = mediaSizeRef.current;
    tlRef.current?.kill();
    const dur = animate && !prefersReduced ? duration : 0;
    const tl = gsap.timeline();
    panels.forEach((panel, i) => {
      if (!panel) return;
      const isActive = i === active;
      const media = mediaRefs.current[i];
      const bar = barRefs.current[i];
      const text = textRefs.current[i];
      const rot = isActive ? 0 : i < active ? tilt : -tilt;
      const rotProp = vertical ? { rotateX: -rot } : { rotateY: rot };
      tl.to(panel, { flexGrow: isActive ? grow : 1, ...rotProp, duration: dur, ease }, 0);
      if (media) {
        const drift = Math.max(-1.5, Math.min(1.5, active - i));
        const shift = drift * parallax * mediaSize * 0.06;
        const gray = grayscale ? (isActive ? 0 : 1) : 0;
        tl.to(media, { xPercent: -50, yPercent: -50, x: vertical ? 0 : isActive ? 0 : shift, y: vertical ? (isActive ? 0 : shift) : 0, '--ag-gray': gray, '--ag-dim': isActive ? 0 : 0.35, duration: dur, ease }, 0);
      }
      if (showLabels && bar && text) {
        if (isActive) tl.to([bar, text], { opacity: 1, x: 0, duration: dur, ease, stagger: prefersReduced ? 0 : stagger }, 0);
        else tl.to([bar, text], { opacity: 0, x: -14, duration: dur * 0.6, ease }, 0);
      }
    });
    tlRef.current = tl;
  }, [active, count, expandRatio, duration, ease, vertical, tilt, parallax, grayscale, showLabels, stagger, prefersReduced]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !count) return undefined;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const total = vertical ? rect.height : rect.width;
      const usable = Math.max(total - gap * (count - 1), 120);
      const size = Math.max(140, usable * Math.min(Math.max(expandRatio, 0.2), 0.9) * 1.22);
      mediaSizeRef.current = size;
      el.style.setProperty('--ag-media-size', `${size}px`);
      applyLayout(!firstRunRef.current);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyLayout, gap, count, expandRatio, vertical]);

  useEffect(() => {
    applyLayout(!firstRunRef.current);
    firstRunRef.current = false;
  }, [applyLayout]);

  useEffect(() => () => { tlRef.current?.kill(); }, []);

  const handleEnter = index => { if (trigger === 'hover') setActive(index); };
  const handleClick = (index, event) => { if (index !== active) { event.preventDefault(); setActive(index); } };
  const handleKeyDown = (index, event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); setActive((index + 1) % count); }
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); setActive((index - 1 + count) % count); }
  };

  return <div ref={rootRef} className={`accordion-gallery${vertical ? ' accordion-gallery--vertical' : ''}${className ? ` ${className}` : ''}`} style={{ '--ag-accent': accentColor, '--ag-overlay': overlayColor, '--ag-text': textColor, '--ag-gap': `${gap}px`, '--ag-radius': `${radius}px`, height: vertical ? `${Math.round(height * 1.6)}px` : `${height}px` }} role="list" aria-label="作品手风琴画廊">
    {items.map((item, index) => {
      const isActive = index === active;
      const Tag = item.link ? 'a' : 'div';
      return <Tag key={item.label || index} ref={element => { panelRefs.current[index] = element; }} className={`ag-panel${isActive ? ' ag-panel--active' : ''}`} style={{ borderRadius: `${radius}px` }} href={item.link || undefined} onClick={event => handleClick(index, event)} onMouseEnter={() => handleEnter(index)} onFocus={() => setActive(index)} onKeyDown={event => handleKeyDown(index, event)} role="listitem" tabIndex={0} aria-current={isActive ? 'true' : undefined} aria-label={item.label}>
        <span className="ag-panel__frame"><span className="ag-panel__media" ref={element => { mediaRefs.current[index] = element; }}><img src={item.image} alt={item.alt || item.label || ''} draggable="false" /></span><span className="ag-panel__overlay" aria-hidden="true" /></span>
        {showLabels && <span className="ag-panel__label" aria-hidden="true"><span className="ag-panel__bar" ref={element => { barRefs.current[index] = element; }} /><span className="ag-panel__text" ref={element => { textRefs.current[index] = element; }}>{item.label}</span></span>}
      </Tag>;
    })}
  </div>;
};

export default AccordionGallery;
