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
  let objModels = [];
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

    function addHover() { document.body.classList.add('cursor-hover'); }
    function removeHover() { document.body.classList.remove('cursor-hover'); }

    document.querySelectorAll('.magnetic, .nav-link, .filter-btn, .btn-add-cart, .featured-card, .work-card').forEach(el => {
      el.addEventListener('mouseenter', addHover);
      el.addEventListener('mouseleave', removeHover);
    });
  }

  function initPreloader() {
    return new Promise((resolve) => {
      const preloader = $('#preloader');
      const bar = $('#preloader-bar');
      const num = $('#preloader-num');
      const logo = $('.preloader-logo');
      const duration = 2400;
      const start = performance.now();

      setTimeout(() => {
        logo.classList.add('fade-in');
      }, 100);

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
            logo.classList.remove('fade-in');
            logo.classList.add('fade-out');
          }, 400);

          setTimeout(() => {
            preloader.classList.add('hidden');
            resolve();
          }, 1400);
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

    heroRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    heroRenderer.setSize(W, H);
    heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    heroRenderer.setClearColor(0x000000, 0);

    heroScene = new THREE.Scene();
    heroCamera = new THREE.PerspectiveCamera(60, W / H, 0.1, 2000);
    heroCamera.position.set(0, 0, 80);

    const ambientLight = new THREE.AmbientLight(0x333333, 0.5);
    heroScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xc0c0c0, 1.2);
    dirLight.position.set(5, 10, 7);
    heroScene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x6a7480, 0.6);
    rimLight.position.set(-5, -3, -5);
    heroScene.add(rimLight);

    const pointLight = new THREE.PointLight(0xd8dce0, 0.8, 200);
    pointLight.position.set(0, 0, 30);
    heroScene.add(pointLight);

    const count = 8000;
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

      const tone = Math.random();
      if (tone < 0.35) {
        const v = 0.7 + Math.random() * 0.3;
        colors[i3] = v;
        colors[i3 + 1] = v;
        colors[i3 + 2] = v;
      } else if (tone < 0.6) {
        colors[i3] = 0.65 + Math.random() * 0.15;
        colors[i3 + 1] = 0.68 + Math.random() * 0.15;
        colors[i3 + 2] = 0.72 + Math.random() * 0.15;
      } else if (tone < 0.8) {
        const v = 0.4 + Math.random() * 0.25;
        colors[i3] = v;
        colors[i3 + 1] = v;
        colors[i3 + 2] = v + 0.05;
      } else {
        colors[i3] = 0.85 + Math.random() * 0.15;
        colors[i3 + 1] = 0.88 + Math.random() * 0.12;
        colors[i3 + 2] = 0.92 + Math.random() * 0.08;
      }

      sizes[i] = Math.random() * 2.2 + 0.3;
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
          gl_FragColor = vec4(vColor, alpha * 0.75);
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
          vec3 silver = vec3(0.75, 0.75, 0.78);
          vec3 steel = vec3(0.42, 0.46, 0.50);
          vec3 col = mix(steel, silver, sin(uTime * 0.4) * 0.5 + 0.5);
          gl_FragColor = vec4(col * fresnel * 1.3, fresnel * 0.35);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowSphere = new THREE.Mesh(glowGeo, glowMat);
    heroScene.add(glowSphere);

    loadOBJModels();

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

      objModels.forEach((model, idx) => {
        if (model) {
          model.rotation.y = clock * (0.08 + idx * 0.02);
          model.rotation.x = Math.sin(clock * 0.3 + idx) * 0.1;
          model.position.y = Math.sin(clock * 0.5 + idx * 1.5) * 1.5;
        }
      });

      heroCamera.position.x = lerp(heroCamera.position.x, mouse.x * 6, 0.025);
      heroCamera.position.y = lerp(heroCamera.position.y, mouse.y * 4, 0.025);
      heroCamera.lookAt(0, 0, 0);

      heroRenderer.render(heroScene, heroCamera);
    }
    heroAnimate();
  }

  function loadOBJModels() {
    if (typeof THREE.OBJLoader === 'undefined') return;

    const loader = new THREE.OBJLoader();

    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      metalness: 0.95,
      roughness: 0.15,
      envMapIntensity: 1.0,
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xa8b0b8,
      metalness: 0.98,
      roughness: 0.08,
      envMapIntensity: 1.2,
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.9,
      roughness: 0.3,
    });

    const modelConfigs = [
      { file: 'Podium.obj', scale: 0.08, pos: [0, -18, -15], mat: metalMaterial },
      { file: 'Spiral.obj', scale: 0.06, pos: [30, 5, -25], mat: chromeMaterial },
      { file: 'rock.obj', scale: 0.12, pos: [-28, -8, -20], mat: darkMaterial },
    ];

    modelConfigs.forEach((config, idx) => {
      loader.load(
        config.file,
        (obj) => {
          obj.traverse((child) => {
            if (child.isMesh) {
              child.material = config.mat;
            }
          });

          const box = new THREE.Box3().setFromObject(obj);
          const center = box.getCenter(new THREE.Vector3());
          obj.position.sub(center);

          obj.scale.set(config.scale, config.scale, config.scale);
          obj.position.set(config.pos[0], config.pos[1], config.pos[2]);

          heroScene.add(obj);
          objModels[idx] = obj;
        },
        undefined,
        (err) => {
          console.log('OBJ load skipped:', config.file);
        }
      );
    });
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
          grad.addColorStop(0, 'rgba(192,192,192,0.03)');
          grad.addColorStop(0.5, 'rgba(192,192,192,0.4)');
          grad.addColorStop(1, 'rgba(106,116,128,0.03)');
        } else if (s === 1) {
          grad.addColorStop(0, 'rgba(106,116,128,0.03)');
          grad.addColorStop(0.5, 'rgba(168,176,184,0.35)');
          grad.addColorStop(1, 'rgba(192,192,192,0.03)');
        } else {
          grad.addColorStop(0, 'rgba(216,220,224,0.02)');
          grad.addColorStop(0.5, 'rgba(216,220,224,0.25)');
          grad.addColorStop(1, 'rgba(216,220,224,0.02)');
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
          const alpha = (Math.sin(t + i * 0.3) * 0.5 + 0.5) * 0.6 + 0.1;
          const colorsArr = [
            `rgba(192,192,192,${alpha})`,
            `rgba(168,176,184,${alpha})`,
            `rgba(216,220,224,${alpha})`
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
        btn.style.color = 'var(--white)';
        btn.style.borderColor = 'var(--silver)';
        btn.style.background = 'rgba(192,192,192,0.08)';

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
          background: var(--silver);
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
