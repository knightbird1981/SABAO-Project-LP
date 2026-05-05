/* ============================================================
   PARTICLE BIRD LP — Main Script
   Three.js particles + Scroll Reveal + Nav + UX interactions
============================================================ */

'use strict';

/* ──────────────────────────────────────────────
   0. UTILITY
────────────────────────────────────────────── */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const isMobile = window.innerWidth < 768;

/* ──────────────────────────────────────────────
   1. THREE.JS  —  PARTICLE BIRD
────────────────────────────────────────────── */
if (!isMobile) {

  const canvas   = document.getElementById('webgl');
  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  /* --- SVG path → Float32Array of 3D positions --- */
  function getPointsFromSVG(path, numPoints = 9000) {
    const length = path.getTotalLength();
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const p = path.getPointAtLength((i / numPoints) * length);
      points.push(
        (p.x - 250) / 100,
        (250 - p.y) / 100,
        (Math.random() - 0.5) * 1.5
      );
    }
    return new Float32Array(points);
  }

  const svgPath        = document.getElementById('birdPath');
  const targetPositions  = getPointsFromSVG(svgPath, 9000);
  const randomPositions  = new Float32Array(targetPositions.length);
  for (let i = 0; i < randomPositions.length; i++) {
    randomPositions[i] = (Math.random() - 0.5) * 12;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(targetPositions), 3));

  /* --- Shader Material --- */
  const material = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime:    { value: 0 },
      uScroll:  { value: 0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uScroll;
      varying float vDistance;
      varying float vY;

      void main() {
        vec3 pos = position;

        // organic life-like sway
        pos.x += sin(pos.y * 3.0 + uTime * 1.1) * 0.025;
        pos.y += cos(pos.x * 2.5 + uTime * 0.9) * 0.025;
        pos.z += sin(pos.x * 2.0 + uTime * 0.7) * 0.015;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float size = 5.0 / -mvPosition.z;
        gl_PointSize = size;

        vDistance = -mvPosition.z;
        vY = pos.y;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vDistance;
      varying float vY;

      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;

        float alpha = 1.0 - dist * 2.0;
        alpha *= 0.85;

        // Cyan → Purple gradient based on vertical position
        float t = clamp((vY + 1.5) / 3.0, 0.0, 1.0);
        vec3 colorA = vec3(0.0, 0.9, 1.0);    // cyan
        vec3 colorB = vec3(0.6, 0.36, 0.98);  // purple
        vec3 colorC = vec3(0.22, 1.0, 0.08);  // green accent
        vec3 color  = mix(mix(colorA, colorB, t), colorC, dist * 0.4);

        gl_FragColor = vec4(color, alpha);
      }
    `
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  /* --- State --- */
  let progress  = 1;
  let direction = -1;
  let lastMove  = Date.now();
  let scrollY   = 0;
  let mouse     = { x: 0, y: 0 };

  window.addEventListener('mousemove', e => {
    direction = -1;
    lastMove  = Date.now();
    mouse.x   = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouse.y   = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
  });

  /* --- Animation Loop --- */
  function animate() {
    requestAnimationFrame(animate);
    const now = Date.now();
    material.uniforms.uTime.value   += 0.028;
    material.uniforms.uScroll.value  = scrollY * 0.001;

    // Auto-scatter when idle
    if (now - lastMove > 2500) direction = 1;

    progress = clamp(progress + 0.007 * direction, 0, 1);

    // Lerp positions (scatter ↔ bird)
    const pos = geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i]     = lerp(randomPositions[i],     targetPositions[i],     progress);
      pos[i + 1] = lerp(randomPositions[i + 1], targetPositions[i + 1], progress);
      pos[i + 2] = lerp(randomPositions[i + 2], targetPositions[i + 2], progress);
    }
    geometry.attributes.position.needsUpdate = true;

    // Gentle mouse parallax for camera
    camera.position.x += (mouse.x * 0.3 - camera.position.x) * 0.03;
    camera.position.y += (-mouse.y * 0.2 - camera.position.y) * 0.03;
    camera.position.z  = 5 + scrollY * 0.0015;

    // Slow rotation
    particles.rotation.y += 0.0006;
    particles.rotation.x  = scrollY * 0.0003;

    renderer.render(scene, camera);
  }
  animate();

  /* --- Resize --- */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ──────────────────────────────────────────────
   2. NAVIGATION
────────────────────────────────────────────── */
const nav = document.getElementById('nav');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

/* --- Hamburger / Mobile Menu --- */
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('active', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

// Close on link click
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
    const offset = 72; // nav height
    const top    = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ──────────────────────────────────────────────
   4. SCROLL REVEAL  (IntersectionObserver)
────────────────────────────────────────────── */
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Don't unobserve so re-entering also triggers
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ──────────────────────────────────────────────
   5. CARD BAR ANIMATION TRIGGER
────────────────────────────────────────────── */
// Animate skill bars when intro card becomes visible
const cardBarObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.card-bar').forEach((bar, i) => {
          bar.style.transitionDelay = `${i * 0.15}s`;
          bar.style.opacity = '1';
          bar.style.animation = `barGrow 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.15}s forwards`;
        });
        cardBarObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.3 }
);
document.querySelectorAll('.intro-card').forEach(card => cardBarObserver.observe(card));

/* Portfolio bar chart */
const pvBarObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.pv-bar').forEach((bar, i) => {
          bar.style.transitionDelay = `${i * 0.1}s`;
          bar.style.opacity = '1';
          bar.style.animation = `barGrow 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s forwards`;
        });
        pvBarObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.4 }
);
document.querySelectorAll('.pv-3').forEach(el => pvBarObserver.observe(el));

/* ──────────────────────────────────────────────
   6. HERO SCROLL HINT — FADE ON SCROLL
────────────────────────────────────────────── */
const scrollHint = document.querySelector('.hero-scroll-hint');
if (scrollHint) {
  window.addEventListener('scroll', () => {
    scrollHint.style.opacity = clamp(1 - window.scrollY / 120, 0, 1).toString();
  });
}

/* ──────────────────────────────────────────────
   7. CONTACT FORM
────────────────────────────────────────────── */
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();

    const btn     = contactForm.querySelector('.btn-submit');
    const btnText = btn.querySelector('.btn-submit-text');
    const original = btnText.textContent;

    // Loading state
    btn.disabled       = true;
    btnText.textContent = '送信中...';
    btn.style.opacity   = '0.7';

    // Simulate async send (replace with real fetch / Formspree etc.)
    setTimeout(() => {
      contactForm.style.display = 'none';
      formSuccess.classList.add('show');

      // Scroll into view
      formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Reset after 8 seconds
      setTimeout(() => {
        formSuccess.classList.remove('show');
        contactForm.style.display = '';
        contactForm.reset();
        btn.disabled        = false;
        btnText.textContent = original;
        btn.style.opacity   = '1';
      }, 8000);
    }, 1400);
  });

  // Focus glow enhancement
  contactForm.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('focus', () => {
      field.closest('.form-group').style.setProperty('--focus-glow', '1');
    });
    field.addEventListener('blur', () => {
      field.closest('.form-group').style.removeProperty('--focus-glow');
    });
  });
}

/* ──────────────────────────────────────────────
   8. SUBTLE CURSOR GLOW  (PC only)
────────────────────────────────────────────── */
if (!isMobile) {
  const glow = document.createElement('div');
  glow.id = 'cursor-glow';
  Object.assign(glow.style, {
    position:      'fixed',
    width:         '400px',
    height:        '400px',
    borderRadius:  '50%',
    background:    'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex:        '1',
    transform:     'translate(-50%, -50%)',
    transition:    'left 0.15s linear, top 0.15s linear',
    top:           '-200px',
    left:          '-200px',
  });
  document.body.appendChild(glow);

  let curX = -200, curY = -200;
  let tgtX = -200, tgtY = -200;

  window.addEventListener('mousemove', e => {
    tgtX = e.clientX;
    tgtY = e.clientY;
  });

  (function moveCursor() {
    curX = lerp(curX, tgtX, 0.08);
    curY = lerp(curY, tgtY, 0.08);
    glow.style.left = curX + 'px';
    glow.style.top  = curY + 'px';
    requestAnimationFrame(moveCursor);
  })();
}

/* ──────────────────────────────────────────────
   9. ACTIVE NAV LINK  (scroll spy)
────────────────────────────────────────────── */
const sections   = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');

const spyObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navAnchors.forEach(a => {
          const active = a.getAttribute('href') === '#' + id;
          a.style.color = active ? 'var(--cyan)' : '';
        });
      }
    });
  },
  { threshold: 0.4 }
);
sections.forEach(s => spyObserver.observe(s));

/* ──────────────────────────────────────────────
   10. STAT NUMBER  COUNT-UP ANIMATION
────────────────────────────────────────────── */
function animateCount(el, target, suffix, duration = 1400) {
  let start = null;
  const step = ts => {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3); // cubic ease-out
    const current  = Math.round(ease * target);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const statObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el   = entry.target;
      const raw  = el.dataset.count;
      const sfx  = el.dataset.suffix || '';
      if (!raw) return;
      animateCount(el, parseInt(raw, 10), sfx);
      statObserver.unobserve(el);
    });
  },
  { threshold: 0.6 }
);

// Tag stat elements with data attributes
document.querySelectorAll('.stat-num').forEach(el => {
  const text = el.textContent.trim();
  const match = text.match(/^(\d+)(.*)$/);
  if (!match) return;

  const num = parseInt(match[1], 10);
  const sfx = match[2] || '';
  el.dataset.count   = num;
  el.dataset.suffix  = sfx;
  el.textContent     = '0' + sfx;

  statObserver.observe(el);
});

/* ──────────────────────────────────────────────
   11. MOBILE BACKGROUND  (parallax shimmer)
────────────────────────────────────────────── */
if (isMobile) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    document.querySelectorAll('.mobile-orb').forEach((orb, i) => {
      const speed = 0.15 + i * 0.07;
      orb.style.transform = `translateY(${y * speed}px)`;
    });
  });
}
