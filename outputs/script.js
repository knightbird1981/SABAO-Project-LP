/* ============================================================
   SABAO Project LP — script.js
   ・カーソルに群がる光の粒子 (収束)
   ・画面外まで散らばる (拡散)
   Three.js 不使用 / Pure Canvas 2D
============================================================ */

'use strict';

const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const isMobile = window.innerWidth < 768;

/* ──────────────────────────────────────────────
   1. PARTICLE SYSTEM
────────────────────────────────────────────── */
(function initParticles() {
  if (isMobile) return;

  const canvas = document.getElementById('webgl');
  const ctx    = canvas.getContext('2d');
  let W = window.innerWidth;
  let H = window.innerHeight;
  canvas.width = W; canvas.height = H;

  /* --- Sprite: 一度だけ描画、以降 drawImage で高速スタンプ --- */
  function makeSprite(r, g, b, radius) {
    const c = document.createElement('canvas');
    c.width = c.height = radius * 2;
    const sc  = c.getContext('2d');
    const grd = sc.createRadialGradient(radius, radius, 0, radius, radius, radius);
    grd.addColorStop(0,   `rgba(${r},${g},${b},1)`);
    grd.addColorStop(0.4, `rgba(${r},${g},${b},0.55)`);
    grd.addColorStop(1,   `rgba(${r},${g},${b},0)`);
    sc.fillStyle = grd;
    sc.fillRect(0, 0, radius * 2, radius * 2);
    return c;
  }

  const SR = 6;
  const spriteCyan   = makeSprite(0,   229, 255, SR);
  const spritePurple = makeSprite(155, 92,  246, SR);
  const spriteGreen  = makeSprite(57,  255, 20,  SR);

  /* --- パーティクル生成 --- */
  const NUM       = 3500;
  const CLUSTER_R = 95;   // カーソル周辺の群がり半径 (px)

  function buildParticles() {
    const arr = [];
    for (let i = 0; i < NUM; i++) {
      const angle = Math.random() * Math.PI * 2;
      // sqrt でより均一な円分布（中心に集まりすぎない）
      const dist  = Math.sqrt(Math.random()) * CLUSTER_R;

      arr.push({
        // 収束時：カーソルからのオフセット
        cox: Math.cos(angle) * dist,
        coy: Math.sin(angle) * dist,

        // 拡散時：画面外のランダム位置（±2倍スクリーン）
        sx: (Math.random() - 0.5) * W * 4,
        sy: (Math.random() - 0.5) * H * 4,

        // 現在位置（初期は散らばり）
        x:  (Math.random() - 0.5) * W * 4,
        y:  (Math.random() - 0.5) * H * 4,

        phase:  Math.random() * Math.PI * 2,
        sprite: i % 10 < 7 ? spriteCyan
               : i % 10 < 9 ? spritePurple
               : spriteGreen,
      });
    }
    return arr;
  }

  let pts = buildParticles();

  /* --- 状態 --- */
  let cursorX = W / 2, cursorY = H / 2;
  let converging = false;
  let lastMove   = 0;
  let time       = 0;

  window.addEventListener('mousemove', e => {
    cursorX    = e.clientX;
    cursorY    = e.clientY;
    converging = true;
    lastMove   = Date.now();
  });

  window.addEventListener('resize', () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    pts = buildParticles();
  });

  /* --- アニメーションループ --- */
  function animate() {
    requestAnimationFrame(animate);
    time += 0.022;

    // アイドル 2.5秒 → 拡散
    if (lastMove > 0 && Date.now() - lastMove > 2500) converging = false;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter'; // 加算合成 → グロー効果

    for (let i = 0; i < NUM; i++) {
      const p = pts[i];

      /* 目標位置 */
      const tx = converging ? cursorX + p.cox : p.sx;
      const ty = converging ? cursorY + p.coy : p.sy;

      /* lerp 速度：収束は速く、拡散はゆっくり流れる */
      const spd = converging ? 0.055 : 0.032;
      p.x = lerp(p.x, tx, spd);
      p.y = lerp(p.y, ty, spd);

      /* 有機的な揺らぎ */
      const sx = p.x + Math.sin(p.phase + time)       * 3.5;
      const sy = p.y + Math.cos(p.phase + time * 0.8) * 3.5;

      ctx.globalAlpha = 0.55 + Math.sin(p.phase + time * 0.5) * 0.22;
      ctx.drawImage(p.sprite, sx - SR, sy - SR);
    }
  }

  animate();
})();

