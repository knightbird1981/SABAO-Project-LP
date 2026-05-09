/* ============================================================
   SABAO Project LP — script.js
   ・カーソル周辺250px以内の粒子のみ収束
   ・範囲外の粒子は画面上をゆっくり漂流
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
  const NUM         = 3500;
  const CLUSTER_R   = 50;   // 収束時のクラスター半径 (px)
  const EFFECT_R    = 300;  // カーソルの有効影響半径 (px)

  function buildParticles() {
    const arr = [];
    for (let i = 0; i < NUM; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = Math.sqrt(Math.random()) * CLUSTER_R;

      // ホーム位置：画面全体（±10%の余白含む）にランダム配置
      const hx = (Math.random() * 1.2 - 0.1) * W;
      const hy = (Math.random() * 1.2 - 0.1) * H;

      arr.push({
        // 収束時：カーソルからのオフセット
        cox: Math.cos(angle) * dist,
        coy: Math.sin(angle) * dist,

        // ホーム位置（漂流の基点）
        hx, hy,

        // 現在位置（初期はホーム付近）
        x: hx + (Math.random() - 0.5) * 100,
        y: hy + (Math.random() - 0.5) * 100,

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
  let lockedX      = -9999, lockedY = -9999; // 収束先（マウスが止まった座標）
  let converging   = false;
  let cursorInside = false; // ウィンドウ内にカーソルがあるか
  let stopTimer    = null;
  let time         = 0;

  /* マウスがウィンドウ内を動いている間 */
  window.addEventListener('mousemove', e => {
    cursorInside = true;

    // マウスが動き出したら即拡散
    if (converging) converging = false;

    // 止まってから 250ms 後に収束先を固定（ウィンドウ内のみ）
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => {
      if (!cursorInside) return; // ウィンドウ外なら収束しない
      lockedX    = e.clientX;
      lockedY    = e.clientY;
      converging = true;
    }, 250);
  });

  /* カーソルがウィンドウ外へ出た → 強制拡散 */
  document.addEventListener('mouseleave', () => {
    cursorInside = false;
    converging   = false;
    clearTimeout(stopTimer);
  });

  /* カーソルがウィンドウ内に戻った */
  document.addEventListener('mouseenter', () => {
    cursorInside = true;
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

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < NUM; i++) {
      const p = pts[i];

      /* ホーム位置での漂流（常時ベース） */
      const driftX = p.hx + Math.sin(p.phase * 1.7 + time * 0.18) * 40;
      const driftY = p.hy + Math.cos(p.phase * 1.3 + time * 0.14) * 40;

      let tx, ty, spd;

      if (converging) {
        /* カーソルとホーム位置の距離を計算 */
        const dx   = p.hx - lockedX;
        const dy   = p.hy - lockedY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < EFFECT_R) {
          /* 距離に応じた収束強度（べき乗カーブ：近いほど強く、遠いほど弱い） */
          const strength = Math.pow(1 - dist / EFFECT_R, 1.8);

          /* 収束先とホーム漂流をstrengthでブレンド */
          tx  = lerp(driftX, lockedX + p.cox, strength);
          ty  = lerp(driftY, lockedY + p.coy, strength);
          spd = 0.025 + strength * 0.02; // 近いほどやや速く収束
        } else {
          /* 有効範囲外 → ホームで漂流 */
          tx  = driftX;
          ty  = driftY;
          spd = 0.04;
        }
      } else {
        /* 拡散中（カーソル移動 or ウィンドウ外）→ 全粒子がホームで漂流 */
        tx  = driftX;
        ty  = driftY;
        spd = 0.05;
      }

      p.x = lerp(p.x, tx, spd);
      p.y = lerp(p.y, ty, spd);

      /* 有機的な揺らぎ（常時） */
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
/* ▶ Formspree のフォーム ID を差し替えてください
   　 例: 'https://formspree.io/f/xpwzabcd' */
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mzdogkpr';

const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');
if (contactForm) {
  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = contactForm.querySelector('.btn-submit');
    const txt = btn.querySelector('.btn-submit-text');
    btn.disabled = true; txt.textContent = '送信中...'; btn.style.opacity = '0.7';

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        contactForm.style.display = 'none';
        formSuccess.classList.add('show');
        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          formSuccess.classList.remove('show');
          contactForm.style.display = '';
          contactForm.reset();
          btn.disabled = false; txt.textContent = '送信する'; btn.style.opacity = '1';
        }, 8000);
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data.errors ? data.errors.map(e => e.message).join(', ') : '送信に失敗しました。';
        alert('エラー: ' + msg);
        btn.disabled = false; txt.textContent = '送信する'; btn.style.opacity = '1';
      }
    } catch (err) {
      alert('ネットワークエラーが発生しました。時間をおいて再度お試しください。');
      btn.disabled = false; txt.textContent = '送信する'; btn.style.opacity = '1';
    }
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
