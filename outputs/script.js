/* ============================================================
   SABAO Project LP — Main Script
   Pure Canvas 2D Particles (no Three.js) + UX interactions
============================================================ */

'use strict';

const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const isMobile = window.innerWidth < 768;

/* ──────────────────────────────────────────────
   1. CANVAS 2D  PARTICLE BIRD
────────────────────────────────────────────── */
(function initParticles() {
  if (isMobile) return;

  const canvas = document.getElementById('webgl');
  const ctx    = canvas.getContext('2d');

  let W = window.innerWidth;
  let H = window.innerHeight;
  canvas.width  = W;
  canvas.height = H;

  /* --- SVG path → 2D points (cx/cy centred) --- */
  function sampleSVGPath(numPoints) {
    const path   = document.getElementById('birdPath');
    const len    = path.getTotalLength();
    const pts    = [];
    for (let i = 0; i < numPoints; i++) {
      const p = path.getPointAtLength((i / numPoints) * len);
      // map SVG 0–500 → canvas-centred coords
      pts.push({
        tx: (p.x - 250) / 500 * W * 0.7,
        ty: (p.y - 250) / 500 * H * 0.5,
        rx: (Math.random() - 0.5) * W * 1.4,
        ry: (Math.random() - 0.5) * H * 1.2,
        x:  (Math.random() - 0.5) * W * 1.4,
        y:  (Math.random() - 0.5) * H * 1.2,
        // per-particle colour phase
        phase: Math.random() * Math.PI * 2,
        size:  Math.random() * 1.5 + 0.8,
      });
    }
    return pts;
  }

  const NUM    = 8000;
  const pts    = sampleSVGPath(NUM);

  /* --- State --- */
  let progress = 1;
  let dir      = -1;
  let lastMove = Date.now();
  let scrollY  = 0;
  let mouseX   = 0, mouseY   = 0;
  let rotAngle = 0;
  let time     = 0;

  window.addEventListener('mousemove', e => {
    dir      = -1;
    lastMove = Date.now();
    mouseX   = (e.clientX / W - 0.5) * 2;
    mouseY   = (e.clientY / H - 0.5) * 2;
  });
  window.addEventListener('scroll', () => { scrollY = window.scrollY; });

  window.addEventListener('resize', () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;
    // Recalculate target positions for new viewport
    const path = document.getElementById('birdPath');
    const len  = path.getTotalLength();
    pts.forEach((p, i) => {
      const sp = path.getPointAtLength((i / NUM) * len);
      p.tx = (sp.x - 250) / 500 * W * 0.7;
      p.ty = (sp.y - 250) / 500 * H * 0.5;
    });
  });

  /* --- Draw a single glowing particle --- */
  function drawParticle(x, y, size, t) {
    // colour: cyan→purple based on time + phase
    const mix   = (Math.sin(t * 1.2 + pts[0]?.phase || 0) + 1) * 0.5;
    const r     = Math.round(lerp(0,   155, mix));
    const g     = Math.round(lerp(229, 92,  mix));
    const b     = Math.round(lerp(255, 246, mix));
    const alpha = 0.7;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
    grad.addColorStop(0,   `rgba(${r},${g},${b},${alpha})`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.5})`);
    grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /* --- Animation loop --- */
  function animate() {
    requestAnimationFrame(animate);
    time += 0.025;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Auto-scatter when idle
    if (Date.now() - lastMove > 2500) dir = 1;
    progress = clamp(progress + 0.007 * dir, 0, 1);

    // Slow rotation
    rotAngle += 0.0006;

    // Camera parallax offset
    const offX = W / 2 + mouseX * 30 + scrollY * 0.05;
    const offY = H / 2 + mouseY * 20;

    ctx.save();
    ctx.translate(offX, offY);
    ctx.rotate(rotAngle);

    for (let i = 0; i < NUM; i++) {
      const p = pts[i];

      // Lerp position
      p.x = lerp(p.x, lerp(p.rx, p.tx, progress), 0.06);
      p.y = lerp(p.y, lerp(p.ry, p.ty, progress), 0.06);

      // Organic sway
      const sx = p.x + Math.sin(p.y * 0.012 + time) * 2.5;
      const sy = p.y + Math.cos(p.x * 0.010 + time) * 2.5;

      // Depth-based size (simulate 3D)
      const z    = Math.sin(p.phase + time * 0.5) * 0.5 + 1;
      const size = p.size * z;

      drawParticle(sx, sy, size, time + p.phase);
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

/* Card bars */
const cardBarObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.querySelectorAll('.card-bar').forEach((bar, i) => {
      bar.style.transitionDelay = `${i * 0.15}s`;
      bar.style.opacity = '1';
      bar.style.animation = `barGrow 1.2s cubic-bezier(0.16,1,0.3,1) ${i*0.15}s forwards`;
    });
    cardBarObserver.unobserve(entry.target);
  });
}, { threshold: 0.3 });
document.querySelectorAll('.intro-card').forEach(c => cardBarObserver.observe(c));

/* Portfolio bars */
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
    btn.disabled = true;
    txt.textContent = '送信中...';
    btn.style.opacity = '0.7';

    setTimeout(() => {
      contactForm.style.display = 'none';
      formSuccess.classList.add('show');
      formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        formSuccess.classList.remove('show');
        contactForm.style.display = '';
        contactForm.reset();
        btn.disabled = false;
        txt.textContent = '送信する';
        btn.style.opacity = '1';
      }, 8000);
    }, 1400);
  });
}

/* ──────────────────────────────────────────────
   7. CURSOR GLOW (PC only)
────────────────────────────────────────────── */
if (!isMobile) {
  const glow = document.createElement('div');
  glow.id = 'cursor-glow';
  Object.assign(glow.style, {
    position: 'fixed', width: '400px', height: '400px',
    borderRadius: '50%', pointerEvents: 'none', zIndex: '1',
    transform: 'translate(-50%,-50%)',
    background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)',
    top: '-200px', left: '-200px',
  });
  document.body.appendChild(glow);

  let cx = -200, cy = -200, tx = -200, ty = -200;
  window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
  (function moveCursor() {
    cx = lerp(cx, tx, 0.08);
    cy = lerp(cy, ty, 0.08);
    glow.style.left = cx + 'px';
    glow.style.top  = cy + 'px';
    requestAnimationFrame(moveCursor);
  })();
}

/* ──────────────────────────────────────────────
   8. SCROLL SPY (active nav)
────────────────────────────────────────────── */
const navAnchors = document.querySelectorAll('.nav-links a');
const spyObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navAnchors.forEach(a => {
        a.style.color = a.getAttribute('href') === '#' + entry.target.id ? 'var(--cyan)' : '';
      });
    }
  });
}, { threshold: 0.4 });
document.querySelectorAll('section[id]').forEach(s => spyObserver.observe(s));

/* ──────────────────────────────────────────────
   9. COUNT-UP ANIMATION
────────────────────────────────────────────── */
function animateCount(el, target, suffix, duration = 1400) {
  let start = null;
  (function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(e * target) + suffix;
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
}

const statObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el  = entry.target;
    const raw = el.dataset.count;
    if (!raw) return;
    animateCount(el, parseInt(raw, 10), el.dataset.suffix || '');
    statObserver.unobserve(el);
  });
}, { threshold: 0.6 });

document.querySelectorAll('.stat-num').forEach(el => {
  const m = el.textContent.trim().match(/^(\d+)(.*)$/);
  if (!m) return;
  el.dataset.count  = m[1];
  el.dataset.suffix = m[2] || '';
  el.textContent    = '0' + (m[2] || '');
  statObserver.observe(el);
});

/* ──────────────────────────────────────────────
   10. MOBILE ORB PARALLAX
────────────────────────────────────────────── */
if (isMobile) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    document.querySelectorAll('.mobile-orb').forEach((orb, i) => {
      orb.style.transform = `translateY(${y * (0.15 + i * 0.07)}px)`;
    });
  });
}
