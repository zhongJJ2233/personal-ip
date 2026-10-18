import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import PixelSwap from './components/PixelSwap';
import AccordionGallery from './components/AccordionGallery';
import DotField from './components/DotField';
import StrokeText from './components/StrokeText';
import VideoPanel from './components/VideoPanel';
import './styles.css';

function TitleLine({ text, color = '#f2f1e9', trigger = 'scroll', highlights = [] }) {
  return <StrokeText text={text} strokeColor={color} fillColor={color}
    fontSize={128} fontWeight={700} letterSpacing={-8} strokeWidth={1.4}
    drawDuration={1.25} fillDelay={0.12} stagger={0.045} fillMode="wipe"
    trigger={trigger} highlights={highlights} />;
}

function App() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const updateBackToTop = () => setShowBackToTop(window.scrollY > window.innerHeight * 0.6);
    updateBackToTop();
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    return () => window.removeEventListener('scroll', updateBackToTop);
  }, []);

  const workItems = [
    { image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=82', label: '控制类嵌入式', alt: '城市活动现场' },
    { image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=82', label: 'INFJ', alt: '内容创作工作场景' },
    { image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=82', label: '英语口语', alt: '空间策划场景' },
    { image: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=82', label: '游戏宅', alt: '夜晚城市灯光' },
    { image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=82', label: '抽象', alt: '创意工作室空间' }
  ];
  return <div className="site-shell">
    <DotField className="site-dot-field" dotRadius={2} dotSpacing={20} cursorRadius={280} bulgeStrength={67} glowRadius={160} gradientFrom="rgba(215, 251, 85, 0.32)" gradientTo="rgba(201, 203, 192, 0.18)" glowColor="rgba(215, 251, 85, 0.10)" />
    <header className="topbar">
      <a className="brand" href="#top" aria-label="回到首页"><span className="brand-mark">L</span><span>LI / LAB</span></a>
      <nav className="nav-links" aria-label="主导航"><a href="#about">关于我</a><a href="#works">正在做</a><a href="#video">影像</a><a href="#contact">联系我</a></nav>
      <a className="nav-cta" href="mailto:hello@lilab.studio">合作邀约 <span aria-hidden="true">↗</span></a>
    </header>

    <main id="top">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow reveal-item">PERSONAL IP / 2024 / 25</p>
          <h1 className="hero-title" aria-label="你好，欢迎访问">
            <TitleLine text="你好，" trigger="mount" />
            <TitleLine text="欢迎访问" color="#d7fb55" trigger="mount" />
          </h1>
          <p className="hero-subtitle reveal-item delay-2">这是来自我的个人IP。<br />我把观察变成内容，把灵感变成可以参与的体验。</p>
          <a className="text-link reveal-item delay-3" href="#about">认识我 <span aria-hidden="true">↓</span></a>
        </div>
        <div className="hero-visual reveal-item delay-2">
          <div className="visual-note">点击图像<br />切换视角</div>
          <PixelSwap
            firstContent={<div className="portrait-card portrait-card--front"><div className="portrait-overlay"></div><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=86" alt="创作者肖像" /><div className="portrait-caption"><span>LI / 01</span><span>观察者</span></div></div>}
            secondContent={<div className="portrait-card portrait-card--back"><div className="back-topline"><span>关于我</span><span>02 / 02</span></div><div className="back-copy">内容创作者<br />体验策划者<br />生活记录员</div><div className="back-bottomline">把日常变成有趣的线索。</div></div>}
            pixelSize={42}
            pixelRadius={8}
            pixelSpin={4}
            duration={1200}
            pixelDuration={480}
            pattern="spiral"
            randomness={0.2}
            trigger="click"
          />
          <div className="visual-index">01 <span>/</span> 02</div>
        </div>
      </section>

      <section className="signal-strip" aria-label="个人标签"><span>内容</span><span>策划</span><span>表达</span><span>好奇心</span><span>长期主义</span></section>

      <section className="panel-directory" aria-labelledby="panel-directory-title">
        <div className="panel-directory-head">
          <div className="section-kicker">PANEL INDEX / 00</div>
          <h2 id="panel-directory-title">面板目录</h2>
        </div>
        <nav className="panel-directory-list" aria-label="面板目录">
          <a href="#top"><span className="panel-directory-number">01</span><span className="panel-directory-name">首页</span><span className="panel-directory-target">TOP</span><span className="panel-directory-arrow" aria-hidden="true">↘</span></a>
          <a href="#about"><span className="panel-directory-number">02</span><span className="panel-directory-name">关于我</span><span className="panel-directory-target">ABOUT</span><span className="panel-directory-arrow" aria-hidden="true">↘</span></a>
          <a href="#works"><span className="panel-directory-number">03</span><span className="panel-directory-name">正在做的事</span><span className="panel-directory-target">WORKS</span><span className="panel-directory-arrow" aria-hidden="true">↘</span></a>
          <a href="#video"><span className="panel-directory-number">04</span><span className="panel-directory-name">影像</span><span className="panel-directory-target">VIDEO</span><span className="panel-directory-arrow" aria-hidden="true">↘</span></a>
          <a href="#contact"><span className="panel-directory-number">05</span><span className="panel-directory-name">联系我</span><span className="panel-directory-target">CONTACT</span><span className="panel-directory-arrow" aria-hidden="true">↘</span></a>
        </nav>
      </section>

      <section className="about-section" id="about">
        <div className="section-kicker">ABOUT / 01</div>
        <div className="about-grid">
          <h2 aria-label="我相信，好内容会让人重新看见生活。">
            <TitleLine text="我相信，" />
            <TitleLine text="好内容会让人" highlights={[{ start: 0, end: 3, color: '#d7fb55' }]} />
            <TitleLine text="重新看见生活。" />
          </h2>
          <div className="about-copy"><p>我在做一件很具体的事：把脑海里那些还没有名字的感受，变成你能看见、听见、参与的东西。</p><p>从一支短片到一场活动，从一篇文章到一个小小的品牌瞬间，我关心真实的人，也关心真实发生的变化。</p><a className="outline-button" href="mailto:hello@lilab.studio">聊聊你的想法 <span aria-hidden="true">↗</span></a></div>
        </div>
      </section>

      <section className="works-section" id="works">
        <div className="works-head"><div><div className="section-kicker">SELECTED WORKS / 02</div><h2 aria-label="正在做的事"><TitleLine text="正在做的事" /></h2></div><p className="works-note">悬停或点击，展开每一个线索。</p></div>
        <AccordionGallery items={workItems} defaultIndex={2} expandRatio={0.52} trigger="hover" height={430} gap={10} radius={0} accentColor="#d7fb55" overlayColor="#11130f" textColor="#f2f1e9" grayscale parallax={0.48} tilt={6} />
      </section>

      <VideoPanel />

      <section className="contact-section" id="contact"><DotField dotRadius={2} dotSpacing={20} cursorRadius={280} bulgeStrength={67} glowRadius={160} gradientFrom="rgba(17, 19, 15, 0.22)" gradientTo="rgba(17, 19, 15, 0.14)" glowColor="rgba(17, 19, 15, 0.08)" /><div className="contact-orbit" aria-hidden="true"><span>LET’S MAKE SOMETHING WORTH REMEMBERING • </span><span>LET’S MAKE SOMETHING WORTH REMEMBERING • </span></div><div className="contact-content"><div className="section-kicker">SAY HELLO / 04</div><h2 aria-label="或许，我们可以进一步了解"><TitleLine text="或许" color="#11130f" /><TitleLine text="我们可以进一步了解" color="#11130f" /></h2><span className="contact-link">428982120@qq.com</span></div></section>
    </main>

    <footer className="footer"><span>© 2024 LI / LAB</span><span>在这里，保持好奇。</span><a href="#top">回到顶部 ↑</a></footer>
    <a className={`back-to-top${showBackToTop ? ' is-visible' : ''}`} href="#top" aria-label="回到顶部">↑<span>TOP</span></a>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);







