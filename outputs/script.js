/* ============================================================
   SABAO Project LP — Main Script  (Optimised Canvas 2D)
   Sprite-based particles, additive blending — no Three.js
============================================================ */

'use strict';

const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const isMobile = window.innerWidth < 768;

/* ──────────────────────────────────────────────
   1. CANVAS 2D PARTICLE BIRD  (high-performance)
────────────────────────────────────────────── */
(function initParticles() {
  if (isMobile) return;

  const canvas = document.getElementById('webgl');
  const ctx    = canvas.getContext('2d');

  let W = window.innerWidth;
  let H = window.innerHeight;
  canvas.width  = W;
  canvas.height = H;

  /* ---- Pre-render particle sprites (created ONCE) ---- */
  function makeSprite(r, g, b, radius) {
    const c   = document.createElement('canvas');
    const dia = radius * 2;
    c.width   = dia;
    c.height  = dia;
    const sc  = c.getContext('2d');
    const grd = sc.createRadialGradient(radius, radius, 0, radius, radius, radius);
    grd.addColorStop(0,   `rgba(${r},${g},${b},1)`);
    grd.addColorStop(0.4, `rgba(${r},${g},${b},0.5)`);
    grd.addColorStop(1,   `rgba(${r},${g},${b},0)`);
    sc.fillStyle = grd;
    sc.fillRect(0, 0, dia, dia);
    return c;
  }

  const SPRITE_R  = 6;                              // particle radius px
  const spriteCyan   = makeSprite(0,   229, 255, SPRITE_R);
  const spritePurple = makeSprite(155, 92,  246, SPRITE_R);
  const spriteGreen  = makeSprite(57,  255, 20,  SPRITE_R);

  /* ---- Sample SVG path → particle array ---- */
  const NUM = 4000;   // 8000→4000: half the particles, same visual density

  function buildParticles() {
    const path = document.getElementById('birdPath');
    const len  = path.getTotalLength();
    const arr  = new Array(NUM);
    for (let i = 0; i < NUM; i++) {
      const p = path.getPointAtLength((i / NUM) * len);
      arr[i] = {
        tx: (p.x - 250) / 500 * W * 0.7,
        ty: (p.y - 250) / 500 * H * 0.5,
        rx: (Math.random() - 0.5) * W * 1.4,
        ry: (Math.random() - 0.5) * H * 1.2,
        x:  (Math.random() - 0.5) * W * 1.4,
        y:  (Math.random() - 0.5) * H * 1.2,
        phase: Math.random() * Math.PI * 2,
        // assign sprite once: 70% cyan, 20% purple, 10% green
        sprite: i % 10 < 7 ? spriteCyan : i % 10 < 9 ? spritePurple : spriteGreen,
      };
    }
    return arr;
  }

  let pts = buildParticles();

  /* ---- State ---- */
  // progress=0: scattered  /  progress=1: bird formed
  let progress = 0;   // start scattered
  let dir      = 0;
  let lastMove = 0;   // 0 = never moved → start scattered
  let scrollY  = 0, mouseX = 0, mouseY = 0;
  let rotAngle = 0, time   = 0;

  window.addEventListener('mousemove', e => {
    dir      = 1;           // mouse moves → FORM bird
    lastMove = Date.now();
    mouseX   = (e.clientX / W - 0.5) * 2;
    mouseY   = (e.clientY / H - 0.5) * 2;
  });
  window.addEventListener('scroll', () => { scrollY = window.scrollY; });
  window.addEventListener('resize', () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    pts = buildParticles();
  });

  /* ---- Render loop ---- */
  const MORPH_SPEED = 0.018;  // morph speed (was 0.007, now faster)

  function animate() {
    requestAnimationFrame(animate);
    time += 0.022;

    ctx.clearRect(0, 0, W, H);

    // Idle 2.5s → scatter; mouse active → form bird
    if (lastMove > 0 && Date.now() - lastMove > 2500) dir = -1;
    progress = clamp(progress + MORPH_SPEED * dir, 0, 1);
    rotAngle += 0.0005;

    const offX = W / 2 + mouseX * 25 + scrollY * 0.04;
    const offY = H / 2 + mouseY * 18;

    ctx.save();
    ctx.translate(offX, offY);
    ctx.rotate(rotAngle);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < NUM; i++) {
      const p = pts[i];

      // Direct lerp → no double-smoothing lag
      const sx = lerp(p.rx, p.tx, progress) + Math.sin(p.phase + time) * 2.5;
      const sy = lerp(p.ry, p.ty, progress) + Math.cos(p.phase + time * 0.8) * 2.5;

      ctx.globalAlpha = 0.55 + Math.sin(p.phase + time * 0.6) * 0.2;
      ctx.drawImage(p.sprite, sx - SPRITE_R, sy - SPRITE_R);
    }

    ctx.restore();
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
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('active', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});
document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('active');
    document.body.style.overflow = '';
  });
});

