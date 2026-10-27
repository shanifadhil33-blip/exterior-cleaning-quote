// Gleam 3D house. Low poly, built from boxes, drawn with Three.js.
// mount(host, { onTap }) returns { build(spec), setSel(sel), wash(id), dispose() } or throws if WebGL is missing.
import * as THREE from 'three';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/shaders/FXAAShader.js';

const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
const col = c => new THREE.Color(c.startsWith('rgba') ? c.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgb($1,$2,$3)') : c);

export function mount(host, opts = {}) {
  const probe = document.createElement('canvas');
  const probeAttrs = { alpha: false, antialias: false, powerPreference: 'high-performance' };
  const probeGl = probe.getContext('webgl2', probeAttrs) || probe.getContext('webgl', probeAttrs);
  if (!probeGl) throw new Error('no webgl');
  const loseProbe = probeGl.getExtension('WEBGL_lose_context');
  if (loseProbe) loseProbe.loseContext();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'gl3';
  canvas.setAttribute('aria-hidden', 'true');
  // Three r170 ignores the alpha flag and always requests alpha:true. Create the context
  // here so the renderer is given the attributes we actually asked for.
  const requestedGL = { alpha: false, antialias: true, depth: true, stencil: false, powerPreference: 'high-performance', premultipliedAlpha: true, preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: false };
  const glContext = canvas.getContext('webgl2', requestedGL);
  if (!glContext) throw new Error('no webgl');
  const renderer = new THREE.WebGLRenderer({ canvas, context: glContext, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false });
  const gl = renderer.getContext();
  renderer.setClearAlpha(1);
  const dprCap = 2;
  const msaa = !!(gl.getContextAttributes() && gl.getContextAttributes().antialias);
  // Screens around dpr 1 leave roof eaves and window bars only a pixel wide.
  // Draw them a step larger, still capped at 2 so a phone at dpr 3 stays put.
  function pixelScale() {
    const dpr = window.devicePixelRatio || 1;
    if (dpr >= 1 && dpr <= 1.5) return Math.min(dpr * 1.5, dprCap);
    return Math.min(dpr, dprCap);
  }
  renderer.setPixelRatio(pixelScale());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Flat, like the estimator canvas. Neutral mapping was lifting the shade side
  // until the walls read as a white coat.
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1.5, 0.2, 80);
  const PI = Math.PI;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x262626, 0.78 * PI);
  // A touch under the estimator key, with a stronger fill, so a sun-facing
  // wall stays a wall colour instead of clipping to white.
  const sun = new THREE.DirectionalLight(0xffffff, 0.5 * PI);
  sun.position.set(7.2, 18, 11);
  sun.castShadow = true;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  // Fixed bounds. Rebuilding the house must not resize the shadow frustum,
  // or the shadow swims for a frame.
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  sun.shadow.camera.updateProjectionMatrix();
  // A phone canvas is already wide in pixels. A 1024 map keeps the soft shadow
  // and leaves the frame budget the suite measures.
  const shadowRes = (window.innerWidth || 1200) < 960 ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowRes, shadowRes);
  sun.shadow.bias = -0.001;
  sun.shadow.normalBias = 0.045;
  const fill = new THREE.DirectionalLight(0xffffff, 0.3 * PI);
  fill.position.set(-12, 8, -7);
  scene.add(hemi, sun, fill);
  sun.target.position.set(0, 1.4, 0);
  scene.add(sun.target);
  const themeDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  const bgCur = new THREE.Color(0xeceeee);
  const BG_LIGHT = new THREE.Color(0xeceeee);
  const BG_DARK = new THREE.Color(0x121618);
  const LAWN_LIGHT = new THREE.Color(0xc5d0c8);
  const LAWN_DARK = new THREE.Color(0x24312c);
  const lawnCur = new THREE.Color(0xc5d0c8);
  scene.background = bgCur;
  scene.fog = new THREE.Fog(0xeceeee, 8000, 12000);
  let themeUntil = 0;
  const contactU = { value: 0.28 };
  // 1 = light, 0 = dark, taken from the page colour that is already on screen
  function themeMix() {
    const span = BG_LIGHT.r - BG_DARK.r;
    return THREE.MathUtils.clamp(span ? (bgCur.r - BG_DARK.r) / span : 1, 0, 1);
  }
  function applySceneTheme() {
    const t = themeMix();
    hemi.color.set(0xffffff);
    hemi.groundColor.set(0x262626);
    hemi.intensity = 0.78 * PI;
    sun.color.set(0xffffff);
    sun.intensity = 0.5 * PI;
    fill.color.set(0xffffff);
    fill.intensity = 0.3 * PI;
    contactU.value = 0.40 + (0.22 - 0.40) * t;
    lawnCur.copy(LAWN_DARK).lerp(LAWN_LIGHT, t);
  }
  function paintBackdrop(cssColor) {
    const raw = cssColor || (themeDark() ? '#121618' : '#eceeee');
    bgCur.set(raw);
    renderer.setClearColor(bgCur, 1);
    scene.fog.color.copy(bgCur);
    scene.background = bgCur;
    canvas.style.backgroundColor = raw;
    applySceneTheme();
    draw();
  }
  function sampleStage() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    paintBackdrop(raw || (themeDark() ? '#121618' : '#eceeee'));
  }
  function syncTheme() {
    sampleStage();
    themeUntil = performance.now() + 1200;
  }
  let composer = null, fxaaPass = null;
  if (!msaa) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    fxaaPass = new ShaderPass(FXAAShader);
    composer.addPass(fxaaPass);
    composer.addPass(new OutputPass());
  }
  function draw() {
    if (!canvas.width || !canvas.height) return;
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }
  sampleStage();
  canvas.style.colorScheme = themeDark() ? 'only dark' : 'only light';
  const themeObs = new MutationObserver(syncTheme);
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const pivot = new THREE.Group();
  scene.add(pivot);
  let root = new THREE.Group();
  pivot.add(root);

  let parts = {}, fxList = [], spec = null, sel = {}, radius = 6, framePts = null;
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.92, metalness: 0, flatShading: true, ...o });
  const decalMat = (c, opacity) => new THREE.MeshBasicMaterial({
    color: col(c), transparent: true, opacity, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -10, polygonOffsetUnits: -10,
  });

  function box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  function part(id) {
    if (!parts[id]) {
      const g = new THREE.Group();
      g.userData.part = id;
      root.add(g);
      parts[id] = { id, g, mats: [], dirt: [], clean: sel[id] ? 1 : 0, target: sel[id] ? 1 : 0, from: sel[id] ? 1 : 0, since: 0 };
    }
    return parts[id];
  }
  // a material that moves from a weathered colour to a clean one
  function dirtyMat(p, dirty, clean, extra) {
    const m = M(dirty, extra);
    m.userData = { a: col(dirty), b: col(clean) };
    p.mats.push(m);
    return m;
  }
  // grime overlay: fades, shrinks, or falls as the part gets clean
  // Feather only the far tip of a slab into the lawn, not into empty page.
  function paveFade(mat, half) {
    mat.customProgramCacheKey = () => 'gleam-pave-lawn';
    mat.onBeforeCompile = shader => {
      shader.uniforms.uLawn = { value: lawnCur };
      shader.uniforms.uHalf = { value: Math.max(0.2, half) };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vFadeP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFadeP = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vFadeP;\nuniform vec3 uLawn;\nuniform float uHalf;')
        .replace('#include <fog_fragment>', `#include <fog_fragment>
          float fadeT = smoothstep(0.78, 1.02, vFadeP.z / max(uHalf, 0.001));
          vec3 lawnLin = max(uLawn, vec3(0.0));
          vec3 lawnSRGB = mix(lawnLin * 12.92, 1.055 * pow(lawnLin, vec3(0.416666667)) - 0.055, step(vec3(0.0031308), lawnLin));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, lawnSRGB, fadeT);`);
    };
    return mat;
  }
  // Darken the foot of a wall and the band under the eaves so a big face is not one flat tone.
  function wallAo(mat) {
    mat.customProgramCacheKey = () => 'gleam-wall-ao';
    mat.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vWallY;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWallY = (modelMatrix * vec4(transformed, 1.0)).y;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vWallY;')
        .replace('#include <opaque_fragment>', `#include <opaque_fragment>
          float baseAo = smoothstep(0.02, 0.7, vWallY);
          float eave = smoothstep(2.2, 1.25, vWallY);
          gl_FragColor.rgb *= mix(0.62, 1.0, baseAo) * mix(0.84, 1.0, clamp(eave, 0.0, 1.0));`);
    };
    return mat;
  }
  const lawnMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  lawnMat.customProgramCacheKey = () => 'gleam-lawn';
  lawnMat.onBeforeCompile = shader => {
    shader.uniforms.uBg = { value: bgCur };
    shader.uniforms.uLawn = { value: lawnCur };
    shader.uniforms.uContact = contactU;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vLawn;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLawn = position.xy;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vLawn;\nuniform vec3 uBg;\nuniform vec3 uLawn;\nuniform float uContact;')
      .replace('#include <fog_fragment>', `#include <fog_fragment>
        float rad = length(vLawn) * 2.0;
        float fade = smoothstep(0.68, 1.0, rad);
        float contact = 1.0 - smoothstep(0.0, 0.42, rad);
        vec3 lawnLin = max(uLawn, vec3(0.0));
        vec3 bgLin = max(uBg, vec3(0.0));
        vec3 lawnSRGB = mix(lawnLin * 12.92, 1.055 * pow(lawnLin, vec3(0.416666667)) - 0.055, step(vec3(0.0031308), lawnLin));
        vec3 bgSRGB = mix(bgLin * 12.92, 1.055 * pow(bgLin, vec3(0.416666667)) - 0.055, step(vec3(0.0031308), bgLin));
        lawnSRGB *= 1.0 - uContact * contact;
        gl_FragColor.rgb = mix(lawnSRGB, bgSRGB, fade);`);
  };
  function grime(p, mesh, mode) {
    mesh.renderOrder = 4;
    mesh.userData.mode = mode;
    mesh.userData.p0 = mesh.position.clone();
    mesh.userData.s0 = mesh.scale.clone();
    mesh.userData.o0 = mesh.material.opacity;
    mesh.userData.r = Math.random();
    p.dirt.push(mesh);
    p.g.add(mesh);
  }
  function rnd(seed) {
    return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  function build(s) {
    spec = s;
    pivot.remove(root);
    root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    root = new THREE.Group();
    pivot.add(root);
    parts = {}; fxList = [];
    const r = rnd(s.seed || 7);
    const C = {
      wall: '#f7f8f8', wallDirty: '#d2c4ac', roof: '#c5d0d6', roofDirty: '#746e58',
      glass: '#d5e4ec', glassDirty: '#c2b396', door: css('--h-door'), pave: '#dce2e3',
      paveDirty: '#b3a68e', gut: '#e7eeef', gutDirty: '#b5a78c', lawn: '#dce3e4',
      moss: '#87985e', leaf: '#a07e4e', streak: '#5a5144', grime: '#8a7c64',
      panel: '#3e5568', panelDirty: '#b3a68a', tree: '#d3dbdd', nb: '#e4e9ea',
      frame: '#d3dce0', garage: '#c5ced3'
    };
    const flat = s.roof === 'flat';
    const FH = 1.0, H = s.floors * FH, bay = 1.0;
    const W = s.bays * bay + 0.4, Dp = flat ? 3.0 : 2.4;
    const gw = s.garage ? (s.garage > 80 ? 1.9 : 1.3) : 0;
    const x0 = -(W + gw) / 2 + W / 2; // main body centre
    const front = Dp / 2;
    // Garage sits beside the body. Its back face steps past the house back so the
    // two walls are not coplanar.
    let gDepth = 0, gZ = 0, gFront = front, gBack = -front;
    if (gw) {
      gDepth = Dp * 0.82;
      gBack = -front - 0.1;
      gFront = gBack + gDepth;
      gZ = (gBack + gFront) / 2;
    }
    radius = Math.max(4.2, (W + gw) * 0.55 + Dp * 0.45);

    // Small lawn under the house and the paving. The outer band fades to the
    // page colour, so the edge never reads as a ring or a hard cut.
    const cx = x0 + gw / 2;
    const zSolidMin = -front - 0.45;
    const zSolidMax = front + 3.3;
    const cz = (zSolidMin + zSolidMax) / 2;
    const fadeAt = 0.68;
    const lawnW = (((W + gw) / 2 + 1.35) / fadeAt) * 2;
    const lawnD = ((Math.max(zSolidMax - cz, cz - zSolidMin)) / fadeAt) * 2;
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), lawnMat);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(cx, -0.03, cz);
    const lawnFit = 0.66;
    lawn.scale.set(lawnW * lawnFit, lawnD * lawnFit, 1);
    lawn.renderOrder = -2;
    lawn.castShadow = false;
    lawn.receiveShadow = false;
    lawn.userData.ground = true;
    root.add(lawn);
    applySceneTheme();
    const paveOf = mat => { mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -2; return mat; };
    const slab = (parent, w, h, d, mat, x, z, yBottom, order) => {
      const m = box(w, h, d, mat, x, yBottom + h / 2, z);
      m.castShadow = false;
      m.receiveShadow = false;
      m.renderOrder = order;
      parent.add(m);
      return yBottom + h;
    };

    // neighbours overlap the main wall so the shared face is buried, and their roof sits lower so the slopes are not coplanar
    // Attached wings use the same wall family as the house, a step darker, with their own windows.
    const nbMat = wallAo(M('#c4b7a2', { roughness: 0.94, flatShading: false }));
    const nbRoof = M(C.roofDirty, { roughness: 0.9, flatShading: true });
    const revealMat = M(C.door, { roughness: 0.88, flatShading: false });
    const gx = gw ? x0 + W / 2 + gw / 2 - 0.06 : 0;
    const decorWin = (wx, wy, wz, out) => {
      root.add(box(0.62, 0.56, 0.05, revealMat, wx, wy, wz));
      root.add(box(0.52, 0.46, 0.045, M(C.frame, { roughness: 0.9, flatShading: false }), wx, wy, wz + out * 0.02));
      root.add(box(0.4, 0.34, 0.03, M(C.glassDirty, { roughness: 0.2, metalness: 0.04, flatShading: false }), wx, wy, wz + out * 0.04));
      root.add(box(0.07, 0.34, 0.03, M(C.frame, { roughness: 0.86 }), wx, wy, wz + out * 0.05));
      root.add(box(0.4, 0.07, 0.03, M(C.frame, { roughness: 0.86 }), wx, wy, wz + out * 0.05));
    };
    const decorSide = (sx, sy, sz, out) => {
      root.add(box(0.05, 0.48, 0.5, revealMat, sx, sy, sz));
      root.add(box(0.04, 0.38, 0.38, M(C.frame, { roughness: 0.9 }), sx + out * 0.02, sy, sz));
      root.add(box(0.025, 0.28, 0.28, M(C.glassDirty, { roughness: 0.2, metalness: 0.04 }), sx + out * 0.035, sy, sz));
    };
    const neighbour = side => {
      const nx = side * (W - 0.08) + x0;
      const wall = box(W, H, Dp - 0.04, nbMat, nx, H / 2, -0.03);
      root.add(wall);
      if (flat) root.add(box(W + 0.02, 0.22, Dp + 0.02, nbMat, nx, H + 0.06, -0.02));
      else { const rf = gable(W, Dp + 0.3, 0.85, nbRoof); rf.position.set(nx, H - 0.1, 0); root.add(rf); }
      const zf = -0.03 + (Dp - 0.04) / 2 + 0.04;
      const zb = -0.03 - (Dp - 0.04) / 2 - 0.04;
      const doorB = s.bays > 2 ? Math.floor(s.bays / 2) : 0;
      for (let f = 0; f < s.floors; f++) {
        for (let b = 0; b < s.bays; b++) {
          const wx = nx - W / 2 + 0.2 + bay * (b + 0.5), wy = f * FH + 0.55;
          decorWin(wx, wy, zf, 1);
          if (f === 0 && b === doorB) {
            root.add(box(0.58, 0.96, 0.04, M(C.frame, { roughness: 0.9 }), wx, 0.48, zb + 0.02));
            root.add(box(0.46, 0.82, 0.06, M(C.door, { roughness: 0.88 }), wx, 0.44, zb));
          } else decorWin(wx, wy, zb, -1);
        }
      }
      const sx = nx + side * (W / 2 + 0.05);
      for (let f = 0; f < s.floors; f++) {
        decorSide(sx, f * FH + 0.55, -0.2, side);
        decorSide(sx, f * FH + 0.55, 0.45, side);
      }
      if (!flat) {
        const gxEnd = nx + side * (W / 2 + 0.16);
        root.add(box(0.05, 0.28, 0.34, revealMat, gxEnd, H + 0.2, 0));
        root.add(box(0.03, 0.18, 0.22, M(C.glassDirty, { roughness: 0.2, metalness: 0.04 }), gxEnd + side * 0.03, H + 0.2, 0));
      }
    };
    if (s.neigh === 'left' || s.neigh === 'both') neighbour(-1);
    if (s.neigh === 'both') neighbour(1);

    // walls
    const pw = part('walls');
    const wallMat = wallAo(dirtyMat(pw, C.wallDirty, C.wall, { roughness: 0.94, flatShading: false }));
    const plinthMat = dirtyMat(pw, '#9c8f78', '#c8cece', { roughness: 0.96, flatShading: false });
    const trimMat = dirtyMat(pw, '#cfc6b8', C.frame, { roughness: 0.9, flatShading: false });
    pw.g.add(box(W, H, Dp, wallMat, x0, H / 2, 0));
    if (gw) pw.g.add(box(gw, 1.0, gDepth, wallMat, gx, 0.5, gZ));
    pw.g.add(box(W + 0.08, 0.16, Dp + 0.08, plinthMat, x0, 0.08, 0));
    if (gw) pw.g.add(box(gw + 0.06, 0.14, gDepth + 0.06, plinthMat, gx, 0.07, gZ));
    if (s.floors > 1) pw.g.add(box(W + 0.05, 0.06, Dp + 0.05, trimMat, x0, FH, 0));
    const pilaster = (x, z) => pw.g.add(box(0.09, H + 0.02, 0.09, trimMat, x, H / 2, z));
    pilaster(x0 - W / 2, front);
    pilaster(x0 + W / 2, front);
    pilaster(x0 - W / 2, -front);
    pilaster(x0 + W / 2, -front);
    if (s.apt) for (let f = 1; f < s.floors; f++) pw.g.add(box(W + 0.12, 0.06, Dp + 0.12, wallMat, x0, f * FH, 0));
    const streakMat = () => decalMat(C.streak, 0.28);
    for (let i = 0; i < 7 + s.bays * 2; i++) {
      const h = 0.25 + r() * 0.6, sx = x0 - W / 2 + 0.15 + r() * (W - 0.3);
      grime(pw, new THREE.Mesh(new THREE.PlaneGeometry(0.035 + r() * 0.05, h), streakMat()), 'fade');
      pw.dirt[pw.dirt.length - 1].position.set(sx, H - h / 2 - r() * 0.15 - (r() < 0.5 ? 0 : FH * Math.floor(r() * s.floors)), front + 0.012);
    }
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.22), decalMat(C.moss, 0.35));
      m.position.set(x0, 0.12, front + 0.012); grime(pw, m, 'fade'); }

    // doors sit just proud of the wall so the faces are not coplanar
    const doorX = x0 + (s.bays > 2 ? 0 : -W / 4 + 0.1);
    root.add(box(0.62, 1.0, 0.04, trimMat, doorX, 0.48, front + 0.02));
    root.add(box(0.5, 0.86, 0.08, M(C.door), doorX, 0.45, front + 0.05));
    root.add(box(0.62, 1.0, 0.04, trimMat, doorX, 0.48, -front - 0.02));
    root.add(box(0.5, 0.86, 0.08, M(C.door), doorX, 0.45, -front - 0.05));
    root.add(box(0.72, 0.06, 0.22, plinthMat, doorX, 0.04, -front - 0.16));
    if (gw) {
      const doorW = Math.max(0.7, gw - 0.36);
      const doorH = 0.7;
      const doorY = 0.42;
      const gdMat = M(C.door, { roughness: 0.88, flatShading: false });
      const railMat = M(C.frame, { roughness: 0.82, flatShading: false });
      pw.g.add(box(doorW + 0.14, doorH + 0.12, 0.04, trimMat, gx, doorY, gFront + 0.02));
      pw.g.add(box(doorW, doorH, 0.045, gdMat, gx, doorY, gFront + 0.05));
      pw.g.add(box(0.05, doorH, 0.03, railMat, gx - doorW / 2 + 0.06, doorY, gFront + 0.08));
      pw.g.add(box(0.05, doorH, 0.03, railMat, gx + doorW / 2 - 0.06, doorY, gFront + 0.08));
      pw.g.add(box(0.045, doorH - 0.08, 0.03, railMat, gx, doorY, gFront + 0.08));
      pw.g.add(box(doorW - 0.16, 0.045, 0.03, railMat, gx, doorY, gFront + 0.08));
      pw.g.add(box(doorW - 0.16, 0.04, 0.025, railMat, gx, doorY + doorH * 0.22, gFront + 0.075));
      pw.g.add(box(doorW - 0.16, 0.04, 0.025, railMat, gx, doorY - doorH * 0.22, gFront + 0.075));
    }

    // windows
    const pwin = part('windows');
    const glassMat = dirtyMat(pwin, C.glassDirty, C.glass, { roughness: 0.16, metalness: 0.04, emissive: col('#000000') });
    const frameMat = M(C.frame, { roughness: 0.92 });
    const pane = (w, h, d, x, y, z) => {
      const m = box(w, h, d, glassMat, x, y, z);
      m.userData.pane = true;
      m.castShadow = false;
      return m;
    };
    const doorBay = s.bays > 2 ? Math.floor(s.bays / 2) : 0;
    const winFace = (wx, wy, wz, out) => {
      pwin.g.add(box(0.68, 0.64, 0.05, revealMat, wx, wy, wz));
      pwin.g.add(box(0.58, 0.54, 0.05, frameMat, wx, wy, wz + out * 0.02));
      pwin.g.add(pane(0.46, 0.42, 0.03, wx, wy, wz + out * 0.04));
      pwin.g.add(box(0.07, 0.42, 0.03, frameMat, wx, wy, wz + out * 0.05));
      pwin.g.add(box(0.46, 0.07, 0.03, frameMat, wx, wy, wz + out * 0.05));
      pwin.g.add(box(0.76, 0.05, 0.08, frameMat, wx, wy - 0.36, wz + out * 0.02));
    };
    for (let f = 0; f < s.floors; f++) {
      for (let b = 0; b < s.bays; b++) {
        const wx = x0 - W / 2 + 0.2 + bay * (b + 0.5), wy = f * FH + 0.55;
        if (!(f === 0 && b === doorBay)) {
          winFace(wx, wy, front + 0.02, 1);
          const dust = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), decalMat(C.grime, 0.32));
          dust.position.set(wx, wy - 0.13, front + 0.1); grime(pwin, dust, 'fade');
          winFace(wx, wy, -front - 0.02, -1);
        }
      }
    }
    const sideWin = (sign, z, floorFrom = 0) => {
      const sx = x0 + sign * (W / 2 + 0.045);
      for (let f = floorFrom; f < s.floors; f++) {
        const wy = f * FH + 0.55;
        pwin.g.add(box(0.05, 0.5, 0.52, revealMat, sx, wy, z));
        pwin.g.add(box(0.04, 0.4, 0.4, frameMat, sx + sign * 0.02, wy, z));
        pwin.g.add(pane(0.04, 0.3, 0.3, sx + sign * 0.04, wy, z));
        pwin.g.add(box(0.055, 0.3, 0.06, frameMat, sx + sign * 0.055, wy, z));
      }
    };
    if (s.neigh !== 'left' && s.neigh !== 'both') { sideWin(-1, -0.35); sideWin(-1, 0.35); }
    if (!gw && s.neigh !== 'both') { sideWin(1, -0.35); sideWin(1, 0.35); }
    // The garage covers the ground floor on this side. Floors above it stay open.
    else if (gw && s.floors > 1 && s.neigh !== 'both') { sideWin(1, -0.28, 1); sideWin(1, 0.42, 1); }
    if (!flat) {
      const gableLight = sign => {
        const sx = x0 + sign * ((W + 0.3) / 2 + 0.03);
        pwin.g.add(box(0.05, 0.32, 0.38, revealMat, sx, H + 0.28, 0));
        pwin.g.add(box(0.05, 0.22, 0.26, frameMat, sx + sign * 0.03, H + 0.28, 0));
        pwin.g.add(pane(0.05, 0.16, 0.18, sx + sign * 0.05, H + 0.28, 0));
      };
      // Hip roofs have no gable face. A shared wall buries the end it covers.
      if (s.neigh && s.neigh !== 'left' && s.neigh !== 'both') gableLight(-1);
      if (s.neigh && s.neigh !== 'both') gableLight(1);
    }
    if (gw) {
      pwin.g.add(box(0.52, 0.38, 0.04, revealMat, gx, 0.62, gBack - 0.02));
      pwin.g.add(box(0.4, 0.26, 0.04, frameMat, gx, 0.62, gBack - 0.05));
      pwin.g.add(pane(0.3, 0.16, 0.03, gx, 0.62, gBack - 0.07));
      pwin.g.add(box(Math.min(0.7, gw - 0.4), 0.22, 0.04, revealMat, gx, 0.86, gFront + 0.02));
      pwin.g.add(pane(Math.min(0.56, gw - 0.52), 0.14, 0.03, gx, 0.86, gFront + 0.06));
      pwin.g.add(box(0.05, 0.42, 0.48, revealMat, gx + gw / 2 + 0.02, 0.58, gZ));
      pwin.g.add(box(0.04, 0.32, 0.36, frameMat, gx + gw / 2 + 0.05, 0.58, gZ));
      pwin.g.add(pane(0.025, 0.22, 0.26, gx + gw / 2 + 0.07, 0.58, gZ));
    }

    // roof, dropped into the wall so the soffit is not coplanar with the wall top
    const pr = part('roof');
    const roofMat = dirtyMat(pr, C.roofDirty, C.roof, { roughness: 0.9, flatShading: true });
    const RH = 0.85, RD = Dp + 0.3, RW = W + 0.3;
    const roofSink = 0.05;
    let slope = 0;
    if (flat) {
      pr.g.add(box(W + 0.08, 0.1, Dp + 0.08, roofMat, x0, H + 0.02, 0));
      const par = dirtyMat(pr, C.wallDirty, C.wall);
      pr.g.add(box(W + 0.1, 0.26, 0.1, par, x0, H + 0.16, front + 0.02));
      pr.g.add(box(W + 0.1, 0.26, 0.1, par, x0, H + 0.16, -front - 0.02));
      pr.g.add(box(0.1, 0.26, Dp, par, x0 - W / 2 - 0.02, H + 0.16, 0));
      pr.g.add(box(0.1, 0.26, Dp, par, x0 + W / 2 + 0.02, H + 0.16, 0));
      for (let i = 0; i < 10 + s.bays * 2; i++) {
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.12 + r() * 0.22, 7), decalMat(C.grime, 0.4));
        m.rotation.x = -Math.PI / 2; m.position.set(x0 + (r() - 0.5) * (W - 0.4), H + 0.095, (r() - 0.5) * (Dp - 0.4));
        grime(pr, m, 'fade');
      }
      if (gw) {
        pr.g.add(box(gw + 0.08, 0.08, gDepth + 0.08, roofMat, gx, 0.98, gZ));
        const lip = dirtyMat(pr, C.wallDirty, C.wall, { roughness: 0.94, flatShading: false });
        pr.g.add(box(gw + 0.1, 0.16, 0.08, lip, gx, 1.08, gFront + 0.02));
        pr.g.add(box(gw + 0.1, 0.16, 0.08, lip, gx, 1.08, gBack - 0.02));
      }
    } else {
      const roof = s.neigh ? gable(RW, RD, RH, roofMat) : hip(RW, RD, RH, roofMat);
      roof.position.set(x0, H - roofSink, 0); pr.g.add(roof);
      if (gw) { const gr = gable(gw + 0.36, gDepth + 0.4, 0.48, roofMat); gr.position.set(gx, 0.96, gZ); pr.g.add(gr); }
      slope = Math.atan2(RH, RD / 2);
      const mossMat = new THREE.MeshStandardMaterial({ color: col('#7f8f62'), roughness: 1, flatShading: true, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 });
      const ny = Math.cos(slope), nz = Math.sin(slope);
      for (let i = 0; i < 13 + s.bays * 3; i++) {
        const t = 0.15 + r() * 0.75, z = (RD / 2) * (1 - t), y = H - roofSink + RH * t;
        const half = (RW / 2) * (s.neigh ? 1 : (1 - t * 0.85)) - 0.1;
        const rad = 0.04 + r() * 0.045, lift = rad + 0.035;
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 0), mossMat);
        m.position.set(x0 + (r() * 2 - 1) * half, y + ny * lift, z + nz * lift); m.scale.y = 0.42;
        m.castShadow = false;
        grime(pr, m, 'shrink');
      }
    }
    // Chimney, embedded in the roof so the join is closed from every side.
    {
      const chim = dirtyMat(pr, C.wallDirty, C.wall, { roughness: 0.94 });
      const cap = dirtyMat(pr, C.roofDirty, C.roof, { roughness: 0.9, flatShading: true });
      const cx = x0 + Math.min(0.7, W * 0.22);
      const ch = 0.58;
      const cy = flat ? H + 0.16 + ch / 2 : H - roofSink + RH * 0.62;
      pr.g.add(box(0.32, ch, 0.32, chim, cx, cy, flat ? 0.15 : 0));
      pr.g.add(box(0.4, 0.07, 0.4, cap, cx, cy + ch / 2 + 0.02, flat ? 0.15 : 0));
    }

    // solar panels, lifted along the roof normal
    const ps = part('solar');
    const panelMat = dirtyMat(ps, C.panelDirty, C.panel, { roughness: 0.3, metalness: 0.3 });
    const frame = M('#d5dcde');
    const n = Math.max(2, Math.min(s.bays, 4));
    const arr = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const px = (i - (n - 1) / 2) * 0.52;
      arr.add(box(0.48, 0.03, 0.66, frame, px, 0.02, 0));
      arr.add(box(0.44, 0.03, 0.62, panelMat, px, 0.045, 0));
      const dust = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.62), decalMat(C.grime, 0.3));
      dust.rotation.x = -Math.PI / 2; dust.position.set(px, 0.08, 0); dust.userData.local = true; dust.renderOrder = 4;
      arr.add(dust);
    }
    if (flat) { arr.rotation.x = 0.3; arr.position.set(x0 - W * 0.12, H + 0.32, -0.2); }
    else {
      const ny = Math.cos(slope), nz = Math.sin(slope), lift = 0.08;
      const sy = H - roofSink + RH * 0.45, sz = RD * 0.275;
      arr.rotation.x = slope;
      arr.position.set(x0 - (s.neigh ? 0 : RW * 0.08), sy + ny * lift, sz + nz * lift);
    }
    ps.g.add(arr);
    ps.grow = arr;
    arr.children.filter(c => c.userData.local).forEach(d => { d.userData.mode = 'fade'; d.userData.o0 = d.material.opacity; d.userData.p0 = d.position.clone(); d.userData.s0 = d.scale.clone(); ps.dirt.push(d); });

    // Gutters run around the eaves, with a downpipe at each open corner.
    const pg = part('gutters');
    const gutMat = dirtyMat(pg, C.gutDirty, C.gut, { roughness: 0.9 });
    {
      const gutH = 0.08, gutD = 0.1;
      const gutY = flat ? H + 0.02 : H - 0.16;
      const zE = (flat ? front + 0.08 : RD / 2 + 0.02) + gutD / 2;
      const xL = x0 - (flat ? W / 2 + 0.06 : RW / 2) - gutD / 2;
      const xR = x0 + (flat ? W / 2 + 0.06 : RW / 2) + gutD / 2;
      const span = xR - xL;
      pg.g.add(box(span, gutH, gutD, gutMat, x0, gutY, zE - gutD / 2));
      pg.g.add(box(span, gutH, gutD, gutMat, x0, gutY, -(zE - gutD / 2)));
      // Hip roofs and flat parapets have side eaves. A gable end does not.
      if (flat || !s.neigh) {
        if (s.neigh !== 'left' && s.neigh !== 'both') pg.g.add(box(gutD, gutH, zE * 2, gutMat, xL, gutY, 0));
        if (s.neigh !== 'both') pg.g.add(box(gutD, gutH, zE * 2, gutMat, xR, gutY, 0));
      }
      const pipeTop = gutY - gutH / 2, pipeH = Math.max(0.4, pipeTop + 0.02);
      const pipe = (x, z) => pg.g.add(box(0.1, pipeH, 0.1, gutMat, x, pipeTop - pipeH / 2, z));
      pipe(xL + 0.12, zE - gutD);
      pipe(xL + 0.12, -(zE - gutD));
      if (!s.neigh) { pipe(xR - 0.12, zE - gutD); pipe(xR - 0.12, -(zE - gutD)); }
      if (!flat) {
        const leafMat = new THREE.MeshStandardMaterial({ color: col(C.leaf), roughness: 1, flatShading: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
        for (let i = 0; i < 8 + s.bays * 2; i++) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.05), leafMat);
          const frontLeaf = r() > 0.45;
          m.position.set(x0 + (r() - 0.5) * (span - 0.3), gutY + gutH / 2 + 0.012, (frontLeaf ? 1 : -1) * (zE - gutD) + (r() - 0.5) * 0.04);
          m.rotation.set(r() * 0.4, r() * 3, r() * 0.4);
          m.castShadow = false;
          grime(pg, m, 'fall');
        }
      } else {
        for (let i = 0; i < Math.max(2, s.bays - 1); i++) {
          const sx = x0 - W / 2 + 0.6 + i * ((W - 1.2) / Math.max(1, Math.max(2, s.bays - 1) - 1));
          const stain = new THREE.Mesh(new THREE.PlaneGeometry(0.16, H * 0.7), decalMat(C.streak, 0.3));
          stain.position.set(sx, H * 0.62, front + 0.02); grime(pg, stain, 'fade');
        }
      }
    }

    // Path and driveway are separate strips that run out to the lawn, joined by a
    // shallow threshold so they read as one flush surface, not a doormat.
    const pd = part('driveway');
    const pp = part('patio');
    const dw = gw ? gw + 0.15 : 1.28, dx0 = gw ? gx : x0 + W / 2 - dw / 2 - 0.05;
    const lawnSx = lawnW * lawnFit, lawnSy = lawnD * lawnFit;
    const lawnLimit = 0.62;
    const onLawn = (x, z) => {
      const u = (x - cx) / lawnSx, v = (z - cz) / lawnSy;
      return Math.hypot(u, v) * 2 <= lawnLimit;
    };
    const near = front + 0.02;
    const pathW = 0.72;
    const driveW0 = gw ? Math.max(gw + 0.12, dw) : 1.28;
    let pathL = doorX - pathW / 2, pathR = doorX + pathW / 2;
    let driveL = dx0 - driveW0 / 2, driveR = dx0 + driveW0 / 2;
    if (pathR > driveL && pathL < driveR) {
      if (dx0 >= doorX) { driveL = pathR + 0.1; driveR = driveL + driveW0; }
      else { driveR = pathL - 0.1; driveL = driveR - driveW0; }
    }
    let driveCx = (driveL + driveR) / 2, driveHalf = (driveR - driveL) / 2;
    while (driveHalf > 0.42 && !(onLawn(driveCx - driveHalf, near + 0.2) && onLawn(driveCx + driveHalf, near + 0.2))) driveHalf -= 0.03;
    driveL = driveCx - driveHalf;
    driveR = driveCx + driveHalf;
    const reach = (x, half) => {
      let best = near + 0.28;
      for (let z = best; z <= front + 5.5; z += 0.02) {
        if (onLawn(x - half, z) && onLawn(x + half, z)) best = z;
        else break;
      }
      return best;
    };
    const pathFar = reach(doorX, pathW / 2);
    const driveFar = reach(driveCx, driveHalf);
    const apronFar = near + 0.34;
    const apronL = Math.min(pathL, driveL), apronR = Math.max(pathR, driveR);
    const seam = driveCx >= doorX ? (Math.min(pathR, driveL) + Math.max(pathR, driveL)) / 2 : (Math.min(driveR, pathL) + Math.max(driveR, pathL)) / 2;
    const paveU = {
      driveA: { value: col(C.paveDirty) }, driveB: { value: col(C.pave) },
      patioA: { value: col(C.paveDirty) }, patioB: { value: col(C.pave) },
      driveK: { value: 0 }, patioK: { value: 0 }, seam: { value: seam },
    };
    const paveMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, metalness: 0 });
    paveMat.polygonOffset = true;
    paveMat.polygonOffsetFactor = -2;
    paveMat.polygonOffsetUnits = -2;
    paveMat.customProgramCacheKey = () => 'gleam-pave-plate';
    paveMat.userData.driveK = paveU.driveK;
    paveMat.userData.patioK = paveU.patioK;
    paveMat.onBeforeCompile = shader => {
      shader.uniforms.uDriveA = paveU.driveA;
      shader.uniforms.uDriveB = paveU.driveB;
      shader.uniforms.uPatioA = paveU.patioA;
      shader.uniforms.uPatioB = paveU.patioB;
      shader.uniforms.uDriveK = paveU.driveK;
      shader.uniforms.uPatioK = paveU.patioK;
      shader.uniforms.uSeam = paveU.seam;
      shader.vertexShader = 'varying float vPaveX;\n' + shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvPaveX = (modelMatrix * vec4(transformed, 1.0)).x;'
      );
      shader.fragmentShader = 'varying float vPaveX;\nuniform vec3 uDriveA;\nuniform vec3 uDriveB;\nuniform vec3 uPatioA;\nuniform vec3 uPatioB;\nuniform float uDriveK;\nuniform float uPatioK;\nuniform float uSeam;\n' + shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float side = smoothstep(uSeam - 0.05, uSeam + 0.05, vPaveX);
        vec3 driveCol = mix(uDriveA, uDriveB, uDriveK);
        vec3 patioCol = mix(uPatioA, uPatioB, uPatioK);
        diffuseColor.rgb = mix(patioCol, driveCol, side);`
      );
    };
    pd.mats.push(paveMat);
    pp.mats.push(paveMat);
    const unionOutline = rects => {
      const eps = 1e-4;
      const xs = [], zs = [];
      rects.forEach(rc => { xs.push(rc.l, rc.r); zs.push(rc.n, rc.f); });
      const uniq = arr => {
        arr.sort((a, b) => a - b);
        const o = [];
        arr.forEach(v => { if (!o.length || v - o[o.length - 1] > eps) o.push(v); });
        return o;
      };
      const X = uniq(xs), Z = uniq(zs);
      const nx = X.length - 1, nz = Z.length - 1;
      const inside = (i, j) => {
        if (i < 0 || j < 0 || i >= nx || j >= nz) return false;
        const mx = (X[i] + X[i + 1]) / 2, mz = (Z[j] + Z[j + 1]) / 2;
        return rects.some(rc => mx >= rc.l - eps && mx <= rc.r + eps && mz >= rc.n - eps && mz <= rc.f + eps);
      };
      const key = (i, j) => i + ',' + j;
      const adj = new Map();
      const link = (a, b) => {
        const k = key(a[0], a[1]);
        if (!adj.has(k)) adj.set(k, []);
        adj.get(k).push(b);
      };
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        if (!inside(i, j)) continue;
        if (!inside(i - 1, j)) link([i, j + 1], [i, j]);
        if (!inside(i + 1, j)) link([i + 1, j], [i + 1, j + 1]);
        if (!inside(i, j - 1)) link([i, j], [i + 1, j]);
        if (!inside(i, j + 1)) link([i + 1, j + 1], [i, j + 1]);
      }
      let start = null;
      adj.forEach((_, k) => { if (start === null || k < start) start = k; });
      const raw = [];
      let cur = start.split(',').map(Number);
      const used = new Set();
      const origin = cur.slice();
      for (let n = 0; n < 80; n++) {
        raw.push(new THREE.Vector2(X[cur[0]], -Z[cur[1]]));
        const opts = (adj.get(key(cur[0], cur[1])) || []).filter(p => !used.has(key(cur[0], cur[1]) + '>' + key(p[0], p[1])));
        if (!opts.length) break;
        const nxt = opts[0];
        used.add(key(cur[0], cur[1]) + '>' + key(nxt[0], nxt[1]));
        if (nxt[0] === origin[0] && nxt[1] === origin[1]) break;
        cur = nxt;
      }
      let area = 0;
      for (let i = 0; i < raw.length; i++) {
        const p = raw[i], q = raw[(i + 1) % raw.length];
        area += p.x * q.y - q.x * p.y;
      }
      if (area < 0) raw.reverse();
      return raw;
    };
    const roundedShape = (pts, rad) => {
      const shape = new THREE.Shape();
      const N = pts.length;
      const at = i => pts[(i + N) % N];
      for (let i = 0; i < N; i++) {
        const a = at(i - 1), b = at(i), c = at(i + 1);
        const abx = b.x - a.x, aby = b.y - a.y, bcx = c.x - b.x, bcy = c.y - b.y;
        const lab = Math.hypot(abx, aby) || 1, lbc = Math.hypot(bcx, bcy) || 1;
        const cross = abx * bcy - aby * bcx;
        const rr = Math.min(rad, lab * 0.45, lbc * 0.45);
        if (cross <= 1e-5 || rr < 0.02) {
          if (i === 0) shape.moveTo(b.x, b.y);
          else shape.lineTo(b.x, b.y);
          continue;
        }
        const p1x = b.x - (abx / lab) * rr, p1y = b.y - (aby / lab) * rr;
        const p2x = b.x + (bcx / lbc) * rr, p2y = b.y + (bcy / lbc) * rr;
        if (i === 0) shape.moveTo(p1x, p1y);
        else shape.lineTo(p1x, p1y);
        shape.quadraticCurveTo(b.x, b.y, p2x, p2y);
      }
      shape.closePath();
      return shape;
    };
    const platePts = unionOutline([
      { l: pathL, r: pathR, n: near, f: pathFar },
      { l: driveL, r: driveR, n: near, f: driveFar },
      { l: apronL, r: apronR, n: near, f: apronFar },
    ]);
    const plateShape = roundedShape(platePts, 0.14);
    const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
      depth: 0.012, bevelEnabled: false, curveSegments: 4,
    });
    plateGeo.rotateX(-Math.PI / 2);
    plateGeo.computeBoundingBox();
    plateGeo.translate(0, -0.012 - plateGeo.boundingBox.max.y, 0);
    const plate = new THREE.Mesh(plateGeo, paveMat);
    plate.castShadow = false;
    plate.receiveShadow = false;
    plate.renderOrder = 2;
    plate.userData.frame = false;
    root.add(plate);
    const plateTop = -0.012;
    const pickMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, toneMapped: false });
    const pickStrip = (parent, l, r, z0, z1) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.2, r - l), 0.06, Math.max(0.2, z1 - z0)), pickMat);
      m.position.set((l + r) / 2, plateTop, (z0 + z1) / 2);
      m.castShadow = false;
      m.receiveShadow = false;
      parent.add(m);
    };
    pickStrip(pd.g, driveL, driveR, near, driveFar);
    pickStrip(pp.g, pathL, pathR, near, pathFar);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.07 + r() * 0.1, 8), decalMat(C.grime, 0.45));
      m.rotation.x = -Math.PI / 2;
      m.position.set(driveL + 0.12 + r() * Math.max(0.2, driveR - driveL - 0.24), plateTop + 0.02, near + 0.16 + r() * Math.max(0.2, driveFar - near - 0.32));
      grime(pd, m, 'fade');
    }
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.06 + r() * 0.08, 7), decalMat(i % 2 ? C.moss : C.grime, 0.45));
      m.rotation.x = -Math.PI / 2;
      m.position.set(pathL + 0.1 + r() * Math.max(0.16, pathR - pathL - 0.2), plateTop + 0.02, near + 0.18 + r() * Math.max(0.2, pathFar - near - 0.36));
      grime(pp, m, 'fade');
    }

    if (!s.neigh) {
      const t = new THREE.Group();
      const trunk = M('#6b5340', { roughness: 0.95, flatShading: false });
      const leaf = M('#4e6b38', { roughness: 0.94, flatShading: true });
      const leaf2 = M('#6d8b4a', { roughness: 0.92, flatShading: true });
      t.add(box(0.12, 0.36, 0.12, trunk, 0, 0.18, 0));
      const puff = (mat, rad, x, y, z) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        t.add(m);
      };
      puff(leaf, 0.34, 0, 0.62, 0);
      puff(leaf2, 0.26, 0.2, 0.78, 0.08);
      puff(leaf, 0.22, -0.18, 0.74, -0.06);
      t.position.set(-(W + gw) / 2 - 0.55, 0, 0.15);
      root.add(t);
    }

    pivot.position.x = -x0 * 0.15;
    const span = Math.max(W + gw, H + 2, Dp);
    sun.position.set(span * 0.9 + 4, H + 7.5, span * 0.35 + 5);
    fill.position.set(-span - 4, H * 0.85 + 4, -span * 0.2 - 3);
    sun.target.position.set(0, H * 0.35, 0);
    sun.target.updateMatrixWorld();
    Object.values(parts).forEach(applyClean);
    captureFrame();
    resize();
  }

  function gable(w, d, h, mat) {
    const sh = new THREE.Shape();
    sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, h); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false });
    g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2);
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  function hip(w, d, h, mat) {
    const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
    g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); g.scale(w, h, d);
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function applyClean(p) {
    const c = p.clean, e = c * c * (3 - 2 * c);
    p.mats.forEach(m => {
      if (m.userData.driveK && p.id === 'driveway') m.userData.driveK.value = e;
      else if (m.userData.patioK && p.id === 'patio') m.userData.patioK.value = e;
      else if (m.userData.a) m.color.copy(m.userData.a).lerp(m.userData.b, e);
    });
    if (p.grow) p.grow.scale.setScalar(0.4 + 0.6 * e);
    p.dirt.forEach(d => {
      const u = d.userData;
      if (u.mode === 'fade') d.material.opacity = u.o0 * (1 - e);
      else if (u.mode === 'shrink') { const k = Math.max(0.001, 1 - e); d.scale.set(u.s0.x * k, u.s0.y * k, u.s0.z * k); }
      else if (u.mode === 'fall') {
        const k = Math.min(1, Math.max(0, c * 1.25 - u.r * 0.25));
        d.position.set(u.p0.x + k * (u.r - 0.5) * 0.6, u.p0.y - k * k * (spec ? spec.floors + 0.6 : 2), u.p0.z + k * 0.5);
        d.rotation.z = k * 6 * u.r;
        d.visible = k < 0.98;
      }
    });
  }

  function glassShine(mesh, mat) {
    const g = mesh.geometry.parameters;
    const dims = [g.width, g.height, g.depth];
    let thin = 0;
    if (dims[1] <= dims[thin]) thin = 1;
    if (dims[2] <= dims[thin]) thin = 2;
    const geo = thin === 0
      ? new THREE.PlaneGeometry(dims[2], dims[1])
      : new THREE.PlaneGeometry(dims[0], dims[1]);
    const plane = new THREE.Mesh(geo, mat);
    plane.castShadow = false;
    plane.receiveShadow = false;
    plane.renderOrder = 6;
    plane.userData.frame = false;
    const lift = dims[thin] / 2 + 0.01;
    if (thin === 0) {
      const s = Math.sign(mesh.position.x) || 1;
      plane.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      plane.position.x = s * lift;
    } else {
      const s = Math.sign(mesh.position.z) || 1;
      if (s < 0) plane.rotation.y = Math.PI;
      plane.position.z = s * lift;
    }
    mesh.add(plane);
    return plane;
  }

  // a sweep of light across the part, a glow, and spray particles
  function wash(id) {
    const p = parts[id];
    if (!p || reduced) return;
    if (id === 'windows') {
      const panes = [];
      p.g.traverse(o => { if (o.userData && o.userData.pane) panes.push(o); });
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
        uniforms: { uT: { value: 0 }, uA: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'varying vec2 vUv; uniform float uT; uniform float uA; void main(){ float y = vUv.y - (1.15 - uT * 1.45); float band = exp(-pow(y / 0.065, 2.0)); float side = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x); gl_FragColor = vec4(1.0, 1.0, 1.0, band * side * 0.5 * uA); }',
      });
      const planes = panes.map(mesh => glassShine(mesh, mat));
      fxList.push({ p, mode: 'glass', planes, shine: mat, t0: performance.now(), dur: 1300 });
      return;
    }
    const bb = new THREE.Box3().setFromObject(p.g);
    if (bb.isEmpty()) return;
    const size = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    const horiz = size.y < 0.25;
    if (horiz) { sheet.rotation.x = -Math.PI / 2; sheet.scale.set(0.35, size.z + 0.2, 1); }
    else sheet.scale.set(size.x + 0.2, 0.3, 1);
    root.add(sheet);
    const N = 70, pos = new Float32Array(N * 3), vel = [];
    for (let i = 0; i < N; i++) vel.push(new THREE.Vector3((Math.random() - 0.5) * 1.4, Math.random() * 1.6 + 0.4, Math.random() * 1.2));
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.9, depthWrite: false }));
    root.add(pts);
    fxList.push({ p, sheet, pts, vel, bb, size, ctr, horiz, t0: performance.now(), dur: 1300 });
  }

  function stepFx(now, dt) {
    fxList = fxList.filter(f => {
      const t = (now - f.t0) / f.dur;
      if (f.mode === 'glass') {
        if (t >= 1) {
          f.planes.forEach(pl => { if (pl.parent) pl.parent.remove(pl); pl.geometry.dispose(); });
          f.shine.dispose();
          return false;
        }
        const u = Math.min(1, t);
        f.shine.uniforms.uT.value = u;
        f.shine.uniforms.uA.value = Math.sin(Math.PI * u);
        return true;
      }
      if (t >= 1) {
        root.remove(f.sheet, f.pts); f.sheet.geometry.dispose(); f.sheet.material.dispose(); f.pts.geometry.dispose(); f.pts.material.dispose();
        f.p.mats.forEach(m => m.emissive && m.emissive.setScalar(0));
        return false;
      }
      const a = Math.sin(Math.PI * Math.min(1, t * 1.2));
      f.sheet.material.opacity = 0.55 * a;
      let lx, ly, lz;
      if (f.horiz) { lx = f.bb.min.x + (f.size.x + 0.4) * t - 0.2; ly = f.bb.max.y + 0.03; lz = f.ctr.z; }
      else { lx = f.ctr.x; ly = f.bb.max.y - (f.size.y + 0.2) * t; lz = f.bb.max.z + 0.05; }
      f.sheet.position.set(lx, ly, lz);
      const glow = 0.28 * a;
      f.p.mats.forEach(m => m.emissive && m.emissive.setScalar(glow));
      const arr = f.pts.geometry.attributes.position.array;
      for (let i = 0; i < f.vel.length; i++) {
        const age = Math.max(0, t * 1.3 - (i / f.vel.length) * 0.5), v = f.vel[i];
        const jitter = (i * 0.37) % 1 - 0.5;
        const bx = f.horiz ? lx : f.ctr.x + jitter * f.size.x, by = f.horiz ? ly : ly, bz = f.horiz ? f.ctr.z + jitter * f.size.z : lz;
        arr[i * 3] = bx + v.x * age * 0.5; arr[i * 3 + 1] = by + v.y * age * 0.5 - 2.2 * age * age; arr[i * 3 + 2] = bz + v.z * age * 0.5;
      }
      f.pts.geometry.attributes.position.needsUpdate = true;
      f.pts.material.opacity = 0.9 * (1 - t);
      return true;
    });
  }

  function setSel(s) {
    sel = { ...s };
    const now = performance.now();
    Object.values(parts).forEach(p => {
      const next = sel[p.id] ? 1 : 0;
      if (next === p.target) return;
      p.from = p.clean;
      p.since = now;
      p.target = next;
    });
  }
  function ageClean(now) {
    Object.values(parts).forEach(p => {
      if (p.clean === p.target) return;
      const dur = reduced ? 1 : 520;
      const t = Math.min(1, (now - p.since) / dur);
      p.clean = p.from + (p.target - p.from) * t;
      if (t >= 1) { p.clean = p.target; p.since = 0; }
      applyClean(p);
    });
  }

  // Orbit the camera. Yaw is unbounded. Elevation tilts, clamped like the estimator.
  const VIEW = { az: 0.42, el: 0.37, sway: 0.26, swaySpeed: 0.2, fov: 30 };
  const phoneLayout = () => (window.innerWidth || host.clientWidth || 1200) < 960;
  const camFov = () => phoneLayout() ? 16 : VIEW.fov;
  const viewLimit = () => phoneLayout() ? 0.97 : 0.84;
  const EL_MIN = 0.05, EL_MAX = 0.95;
  let yaw = 0, yawT = 0, velYaw = 0, el = VIEW.el, elT = VIEW.el, velEl = 0;
  let drag = null, lastInput = -1e9, idlePhase = 0, hold = false;
  let sphere = null, dist = NaN, distV = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(x, y) {
    const b = canvas.getBoundingClientRect();
    ndc.set(((x - b.left) / b.width) * 2 - 1, -((y - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(Object.values(parts).map(p => p.g), true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.part) o = o.parent;
      if (o && (h.object.visible !== false)) return o.userData.part;
    }
    return null;
  }
  canvas.addEventListener('pointerdown', e => {
    hold = false;
    drag = { x: e.clientX, y: e.clientY, yaw: yawT, el: elT, t: performance.now(), moved: false, lt: performance.now(), mode: null, pid: e.pointerId, type: e.pointerType, captured: false };
    velYaw = 0; velEl = 0;
    lastInput = performance.now();
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || drag.pid !== e.pointerId) {
      if (!drag && e.pointerType === 'mouse') canvas.style.cursor = pick(e.clientX, e.clientY) ? 'pointer' : 'grab';
      return;
    }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.mode) {
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
      // A vertical swipe scrolls the page. A drag that leads sideways is a turn,
      // and its vertical part tilts. Mouse always orbits.
      if (drag.type !== 'mouse' && Math.abs(dy) > Math.abs(dx) * 1.25 && Math.abs(dx) < 16) drag.mode = 'scroll';
      else drag.mode = 'orbit';
      if (drag.mode === 'scroll') drag.moved = true;
    }
    if (drag.mode !== 'orbit') return;
    if (!drag.captured) {
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* pointer already gone */ }
      drag.captured = true;
    }
    drag.moved = true;
    const nextYaw = drag.yaw + dx * 0.008;
    const nextEl = Math.max(EL_MIN, Math.min(EL_MAX, drag.el + dy * 0.0045));
    const now = performance.now();
    const dtm = Math.max(8, now - drag.lt) / 1000;
    velYaw = Math.max(-2.8, Math.min(2.8, (nextYaw - yawT) / dtm));
    velEl = Math.max(-1.4, Math.min(1.4, (nextEl - elT) / dtm));
    drag.lt = now;
    yawT = nextYaw;
    elT = nextEl;
    lastInput = now;
  });
  const end = e => {
    if (!drag || (e && drag.pid !== e.pointerId)) return;
    const d = drag; drag = null;
    if (d.mode === 'scroll') return;
    if (!d.moved && performance.now() - d.t < 600) { const id = pick(e.clientX, e.clientY); if (id && opts.onTap) opts.onTap(id); }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', () => { drag = null; });

  const _pivotPos = new THREE.Vector3();
  const _look = new THREE.Vector3();

  function captureFrame() {
    pivot.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(pivot.matrixWorld).invert();
    const pts = [];
    const corner = new THREE.Vector3();
    root.traverse(o => {
      if (!o.isMesh || !o.geometry || o.userData.ground || o.userData.frame === false) return;
      if (o.material && (o.material.transparent || o.material.colorWrite === false)) return;
      const geo = o.geometry;
      if (o.userData.plate) {
        const rad = o.userData.plate;
        for (let k = 0; k < 24; k++) {
          const ang = (k / 24) * Math.PI * 2;
          corner.set(Math.cos(ang) * rad, Math.sin(ang) * rad, 0).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
          pts.push(corner.x, corner.y, corner.z);
        }
        return;
      }
      if (geo.type === 'CylinderGeometry') {
        const rad = Math.max(geo.parameters.radiusTop || 0, geo.parameters.radiusBottom || 0);
        const h = geo.parameters.height || 0;
        for (let k = 0; k < 24; k++) {
          const ang = (k / 24) * Math.PI * 2;
          for (const y of [-h / 2, h / 2]) {
            corner.set(Math.cos(ang) * rad, y, Math.sin(ang) * rad).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
            pts.push(corner.x, corner.y, corner.z);
          }
        }
        return;
      }
      // Boxes are their corners. Roofs and other meshes use real vertices so a
      // loose bounding box does not hold the camera back from the silhouette.
      if (geo.type === 'BoxGeometry') {
        if (!geo.boundingBox) geo.computeBoundingBox();
        const bb = geo.boundingBox;
        for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
          corner.set(x, y, z).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
          pts.push(corner.x, corner.y, corner.z);
        }
        return;
      }
      const pos = geo.attributes && geo.attributes.position;
      if (!pos) return;
      const stride = Math.max(1, Math.floor(pos.count / 28));
      for (let i = 0; i < pos.count; i += stride) {
        corner.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
        pts.push(corner.x, corner.y, corner.z);
      }
    });
    framePts = pts;
    if (pts.length < 3) { sphere = null; return; }
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let p = 0; p < pts.length; p += 3) {
      const x = pts[p], y = pts[p + 1], z = pts[p + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
    let rad = 0.001;
    for (let p = 0; p < pts.length; p += 3) {
      const d = Math.hypot(pts[p] - cx, pts[p + 1] - cy, pts[p + 2] - cz);
      if (d > rad) rad = d;
    }
    sphere = { cx, cy, cz, r: rad * 1.04 };
  }

  let fitKey = '';
  let fitDist = 14;
  let fitEls = null;
  let fitYaws = null;
  let fitGrid = null;
  function sphereDist() {
    const half = THREE.MathUtils.degToRad(camFov() / 2);
    const tanV = Math.tan(half);
    const tanH = tanV * Math.max(0.4, camera.aspect || 1.4);
    const ang = Math.atan(Math.min(tanV, tanH) * 0.96);
    return sphere.r / Math.max(0.12, Math.sin(ang));
  }
  function fitDistanceAt(elValue, limit) {
    const yaws = [0.42, 0.42 + Math.PI / 2, 0.42 + Math.PI, 0.42 - Math.PI / 2, Math.PI / 5, Math.PI * 1.25];
    const fits = d => {
      for (const az of yaws) {
        yaw = VIEW.az - az;
        el = elValue;
        applyCamera(d);
        const cov = projectSpan(limit);
        if (!cov || cov.outside) return false;
      }
      return true;
    };
    const upper = sphereDist();
    let lo = upper * 0.32, hi = upper;
    if (!fits(hi)) hi = upper * 1.55;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    return hi;
  }
  function fitOne(az, elValue, limit) {
    const fits = d => {
      yaw = VIEW.az - az;
      el = elValue;
      applyCamera(d);
      const cov = projectSpan(limit);
      return !!(cov && !cov.outside);
    };
    const upper = sphereDist();
    let lo = upper * 0.28, hi = upper;
    if (!fits(hi)) hi = upper * 1.7;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    return hi;
  }
  function sampleGrid(az, e) {
    const yaws = fitYaws, n = yaws.length, span = Math.PI * 2;
    let u = (az - yaws[0]) % span;
    if (u < 0) u += span;
    const step = span / n;
    const i = Math.floor(u / step) % n;
    const f = (u - i * step) / step;
    const i2 = (i + 1) % n;
    const els = fitEls;
    let j = 0;
    while (j < els.length - 2 && e > els[j + 1]) j++;
    const t = (e - els[j]) / Math.max(1e-4, els[j + 1] - els[j]);
    const tt = Math.min(1, Math.max(0, t));
    const d0 = fitGrid[j][i] * (1 - f) + fitGrid[j][i2] * f;
    const d1 = fitGrid[j + 1][i] * (1 - f) + fitGrid[j + 1][i2] * f;
    return d0 * (1 - tt) + d1 * tt;
  }
  function targetDist() {
    if (!sphere) return 14;
    const limit = viewLimit();
    const phone = phoneLayout();
    const key = (camera.aspect || 1).toFixed(3) + ':' + sphere.r.toFixed(3) + ':' + sphere.cx.toFixed(2) + ':' + sphere.cz.toFixed(2) + ':' + limit + ':' + camFov() + ':' + (phone ? 'p' : 'd');
    if (key !== fitKey) {
      const savedYaw = yaw, savedEl = el;
      const upper = sphereDist();
      const yaws = [0.42, 0.42 + Math.PI / 2, 0.42 + Math.PI, 0.42 - Math.PI / 2, Math.PI / 5, Math.PI * 1.25];
      if (!phone) {
        const els = [EL_MIN, VIEW.el, EL_MAX];
        const fits = d => {
          for (const az of yaws) {
            for (const e of els) {
              yaw = VIEW.az - az;
              el = e;
              applyCamera(d);
              const cov = projectSpan(limit);
              if (!cov || cov.outside) return false;
            }
          }
          return true;
        };
        let lo = upper * 0.38, hi = upper;
        if (!fits(hi)) hi = upper * 1.35;
        for (let i = 0; i < 11; i++) {
          const mid = (lo + hi) / 2;
          if (fits(mid)) hi = mid;
          else lo = mid;
        }
        fitDist = hi;
        fitEls = null;
        fitYaws = null;
        fitGrid = null;
      } else {
        fitYaws = [];
        for (let i = 0; i < 8; i++) fitYaws.push(0.42 + i * Math.PI / 4);
        fitEls = [EL_MIN, 0.2, VIEW.el, 0.58, 0.78, EL_MAX];
        fitGrid = fitEls.map(e => fitYaws.map(az => fitOne(az, e, limit)));
        fitDist = 14;
      }
      yaw = savedYaw;
      el = savedEl;
      fitKey = key;
    }
    if (!fitGrid) return fitDist;
    return sampleGrid(VIEW.az - yaw, Math.max(EL_MIN, Math.min(EL_MAX, Math.max(el, elT))));
  }
  function springStep(x, v, target, k, c, dt) {
    const nv = v + (k * (target - x) - c * v) * dt;
    return [x + nv * dt, nv];
  }
  function applyCamera(d) {
    if (!sphere) return;
    const az = VIEW.az - yaw;
    const ce = Math.cos(el);
    pivot.getWorldPosition(_pivotPos);
    _look.set(_pivotPos.x + sphere.cx, _pivotPos.y + sphere.cy, _pivotPos.z + sphere.cz);
    camera.position.set(
      _look.x + Math.sin(az) * ce * d,
      _look.y + Math.sin(el) * d,
      _look.z + Math.cos(az) * ce * d
    );
    camera.up.set(0, 1, 0);
    // Phone: sit the roof higher so the lawn fade stays on the canvas.
    if (phoneLayout()) _look.y -= sphere.r * 0.22;
    camera.lookAt(_look);
    const near = Math.max(0.08, (d - sphere.r) * 0.45);
    camera.near = Math.min(near, Math.max(0.08, d * 0.25));
    camera.far = d + sphere.r * 3.2;
    camera.fov = camFov();
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
  }
  function projectSpan(limit) {
    const pts = framePts;
    if (!pts || pts.length < 3) return null;
    pivot.updateWorldMatrix(true, true);
    let maxX = 0, maxY = 0, minX = 0, minY = 0, outside = false;
    const corner = new THREE.Vector3();
    for (let p = 0; p < pts.length; p += 3) {
      corner.set(pts[p], pts[p + 1], pts[p + 2]).applyMatrix4(pivot.matrixWorld).project(camera);
      if (corner.x < minX) minX = corner.x;
      if (corner.x > maxX) maxX = corner.x;
      if (corner.y < minY) minY = corner.y;
      if (corner.y > maxY) maxY = corner.y;
      const ax = Math.abs(corner.x), ay = Math.abs(corner.y);
      if (ax > limit || ay > limit || corner.z < -1 || corner.z > 1) outside = true;
    }
    return { maxX: Math.max(Math.abs(minX), maxX), maxY: Math.max(Math.abs(minY), maxY), minX, minY, hiX: maxX, hiY: maxY, outside };
  }
  function frameHouse() {
    const td = targetDist();
    if (Number.isNaN(dist) || td > dist * 1.01) { dist = td; distV = 0; }
    applyCamera(Number.isNaN(dist) ? td : dist);
  }

  let viewW = -1, viewH = -1;
  function resize(fromObserver) {
    const w = host.clientWidth || 360;
    // The stage column is narrower than the window, so desktop has to be
    // detected from the viewport. A taller canvas keeps the house from sitting
    // in a short wide strip.
    const wide = !phoneLayout();
    const vh = window.innerHeight || 700;
    // Phone: a taller stage narrows the horizontal view so the front of the
    // house can fill the width without the top-down orbit leaving the frame.
    const h = Math.round(wide ? Math.min(w / 1.12, vh * 0.74) : Math.min(w / 1.18, vh * 0.48));
    // A language switch can notify the observer without changing the drawing size.
    // Skip that so the camera is not framed again. A real rebuild still reframes.
    if (fromObserver && (!host.clientWidth || (w === viewW && h === viewH))) return;
    viewW = w;
    viewH = h;
    canvas.style.height = h + 'px';
    renderer.setPixelRatio(pixelScale());
    renderer.setSize(w, h, false);
    if (composer) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
      const pr = renderer.getPixelRatio();
      fxaaPass.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
    }
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    frameHouse();
    draw();
  }
  const ro = new ResizeObserver(() => resize(true)); ro.observe(host);

  let visible = true, raf = 0, last = performance.now(), frames = [];
  const io = new IntersectionObserver(entries => {
    const was = visible;
    visible = entries.some(en => en.isIntersecting);
    if (visible && !was) draw();
  });
  io.observe(canvas);
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden) {
      ageClean(now);
      if (now < themeUntil) { sampleStage(); draw(); }
      last = now;
      return;
    }
    const elapsed = Math.min(0.25, (now - last) / 1000);
    const dt = Math.min(0.05, elapsed); last = now;
    frames.push(now); if (frames.length > 90) frames.shift();
    ageClean(now);
    stepFx(now, dt);
    if (now < themeUntil) sampleStage();
    const orbiting = drag && drag.mode === 'orbit';
    if (orbiting) {
      yaw += (yawT - yaw) * (1 - Math.exp(-dt * 22));
      el += (elT - el) * (1 - Math.exp(-dt * 22));
    } else if (!drag && (Math.abs(velYaw) > 0.02 || Math.abs(yawT - yaw) > 0.0015 || Math.abs(velEl) > 0.02 || Math.abs(elT - el) > 0.0015)) {
      yawT += velYaw * dt;
      elT = Math.max(EL_MIN, Math.min(EL_MAX, elT + velEl * dt));
      if (elT <= EL_MIN + 1e-4 || elT >= EL_MAX - 1e-4) velEl = 0;
      velYaw *= Math.exp(-dt * 3.4);
      velEl *= Math.exp(-dt * 4.2);
      yaw += (yawT - yaw) * (1 - Math.exp(-dt * 22));
      el += (elT - el) * (1 - Math.exp(-dt * 22));
      if (Math.abs(velYaw) <= 0.02) velYaw = 0;
      if (Math.abs(velEl) <= 0.02) velEl = 0;
    } else if (!drag && !hold && !reduced && now - lastInput > 2500) {
      idlePhase += dt * VIEW.swaySpeed;
      const aimYaw = -VIEW.sway * Math.sin(idlePhase);
      yaw += (aimYaw - yaw) * (1 - Math.exp(-dt * 0.8));
      yawT = yaw;
      el += (VIEW.el - el) * (1 - Math.exp(-dt * 1.4));
      elT = el;
    }
    const td = targetDist();
    if (Number.isNaN(dist)) dist = td;
    else if (reduced || td > dist) { dist = td; distV = 0; }
    else {
      const n = dt > 0.02 ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const stepped = springStep(dist, distV, td, 26, 10, dt / n);
        dist = stepped[0]; distV = stepped[1];
      }
    }
    applyCamera(dist);
    draw();
  }
  raf = requestAnimationFrame(loop);

  // test and debug hooks
  const api = {
    build, setSel, wash,
    fps: () => frames.length > 10 ? Math.round((frames.length - 1) * 1000 / (frames[frames.length - 1] - frames[0])) : 0,
    dirt: id => parts[id] ? 1 - parts[id].clean : null,
    washing: id => fxList.some(f => f.p.id === id),
    project: id => {
      const p = parts[id]; if (!p) return null;
      pivot.updateMatrixWorld(true);
      const b = canvas.getBoundingClientRect();
      // Prefer a spot in the middle of the part, with the canvas on top,
      // so a tap does not land on a one-pixel edge or on the caption.
      const meshes = []; p.g.traverse(o => { if (o.isMesh && o.visible && !(o.material && o.material.transparent)) meshes.push(o); });
      let best = null, bestScore = -1;
      const scoreAt = (x, y) => {
        if (pick(x, y) !== id) return -1;
        const top = document.elementFromPoint(x, y);
        if (top !== canvas) return -1;
        let score = 0;
        for (const d of [6, 12]) {
          if (pick(x + d, y) === id) score++;
          if (pick(x - d, y) === id) score++;
          if (pick(x, y + d) === id) score++;
          if (pick(x, y - d) === id) score++;
        }
        return score;
      };
      for (const m of meshes) {
        const bb = new THREE.Box3().setFromObject(m);
        const fr = [0.5, 0.35, 0.65, 0.2, 0.8, 0.1, 0.9];
        for (const fx of fr) for (const fy of fr) for (const fz of [0.5, 0.25, 0.75, 0, 1]) {
          const c = new THREE.Vector3(bb.min.x + (bb.max.x - bb.min.x) * fx, bb.min.y + (bb.max.y - bb.min.y) * fy, bb.min.z + (bb.max.z - bb.min.z) * fz);
          c.project(camera);
          const x = b.left + (c.x + 1) / 2 * b.width, y = b.top + (1 - c.y) / 2 * b.height;
          if (x <= b.left + 8 || x >= b.right - 8 || y <= b.top + 8 || y >= b.bottom - 8) continue;
          const score = scoreAt(x, y);
          if (score > bestScore) { bestScore = score; best = { x, y }; }
        }
      }
      return best;
    },
    parts: () => Object.keys(parts),
    setYaw(y) {
      hold = true; yaw = yawT = VIEW.az - y; velYaw = 0; velEl = 0;
      lastInput = performance.now();
      applyCamera(Number.isNaN(dist) ? targetDist() : dist);
      draw();
    },
    setTilt(t) {
      hold = true; el = elT = Math.max(EL_MIN, Math.min(EL_MAX, t)); velEl = 0; velYaw = 0;
      lastInput = performance.now();
      applyCamera(Number.isNaN(dist) ? targetDist() : dist);
      draw();
    },
    view() { return { az: VIEW.az - yaw, el, dist }; },
    coverage() { return projectSpan(0.92); },
    settleFps() { frames.length = 0; },
    msaa: () => msaa,
    pixelRatio: () => renderer.getPixelRatio(),
    paintBackdrop,
    contextAttributes() {
      const a = gl.getContextAttributes() || {};
      return {
        requested: { alpha: false, antialias: true, powerPreference: 'high-performance', stencil: false },
        alpha: !!a.alpha,
        antialias: !!a.antialias,
        powerPreference: a.powerPreference || '',
        stencil: !!a.stencil,
      };
    },
    syncTheme,
    canvas,
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); themeObs.disconnect(); if (composer) composer.dispose(); renderer.dispose(); canvas.remove(); }
  };
  host.appendChild(canvas);
  return api;
}
