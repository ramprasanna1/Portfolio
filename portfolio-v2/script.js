const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');

menuButton?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});

const revealTargets = document.querySelectorAll('.intro-grid, .project-card, .timeline-item, .skills-panel, .contact-content');
revealTargets.forEach((target) => target.classList.add('reveal'));

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealTargets.forEach((target) => observer.observe(target));
} else {
  revealTargets.forEach((target) => target.classList.add('visible'));
}

// Bring the supplied shader and crystal references together as one focused hero visual.
const art = document.querySelector('.hero-art');
const canvas = document.querySelector('#hero-canvas');
function initializeHeroScene() {
  if (!art || !canvas || !window.THREE) return;
  try {
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
    camera.position.set(0, 0, 6.5);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 680 ? 1.05 : 1.25));
    renderer.setClearColor(0x000000, 0);
    const core = new THREE.Group();
    scene.add(core);

    const blobMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        uniform float uTime;
        varying vec3 vPosition;
        varying vec3 vNormalView;
        varying float vPulse;
        void main() {
          vec3 p = position;
          float a = sin(p.x * 3.1 + uTime * .52) * cos(p.y * 2.4 - uTime * .31);
          float b = sin(p.z * 3.7 - uTime * .37 + p.y * 1.8);
          float pulse = a * .55 + b * .45;
          p += normal * pulse * .15;
          vPosition = normalize(position);
          vNormalView = normalize(normalMatrix * normal);
          vPulse = pulse;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vPosition;
        varying vec3 vNormalView;
        varying float vPulse;
        void main() {
          vec3 violet = vec3(.30, .34, .95);
          vec3 cyan = vec3(.27, .86, .87);
          float bands = smoothstep(-.65, .72, vPosition.y * .72 + vPulse * .48);
          vec3 base = mix(violet, cyan, bands);
          float light = .30 + .70 * max(dot(normalize(vNormalView), normalize(vec3(.42, .58, .72))), 0.0);
          float rim = pow(1.0 - abs(dot(normalize(vNormalView), vec3(0.0, 0.0, 1.0))), 2.1);
          vec3 color = base * light + vec3(.23, .44, .88) * rim * .55;
          gl_FragColor = vec4(color, .97);
        }`,
    });
    const blob = new THREE.Mesh(new THREE.SphereGeometry(1.27, 48, 36), blobMaterial);
    core.add(blob);

    const crystal = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 1),
      new THREE.MeshBasicMaterial({ color: 0x9cafff, wireframe: true, transparent: true, opacity: .32 }),
    );
    core.add(crystal);

    const particleCount = 200;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const radius = 1.9 + Math.random() * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const z = Math.random() * 2 - 1;
      const ring = Math.sqrt(1 - z * z);
      particlePositions[i * 3] = radius * ring * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * z;
      particlePositions[i * 3 + 2] = radius * ring * Math.sin(theta);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
      color: 0x79dce9, size: .018, transparent: true, opacity: .7, sizeAttenuation: true,
    }));
    scene.add(particles);

    let targetX = 0;
    let targetY = 0;
    let pointerX = 0;
    let pointerY = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    canvas.addEventListener('pointermove', (event) => {
      const bounds = canvas.getBoundingClientRect();
      pointerX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointerY = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
    });
    canvas.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });

    const resizeScene = () => {
      const width = Math.max(1, art.clientWidth);
      const height = Math.max(1, art.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resize = new ResizeObserver(resizeScene);
    resizeScene();
    resize.observe(art);

    const clock = new THREE.Clock();
    let frameId = 0;
    let lastFrameTime = 0;
    let isInView = true;
    function render(now = 0) {
      frameId = 0;
      if (document.hidden || !isInView) return;
      if (now - lastFrameTime < 1000 / 45) {
        frameId = requestAnimationFrame(render);
        return;
      }
      lastFrameTime = now;
      const time = clock.getElapsedTime();
      targetX += (pointerX - targetX) * .14;
      targetY += (pointerY - targetY) * .14;
      blobMaterial.uniforms.uTime.value = reducedMotion ? 0 : time;
      core.rotation.y = (reducedMotion ? 0 : time * .12) + targetX * .24;
      core.rotation.x = targetY * .18;
      crystal.rotation.y = -core.rotation.y * .32;
      crystal.rotation.x = -core.rotation.x * .6;
      particles.rotation.y = reducedMotion ? 0 : time * .018;
      renderer.render(scene, camera);
      if (!art.classList.contains('webgl-ready')) art.classList.add('webgl-ready');
      frameId = requestAnimationFrame(render);
    }
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isInView = entry.isIntersecting;
      if (isInView && !document.hidden && !frameId) render();
    }, { threshold: 0.01 });
    visibilityObserver.observe(art);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      } else if (!document.hidden && isInView && !frameId) {
        render();
      }
    });
    render();
  } catch (error) {
    // Keep the CSS illustration in place if WebGL is unavailable.
    console.info('3D hero unavailable; showing the static illustration.', error);
  }
}

function loadThreeAndStartHero() {
  if (!art || !canvas) return;
  if (window.THREE) {
    initializeHeroScene();
    return;
  }
  const threeScript = document.createElement('script');
  threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  threeScript.async = true;
  threeScript.onload = initializeHeroScene;
  // The CSS orb remains visible if WebGL or the CDN is unavailable.
  document.head.appendChild(threeScript);
}

function scheduleHeroScene() {
  const startAfterFirstPaint = () => {
    const scheduleIdleLoad = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadThreeAndStartHero, { timeout: 220 });
      } else {
        window.setTimeout(loadThreeAndStartHero, 80);
      }
    };
    window.requestAnimationFrame(() => window.requestAnimationFrame(scheduleIdleLoad));
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAfterFirstPaint, { once: true });
  } else {
    startAfterFirstPaint();
  }
}

scheduleHeroScene();