/* ──────────────────────────────────────────────
   3. SMOOTH SCROLL
────────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' });
  });
});

/* ──────────────────────────────────────────────
   4. SCROLL REVEAL
────────────────────────────────────────────── */
const revealObserver = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

const cardBarObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.querySelectorAll('.card-bar').forEach((bar, i) => {
      bar.style.animation = `barGrow 1.2s cubic-bezier(0.16,1,0.3,1) ${i*0.15}s forwards`;
      bar.style.opacity = '1';
    });
    cardBarObserver.unobserve(entry.target);
  });
}, { threshold: 0.3 });
document.querySelectorAll('.intro-card').forEach(c => cardBarObserver.observe(c));

const pvBarObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.querySelectorAll('.pv-bar').forEach((bar, i) => {
      bar.style.opacity = '1';
      bar.style.animation = `barGrow 0.9s cubic-bezier(0.16,1,0.3,1) ${i*0.1}s forwards`;
    });
    pvBarObserver.unobserve(entry.target);
  });
}, { threshold: 0.4 });
document.querySelectorAll('.pv-3').forEach(el => pvBarObserver.observe(el));

/* ──────────────────────────────────────────────
   5. HERO SCROLL HINT FADE
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
   7. CURSOR GLOW (PC only)
────────────────────────────────────────────── */
if (!isMobile) {
  const glow = document.createElement('div');
  Object.assign(glow.style, {
    position:'fixed', width:'400px', height:'400px', borderRadius:'50%',
    pointerEvents:'none', zIndex:'1', transform:'translate(-50%,-50%)',
    background:'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)',
    top:'-200px', left:'-200px',
  });
  document.body.appendChild(glow);
  let cx=-200,cy=-200,tx=-200,ty=-200;
  window.addEventListener('mousemove', e => { tx=e.clientX; ty=e.clientY; });
  (function move() {
    cx=lerp(cx,tx,0.08); cy=lerp(cy,ty,0.08);
    glow.style.left=cx+'px'; glow.style.top=cy+'px';
    requestAnimationFrame(move);
  })();
}

/* ──────────────────────────────────────────────
   8. SCROLL SPY
────────────────────────────────────────────── */
const navAnchors = document.querySelectorAll('.nav-links a');
new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting)
      navAnchors.forEach(a => {
        a.style.color = a.getAttribute('href') === '#'+e.target.id ? 'var(--cyan)' : '';
      });
  });
}, { threshold: 0.4 }).observe(document.querySelectorAll('section[id]'));

/* ──────────────────────────────────────────────
   9. COUNT-UP
────────────────────────────────────────────── */
function animateCount(el, target, suffix) {
  const start = performance.now();
  (function step(now) {
    const p = Math.min((now - start) / 1400, 1);
    el.textContent = Math.round((1-(1-p)**3) * target) + suffix;
    if (p < 1) requestAnimationFrame(step);
  })(start);
}
new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target, raw = el.dataset.count;
    if (raw) animateCount(el, +raw, el.dataset.suffix || '');
  });
}, { threshold: 0.6 }).observe(document.querySelectorAll('.stat-num'));

document.querySelectorAll('.stat-num').forEach(el => {
  const m = el.textContent.trim().match(/^(\d+)(.*)$/);
  if (!m) return;
  el.dataset.count = m[1]; el.dataset.suffix = m[2]||'';
  el.textContent = '0'+(m[2]||'');
});

/* ──────────────────────────────────────────────
   10. MOBILE ORB PARALLAX
────────────────────────────────────────────── */
if (isMobile) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    document.querySelectorAll('.mobile-orb').forEach((o,i) => {
      o.style.transform = `translateY(${y*(0.15+i*0.07)}px)`;
    });
  });
}
