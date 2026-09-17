import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Extruded GG silhouette with a baked studio finish and lit three-dimensional sidewalls.
 * Counters are open geometry. Nothing in the decorative scene accesses school data.
 * @param {HTMLElement} host
 * @param {{signal: AbortSignal, onReady: () => void, onUnavailable: () => void}} options
 * @returns {Promise<() => void>} Complete GPU / observer / listener cleanup.
 */
export async function createEmblemScene(host, { signal, onReady, onUnavailable }) {
  const response = await fetch('/gg-contours.json', { signal });
  if (!response.ok) throw new Error('Emblem unavailable');
  const source = await response.json();
  if (signal.aborted || !host) return;
  const finishResponse = await fetch('/gg-surface.webp', { signal });
  if (!finishResponse.ok) throw new Error('Emblem finish unavailable');
  const bitmap = await createImageBitmap(await finishResponse.blob(), { imageOrientation: 'flipY' });
  if (signal.aborted) { bitmap.close(); return; }
  const resources = new Set();
  const own = resource => { resources.add(resource); return resource; };
  let renderer;
  let cleanup = () => {};
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
    camera.position.set(0, -0.05, 12.6);
    const composer = own(new EffectComposer(renderer));
    composer.addPass(new RenderPass(scene, camera));
    const bloom = own(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.19, 0.32, 2.8));
    composer.addPass(bloom);
    composer.addPass(own(new OutputPass()));

    // An actual reflected studio: dark walls with narrow bright softboxes.
    // Unlike uniform ambient lighting, these create metallic light/dark bands.
    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0x171514);
    const boxGeometry = new THREE.PlaneGeometry(1, 1);
    const panels = [];
    function softbox(color, strength, position, scale) {
      const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide });
      const panel = new THREE.Mesh(boxGeometry, material);
      panel.position.set(...position); panel.scale.set(...scale, 1); panel.lookAt(0, 0, 0);
      studio.add(panel); panels.push(material);
    }
    softbox(0xfff7e5, 5, [-4, 3, 5], [3, 7]);
    softbox(0xffffff, 4, [0, 6, 1], [8, 1.4]);
    softbox(0xffcb63, 8, [5, 1, -2], [1.2, 8]);
    softbox(0xffffff, 1.5, [-1, -3, 5], [6, 1]);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = own(pmrem.fromScene(studio, 0.04));
    scene.environment = environment.texture;
    pmrem.dispose(); boxGeometry.dispose(); panels.forEach(p => p.dispose());
    scene.add(new THREE.AmbientLight(0xfff4dd, 0.35));
    const key = new THREE.DirectionalLight(0xfff6e8, 2.4); key.position.set(-4, 6, 7); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffc04c, 4); rim.position.set(5, 3, -2); scene.add(rim);
    const bottom = new THREE.PointLight(0xffb52d, 6, 14, 2); bottom.position.set(2, -3.6, 2); scene.add(bottom);

    let seed = 284;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const grainCanvas = document.createElement('canvas'); grainCanvas.width = grainCanvas.height = 256;
    const grainContext = grainCanvas.getContext('2d');
    const pixels = grainContext.createImageData(256, 256);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const v = 120 + random() * 55;
      pixels.data.set([v, v, v, 255], i);
    }
    grainContext.putImageData(pixels, 0, 0);
    const grain = own(new THREE.CanvasTexture(grainCanvas));
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(2, 2);
    const side = own(new THREE.MeshPhysicalMaterial({ color: 0x443528, metalness: 0.86, roughness: 0.27, bumpMap: grain, bumpScale: 0.004 }));
    const bakedFinish = own(new THREE.CanvasTexture(bitmap));
    bakedFinish.colorSpace = THREE.SRGBColorSpace;
    bakedFinish.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const face = own(new THREE.MeshBasicMaterial({ map: bakedFinish, toneMapped: false }));
    const emblem = new THREE.Group(); scene.add(emblem);
    const edgeSamples = [];
    const modelHeight = 6.9;
    const modelWidth = modelHeight * source.aspect;
    const outer = source.contours.find(contour => !contour.hole);
    const toPoint = ([x, y]) => new THREE.Vector2((x - 0.5) * modelWidth, (0.5 - y) * modelHeight);
    const shape = new THREE.Shape(outer.points.map(toPoint));
    for (const contour of source.contours.filter(c => c.hole)) shape.holes.push(new THREE.Path(contour.points.map(toPoint)));
    const geometry = own(new THREE.ExtrudeGeometry(shape, {
      depth: 0.22, steps: 1, bevelEnabled: false, curveSegments: 1,
    }));
    geometry.translate(0, 0, -0.22);
    const positions = geometry.attributes.position; const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, positions.getX(i) / modelWidth + 0.5, positions.getY(i) / modelHeight + 0.5);
    emblem.add(new THREE.Mesh(geometry, [face, side]));
    outer.points.forEach(p => { const v = toPoint(p); edgeSamples.push(new THREE.Vector3(v.x, v.y, 0.025)); });

    // A moving mirror image below the emblem, softened and faded into the stage.
    const reflection = new THREE.Group(); scene.add(reflection);
    emblem.children.forEach(child => {
      const reflected = child.clone();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const copies = materials.map(original => {
        const copy = own(original.clone()); copy.transparent = true; copy.opacity = 0.13; copy.depthWrite = false;
        return copy;
      });
      reflected.material = Array.isArray(child.material) ? copies : copies[0];
      reflection.add(reflected);
    });
    reflection.scale.y = -0.35; reflection.position.y = -4.18;

    const spriteCanvas = document.createElement('canvas'); spriteCanvas.width = spriteCanvas.height = 128;
    const ctx = spriteCanvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
    gradient.addColorStop(0, '#fff9dd'); gradient.addColorStop(0.08, '#ffe5a0'); gradient.addColorStop(0.22, 'rgba(255,195,57,.4)'); gradient.addColorStop(1, 'rgba(245,192,37,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    const dotMap = own(new THREE.CanvasTexture(spriteCanvas));
    const particleGroup = new THREE.Group(); scene.add(particleGroup);
    const particlePoints = [];
    const particleMaterial = own(new THREE.SpriteMaterial({ map: dotMap, color: new THREE.Color(2.4, 1.8, 0.6), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    for (let i = 0; i < 95; i++) {
      const angle = random() * Math.PI * 2;
      const radius = 2.45 + random() * 0.7;
      const p = new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * 1.06, -0.7 - random() * 1.2);
      const dot = new THREE.Sprite(particleMaterial); dot.position.copy(p); dot.scale.setScalar(0.045 + random() * 0.055); particleGroup.add(dot); particlePoints.push(p);
    }
    const connections = [];
    particlePoints.forEach((a, i) => particlePoints.slice(i + 1).forEach(b => {
      if (a.distanceTo(b) < 0.7) connections.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }));
    const lines = own(new THREE.BufferGeometry()); lines.setAttribute('position', new THREE.Float32BufferAttribute(connections, 3));
    particleGroup.add(new THREE.LineSegments(lines, own(new THREE.LineBasicMaterial({ color: 0xf5bd38, transparent: true, opacity: 0.48 }))));
    ctx.fillStyle = '#fff9df'; ctx.beginPath();
    ctx.moveTo(64, 6); ctx.lineTo(67, 61); ctx.lineTo(112, 64); ctx.lineTo(67, 67); ctx.lineTo(64, 122); ctx.lineTo(61, 67); ctx.lineTo(16, 64); ctx.lineTo(61, 61); ctx.closePath(); ctx.fill();
    const starMap = own(new THREE.CanvasTexture(spriteCanvas));
    const sparkMaterial = own(new THREE.SpriteMaterial({ map: starMap, color: new THREE.Color(3, 2.6, 1.8), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    const spark = new THREE.Sprite(sparkMaterial); spark.scale.setScalar(0.24); emblem.add(spark);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = new THREE.Vector2(); const easedPointer = new THREE.Vector2();
    let frame = 0, previous = 0, elapsed = 0, lastRender = 0;
    let visible = true, disposed = false, lost = false;
    function draw(timestamp = 0) {
      if (disposed || lost || !visible || document.hidden) { frame = 0; return; }
      if (timestamp - lastRender < 1000 / 30 && !reduced.matches) { frame = requestAnimationFrame(draw); return; }
      elapsed += previous ? Math.min((timestamp - previous) / 1000, 0.1) : 0;
      previous = timestamp; lastRender = timestamp;
      const phase = elapsed * Math.PI / 10;
      easedPointer.lerp(pointer, 0.06);
      emblem.rotation.y = reduced.matches ? 0 : Math.sin(phase) * 0.025 + easedPointer.x * 0.024;
      emblem.rotation.x = reduced.matches ? 0 : Math.sin(phase * 0.7) * 0.007 + easedPointer.y * 0.012;
      reflection.rotation.y = emblem.rotation.y;
      reflection.rotation.x = -emblem.rotation.x;
      particleGroup.rotation.z = reduced.matches ? 0 : Math.sin(phase * 0.4) * 0.009;
      sparkMaterial.opacity = reduced.matches ? 0 : Math.pow(Math.max(0, Math.cos(phase * 2 - 1.5)), 90) * 0.8;
      spark.position.copy(edgeSamples[(Math.floor(elapsed / 10) * 157 + 45) % edgeSamples.length]); spark.position.z += 0.04;
      composer.render();
      if (!reduced.matches) frame = requestAnimationFrame(draw); else frame = 0;
    }
    function restart() { cancelAnimationFrame(frame); previous = 0; lastRender = 0; if (!disposed && !lost && visible && !document.hidden) frame = requestAnimationFrame(draw); }
    function resize() {
      const { width, height } = host.getBoundingClientRect(); if (!width || !height) return;
      renderer.setSize(width, height, false); composer.setSize(width, height);
      camera.aspect = width / height;
      camera.position.z = camera.aspect < 0.8 ? 14 : 12.6;
      camera.updateProjectionMatrix(); restart();
    }
    function move(event) { const b = host.getBoundingClientRect(); pointer.set((event.clientX - b.left) / b.width - 0.5, (event.clientY - b.top) / b.height - 0.5); }
    const leave = () => pointer.set(0, 0);
    const contextLost = event => { event.preventDefault(); lost = true; cancelAnimationFrame(frame); onUnavailable(); };
    const contextRestored = () => { lost = false; onReady(); restart(); };
    const observer = new ResizeObserver(resize); observer.observe(host);
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; restart(); }); intersection.observe(host);
    host.addEventListener('pointermove', move); host.addEventListener('pointerleave', leave);
    renderer.domElement.addEventListener('webglcontextlost', contextLost); renderer.domElement.addEventListener('webglcontextrestored', contextRestored);
    document.addEventListener('visibilitychange', restart); reduced.addEventListener('change', restart);
    cleanup = () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost); renderer.domElement.removeEventListener('webglcontextrestored', contextRestored);
      document.removeEventListener('visibilitychange', restart); reduced.removeEventListener('change', restart);
    };
    // resize() starts the single animation loop. A second draw() here would
    // accidentally create another loop during React StrictMode verification.
    resize(); composer.render(); onReady();
  } catch (error) {
    cleanup(); resources.forEach(resource => resource.dispose()); bitmap.close(); renderer?.dispose(); renderer?.domElement.remove(); throw error;
  }
  return () => { cleanup(); resources.forEach(resource => resource.dispose()); bitmap.close(); renderer.dispose(); renderer.domElement.remove(); };
}
