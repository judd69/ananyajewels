(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  let mouse = { x: 0, y: 0, rawX: 0, rawY: 0 };
  let cursorRingPos = { x: 0, y: 0 };
  let isLoaded = false;
  let heroScene, heroCamera, heroRenderer, heroParticles, heroFrame;
  let cartCount = 0;

  function initNoise() {
    const canvas = $('#noise-canvas');
    const ctx = canvas.getContext('2d');
    let frame = 0;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function drawNoise() {
      frame++;
      if (frame % 3 === 0) {
        const { width, height } = canvas;
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const v = Math.random() * 255;
          data[i] = v;
          data[i + 1] = v;
          data[i + 2] = v;
          data[i + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);
      }
      requestAnimationFrame(drawNoise);
    }
    drawNoise();
  }

  function initCursor() {
    const dot = $('#cursor-dot');
    const ring = $('#cursor-ring');

    window.addEventListener('mousemove', (e) => {
      mouse.rawX = e.clientX;
      mouse.rawY = e.clientY;
      dot.style.left = e.clientX + 'px';
      dot.style.top = e.clientY + 'px';
    });

    function animateCursor() {
      cursorRingPos.x = lerp(cursorRingPos.x, mouse.rawX, 0.08);
      cursorRingPos.y = lerp(cursorRingPos.y, mouse.rawY, 0.08);
      ring.style.left = cursorRingPos.x + 'px';
      ring.style.top = cursorRingPos.y + 'px';
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    function refreshHoverTargets() {
      document.querySelectorAll('.magnetic, .nav-link, .filter-btn, .btn-add-cart, .featured-card, .work-card').forEach(el => {
        el.removeEventListener('mouseenter', addHover);
        el.removeEventListener('mouseleave', removeHover);
        el.addEventListener('mouseenter', addHover);
        el.addEventListener('mouseleave', removeHover);
      });
    }

    function addHover() { document.body.classList.add('cursor-hover'); }
    function removeHover() { document.body.classList.remove('cursor-hover'); }

    refreshHoverTargets();
  }

  function initPreloader() {
    return new Promise((resolve) => {
      const preloader = $('#preloader');
      const bar = $('#preloader-bar');
      const num = $('#preloader-num');
      const duration = 2400;
      const start = performance.now();

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const count = Math.floor(eased * 100);
        bar.style.width = count + '%';
        num.textContent = count;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          num.textContent = '100';
          bar.style.width = '100%';
          setTimeout(() => {
            preloader.classList.add('hidden');
            resolve();
          }, 500);
        }
      }

      requestAnimationFrame(update);
    });
  }

  function initHeroCanvas() {
    const canvas = $('#hero-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    heroRenderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    heroRenderer.setSize(W, H);
    heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    heroRenderer.setClearColor(0x000000, 0);

    heroScene = new THREE.Scene();
    heroCamera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    heroCamera.position.set(0, 0, 80);

    const count = 10000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = Math.random();

      if (r < 0.3) {
        const angle = Math.random() * Math.PI * 2;
        const torusR = 28 + (Math.random() - 0.5) * 10;
        const tubeR = (Math.random() - 0.5) * 6;
        positions[i3] = Math.cos(angle) * torusR + tubeR;
        positions[i3 + 1] = Math.sin(angle) * torusR + tubeR;
        positions[i3 + 2] = (Math.random() - 0.5) * 12;
      } else if (r < 0.5) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const rad = 14 + Math.random() * 6;
        positions[i3] = rad * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = rad * Math.cos(phi);
      } else {
        positions[i3] = (Math.random() - 0.5) * 200;
        positions[i3 + 1] = (Math.random() - 0.5) * 200;
        positions[i3 + 2] = (Math.random() - 0.5) * 160;
      }

      const hue = Math.random();
      if (hue < 0.4) {
        colors[i3] = 0.83 + Math.random() * 0.1;
        colors[i3 + 1] = 0.66 + Math.random() * 0.15;
        colors[i3 + 2] = 0.32 + Math.random() * 0.1;
      } else if (hue < 0.65) {
        colors[i3] = 0.72 + Math.random() * 0.15;
        colors[i3 + 1] = 0.43 + Math.random() * 0.15;
        colors[i3 + 2] = 0.47 + Math.random() * 0.1;
      } else if (hue < 0.85) {
        colors[i3] = 0.95 + Math.random() * 0.05;
        colors[i3 + 1] = 0.88 + Math.random() * 0.1;
        colors[i3 + 2] = 0.75 + Math.random() * 0.15;
      } else {
        colors[i3] = 0.6 + Math.random() * 0.3;
        colors[i3 + 1] = 0.5 + Math.random() * 0.3;
        colors[i3 + 2] = 0.4 + Math.random() * 0.3;
      }

      sizes[i] = Math.random() * 2.5 + 0.3;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uTime;
        uniform vec2 uMouse;
        void main() {
          vColor = color;
          vec3 pos = position;
          pos.x += sin(pos.y * 0.035 + uTime * 0.25) * 1.8;
          pos.y += cos(pos.x * 0.035 + uTime * 0.2) * 1.8;
          pos.z += sin(pos.x * 0.025 + uTime * 0.15) * 1.2;
          pos.x += uMouse.x * (pos.z * 0.015 + 1.0) * 3.5;
          pos.y += uMouse.y * (pos.z * 0.015 + 1.0) * 3.5;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (180.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float dist = length(uv);
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.15, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    heroParticles = new THREE.Points(geo, mat);
    heroScene.add(heroParticles);

    const glowGeo = new THREE.SphereGeometry(10, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPos = position;
          vec3 pos = position;
          pos += normal * sin(uTime * 1.2 + position.y * 0.5) * 0.6;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        uniform float uTime;
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
          vec3 gold = vec3(0.83, 0.66, 0.33);
          vec3 rose = vec3(0.72, 0.44, 0.47);
          vec3 col = mix(gold, rose, sin(uTime * 0.4) * 0.5 + 0.5);
          gl_FragColor = vec4(col * fresnel * 1.2, fresnel * 0.4);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowSphere = new THREE.Mesh(glowGeo, glowMat);
    heroScene.add(glowSphere);

    window.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('resize', () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      heroCamera.aspect = W / H;
      heroCamera.updateProjectionMatrix();
      heroRenderer.setSize(W, H);
    });

    let clock = 0;
    function heroAnimate() {
      heroFrame = requestAnimationFrame(heroAnimate);
      clock += 0.006;

      mat.uniforms.uTime.value = clock;
      glowMat.uniforms.uTime.value = clock;
      mat.uniforms.uMouse.value.set(
        lerp(mat.uniforms.uMouse.value.x, mouse.x, 0.035),
        lerp(mat.uniforms.uMouse.value.y, mouse.y, 0.035)
      );

      heroParticles.rotation.y = clock * 0.03;
      heroParticles.rotation.x = clock * 0.015;
      glowSphere.rotation.y = clock * 0.25;
      glowSphere.rotation.x = clock * 0.15;

      heroCamera.position.x = lerp(heroCamera.position.x, mouse.x * 6, 0.025);
      heroCamera.position.y = lerp(heroCamera.position.y, mouse.y * 4, 0.025);
      heroCamera.lookAt(0, 0, 0);

      heroRenderer.render(heroScene, heroCamera);
    }
    heroAnimate();
  }

  function initAboutCanvas() {
    const canvas = $('#about-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, frame = 0;

    function resize() {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * (window.devicePixelRatio || 1);
      canvas.height = h * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
    resize();

    function draw() {
      frame++;
      ctx.clearRect(0, 0, w, h);

      const t = frame * 0.015;
      const numStrands = 3;
      const points = 100;

      for (let s = 0; s < numStrands; s++) {
        const phaseOffset = (s / numStrands) * Math.PI;
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const px = (i / points) * w;
          const wave = Math.sin((i / points) * Math.PI * 3.5 + t + phaseOffset);
          const py = h / 2 + wave * (h * 0.22);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        if (s === 0) {
          grad.addColorStop(0, 'rgba(212,168,83,0.05)');
          grad.addColorStop(0.5, 'rgba(212,168,83,0.5)');
          grad.addColorStop(1, 'rgba(183,110,121,0.05)');
        } else if (s === 1) {
          grad.addColorStop(0, 'rgba(183,110,121,0.05)');
          grad.addColorStop(0.5, 'rgba(183,110,121,0.4)');
          grad.addColorStop(1, 'rgba(212,168,83,0.05)');
        } else {
          grad.addColorStop(0, 'rgba(232,201,122,0.03)');
          grad.addColorStop(0.5, 'rgba(232,201,122,0.3)');
          grad.addColorStop(1, 'rgba(232,201,122,0.03)');
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        for (let i = 0; i <= points; i += 5) {
          const px = (i / points) * w;
          const wave = Math.sin((i / points) * Math.PI * 3.5 + t + phaseOffset);
          const py = h / 2 + wave * (h * 0.22);
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          const alpha = (Math.sin(t + i * 0.3) * 0.5 + 0.5) * 0.7 + 0.1;
          const colorsArr = [
            `rgba(212,168,83,${alpha})`,
            `rgba(183,110,121,${alpha})`,
            `rgba(232,201,122,${alpha})`
          ];
          ctx.fillStyle = colorsArr[s];
          ctx.fill();
        }
      }

      requestAnimationFrame(draw);
    }
    draw();
  }

  function initReveal() {
    const items = $$('.reveal-item');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    items.forEach(el => observer.observe(el));
  }

  function initCounters() {
    const stats = $$('.stat-num');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.target);
          const dur = 2000;
          const startTime = performance.now();
          function tick(now) {
            const progress = clamp((now - startTime) / dur, 0, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            el.textContent = Math.floor(ease * target);
            if (progress < 1) requestAnimationFrame(tick);
            else el.textContent = target.toLocaleString() + '+';
          }
          requestAnimationFrame(tick);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    stats.forEach(el => observer.observe(el));
  }

  function initNav() {
    const nav = $('#nav');
    const sections = ['home', 'collections', 'about', 'contact'];
    const navLinks = $$('.nav-link');

    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        const target = link.dataset.target;
        const section = $('#' + target);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    const heroCta = $('#hero-cta-btn');
    if (heroCta) {
      heroCta.addEventListener('click', () => {
        $('#collections').scrollIntoView({ behavior: 'smooth' });
      });
    }

    const navLogo = $('.nav-logo');
    if (navLogo) {
      navLogo.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    const sectionEls = sections.map(id => document.getElementById(id)).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(l => {
            l.classList.toggle('active', l.dataset.target === entry.target.id);
          });
        }
      });
    }, { threshold: 0.3 });
    sectionEls.forEach(el => io.observe(el));
  }

  function initWorkFilter() {
    const filters = $$('.filter-btn');
    const cards = $$('.work-card');

    filters.forEach(btn => {
      btn.addEventListener('click', () => {
        filters.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        cards.forEach((card, index) => {
          const show = filter === 'all' || card.dataset.filter === filter;
          card.style.transition = `opacity 0.5s ${index * 0.05}s, transform 0.5s ${index * 0.05}s var(--ease)`;
          card.style.opacity = show ? '1' : '0.08';
          card.style.transform = show ? 'scale(1)' : 'scale(0.96)';
          card.style.pointerEvents = show ? 'all' : 'none';
        });
      });
    });
  }

  function initMagnetic() {
    $$('.magnetic').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) * 0.3;
        const dy = (e.clientY - cy) * 0.3;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  function initGlitch() {
    const headline = $('.hero-headline');
    if (!headline) return;

    setInterval(() => {
      if (Math.random() > 0.88) {
        headline.style.filter = 'blur(0.5px)';
        headline.style.transform = `skewX(${(Math.random() - 0.5) * 1.5}deg)`;
        setTimeout(() => {
          headline.style.filter = '';
          headline.style.transform = '';
        }, 60);
      }
    }, 4000);
  }

  function revealHero() {
    const content = $('.hero-content');
    if (content) content.classList.add('revealed');
    const hint = $('.hero-scroll-hint');
    const year = $('.hero-year');
    if (hint) hint.classList.add('show');
    if (year) year.classList.add('show');
    $('#audio-ui') && ($('#audio-ui').classList.add('visible'));
  }

  function initCardEffects() {
    $$('.work-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--mx', x + '%');
        card.style.setProperty('--my', y + '%');

        const centerX = (e.clientX - rect.left) / rect.width - 0.5;
        const centerY = (e.clientY - rect.top) / rect.height - 0.5;
        const rotateX = centerY * -6;
        const rotateY = centerX * 6;
        card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });

    $$('.featured-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const centerX = (e.clientX - rect.left) / rect.width - 0.5;
        const centerY = (e.clientY - rect.top) / rect.height - 0.5;
        const rotateX = centerY * -4;
        const rotateY = centerX * 4;
        card.style.transform = `perspective(1400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  function initCart() {
    const cartCountEl = $('.cart-count');
    const addButtons = $$('.btn-add-cart');

    addButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        cartCount++;
        if (cartCountEl) cartCountEl.textContent = cartCount;

        btn.textContent = '✓ ADDED';
        btn.style.color = 'var(--gold)';
        btn.style.borderColor = 'var(--gold)';
        btn.style.background = 'rgba(212,168,83,0.08)';

        setTimeout(() => {
          btn.textContent = btn.dataset.product === 'Bespoke Heritage Set' ? 'INQUIRE NOW' : 'ADD TO BAG';
          btn.style.color = '';
          btn.style.borderColor = '';
          btn.style.background = '';
        }, 1500);

        const ripple = document.createElement('div');
        ripple.style.cssText = `
          position: fixed;
          top: ${e.clientY}px;
          left: ${e.clientX}px;
          width: 6px;
          height: 6px;
          background: var(--gold);
          border-radius: 50%;
          pointer-events: none;
          z-index: 10001;
          transform: translate(-50%, -50%) scale(1);
          transition: transform 0.6s var(--ease-out), opacity 0.6s;
        `;
        document.body.appendChild(ripple);
        requestAnimationFrame(() => {
          ripple.style.transform = 'translate(-50%, -50%) scale(30)';
          ripple.style.opacity = '0';
        });
        setTimeout(() => ripple.remove(), 700);
      });
    });
  }

  function initParallax() {
    const sections = $$('.section-header, .about-left, .featured-grid');
    
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (isVisible) {
          const offset = (rect.top / window.innerHeight) * 30;
          section.style.transform = `translateY(${offset * 0.3}px)`;
        }
      });
    }, { passive: true });
  }

  function initSmoothImages() {
    const images = $$('.card-media img, .featured-card img');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'scale(1)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    images.forEach(img => {
      img.style.opacity = '0';
      img.style.transform = 'scale(1.05)';
      img.style.transition = 'opacity 1s var(--ease-out), transform 1.2s var(--ease-out)';
      observer.observe(img);
    });
  }

  async function init() {
    initNoise();
    initCursor();

    await initPreloader();
    isLoaded = true;

    initHeroCanvas();
    initAboutCanvas();
    initReveal();
    initCounters();
    initNav();
    initWorkFilter();
    initMagnetic();
    initGlitch();
    initCardEffects();
    initCart();
    initParallax();
    initSmoothImages();

    setTimeout(revealHero, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