/* ──────────────────────────────────────────────
   2. NAVIGATION
────────────────────────────────────────────── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : '';
});
document.querySelectorAll('.mobile-link').forEach(l => {
  l.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('active');
    document.body.style.overflow = '';
  });
});

/* ──────────────────────────────────────────────
   3. SMOOTH SCROLL
────────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' });
  });
});

/* ──────────────────────────────────────────────
   4. SCROLL REVEAL
────────────────────────────────────────────── */
new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
).observe = (function(orig) {
  // patch to observe all .reveal elements
  const io = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  return orig;
})(null);

// card bars
new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.querySelectorAll('.card-bar').forEach((bar, i) => {
      bar.style.opacity = '1';
      bar.style.animation = `barGrow 1.2s cubic-bezier(0.16,1,0.3,1) ${i * 0.15}s forwards`;
    });
  });
}, { threshold: 0.3 }).observe = (function() {
  const io2 = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.card-bar').forEach((bar, i) => {
        bar.style.opacity = '1';
        bar.style.animation = `barGrow 1.2s cubic-bezier(0.16,1,0.3,1) ${i*0.15}s forwards`;
      });
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.intro-card').forEach(c => io2.observe(c));
})();

// pv bars
(function() {
  const io3 = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.pv-bar').forEach((bar, i) => {
        bar.style.opacity = '1';
        bar.style.animation = `barGrow 0.9s cubic-bezier(0.16,1,0.3,1) ${i*0.1}s forwards`;
      });
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.pv-3').forEach(el => io3.observe(el));
})();

/* ──────────────────────────────────────────────
   5. HERO SCROLL HINT
────────────────────────────────────────────── */
const scrollHint = document.querySelector('.hero-scroll-hint');
if (scrollHint) {
  window.addEventListener('scroll', () => {
    scrollHint.style.opacity = clamp(1 - window.scrollY / 120, 0, 1);
  });
}

/* ──────────────────────────────────────────────
   6. CONTACT FORM
────────────────────────────────────────────── */
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn = contactForm.querySelector('.btn-submit');
    const txt = btn.querySelector('.btn-submit-text');
    btn.disabled = true; txt.textContent = '送信中...'; btn.style.opacity = '0.7';
    setTimeout(() => {
      contactForm.style.display = 'none';
      formSuccess.classList.add('show');
      formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        formSuccess.classList.remove('show');
        contactForm.style.display = '';
        contactForm.reset();
        btn.disabled = false; txt.textContent = '送信する'; btn.style.opacity = '1';
      }, 8000);
    }, 1400);
  });
}

/* ──────────────────────────────────────────────
   7. CURSOR GLOW
────────────────────────────────────────────── */
if (!isMobile) {
  const glow = document.createElement('div');
  Object.assign(glow.style, {
    position:'fixed', width:'300px', height:'300px', borderRadius:'50%',
    pointerEvents:'none', zIndex:'1', transform:'translate(-50%,-50%)',
    background:'radial-gradient(circle, rgba(0,229,255,0.07) 0%, transparent 70%)',
    top:'-200px', left:'-200px', transition:'opacity 0.3s',
  });
  document.body.appendChild(glow);
  let cx=-200, cy=-200, tx=-200, ty=-200;
  window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
  (function move() {
    cx = lerp(cx, tx, 0.08); cy = lerp(cy, ty, 0.08);
    glow.style.left = cx + 'px'; glow.style.top = cy + 'px';
    requestAnimationFrame(move);
  })();
}

/* ──────────────────────────────────────────────
   8. SCROLL SPY
────────────────────────────────────────────── */
const navAnchors = document.querySelectorAll('.nav-links a');
(function() {
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting)
        navAnchors.forEach(a => {
          a.style.color = a.getAttribute('href') === '#' + e.target.id ? 'var(--cyan)' : '';
        });
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('section[id]').forEach(s => spy.observe(s));
})();

/* ──────────────────────────────────────────────
   9. COUNT-UP
────────────────────────────────────────────── */
(function() {
  function animateCount(el, target, suffix) {
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / 1400, 1);
      el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target, raw = el.dataset.count;
      if (raw) animateCount(el, +raw, el.dataset.suffix || '');
      io.unobserve(el);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.stat-num').forEach(el => {
    const m = el.textContent.trim().match(/^(\d+)(.*)$/);
    if (!m) return;
    el.dataset.count = m[1]; el.dataset.suffix = m[2] || '';
    el.textContent = '0' + (m[2] || '');
    io.observe(el);
  });
})();

/* ──────────────────────────────────────────────
   10. MOBILE ORB PARALLAX
────────────────────────────────────────────── */
if (isMobile) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    document.querySelectorAll('.mobile-orb').forEach((o, i) => {
      o.style.transform = `translateY(${y * (0.15 + i * 0.07)}px)`;
    });
  });
}
