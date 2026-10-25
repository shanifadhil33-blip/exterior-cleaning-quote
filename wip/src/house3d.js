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
  canvas.style.colorScheme = 'only light';
  // Three r170 ignores the alpha flag and always requests alpha:true. Create the context
  // here so the renderer is given the attributes we actually asked for.
  const requestedGL = { alpha: false, antialias: true, depth: true, stencil: false, powerPreference: 'high-performance', premultipliedAlpha: true, preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: false };
  const glContext = canvas.getContext('webgl2', requestedGL);
  if (!glContext) throw new Error('no webgl');
  const renderer = new THREE.WebGLRenderer({ canvas, context: glContext, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false });
  const gl = renderer.getContext();
  renderer.setClearAlpha(1);
  const gpuInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const gpuName = gpuInfo ? String(gl.getParameter(gpuInfo.UNMASKED_RENDERER_WEBGL) || '') : '';
  const weakGpu = /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i.test(gpuName);
  const dprCap = 2;
  const msaa = !!(gl.getContextAttributes() && gl.getContextAttributes().antialias);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1.5, 0.8, 48);
  const hemi = new THREE.HemisphereLight(0xfff7f0, 0xd0d8d6, 2.5);
  const sun = new THREE.DirectionalLight(0xffe4c4, 3.35);
  sun.position.set(5.2, 9.4, 6.6);
  sun.castShadow = true;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 28;
  sun.shadow.camera.left = -11;
  sun.shadow.camera.right = 11;
  sun.shadow.camera.top = 11;
  sun.shadow.camera.bottom = -11;
  sun.shadow.mapSize.set(weakGpu ? 512 : 1024, weakGpu ? 512 : 1024);
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.045;
  sun.shadow.radius = 2.5;
  scene.add(hemi, sun);
  const themeDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  const stageCur = new THREE.Color(0xe2e6e7);
  const STAGE_LIGHT = new THREE.Color(0xe2e6e7);
  const STAGE_DARK = new THREE.Color(0x313940);
  const HEMI_L = new THREE.Color(0xfff7f0), HEMI_D = new THREE.Color(0xfff4e8);
  const GROUND_L = new THREE.Color(0xd0d8d6), GROUND_D = new THREE.Color(0x9aa4a8);
  const SUN_L = new THREE.Color(0xffe4c4), SUN_D = new THREE.Color(0xffe8cc);
  const groundU = { radius: { value: 6 } };
  scene.background = stageCur;
  scene.fog = new THREE.Fog(0xe2e6e7, 8000, 12000);
  let themeUntil = 0;
  // 1 = light, 0 = dark, taken from the stage colour that is already on screen
  function themeMix() {
    const span = STAGE_LIGHT.r - STAGE_DARK.r;
    return THREE.MathUtils.clamp(span ? (stageCur.r - STAGE_DARK.r) / span : 1, 0, 1);
  }
  function applySceneTheme() {
    const t = themeMix();
    hemi.color.copy(HEMI_D).lerp(HEMI_L, t);
    hemi.groundColor.copy(GROUND_D).lerp(GROUND_L, t);
    hemi.intensity = 3.05 + (2.5 - 3.05) * t;
    sun.color.copy(SUN_D).lerp(SUN_L, t);
    sun.intensity = 4.05 + (3.35 - 4.05) * t;
  }
  function sampleStage() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--stage').trim();
    if (raw) stageCur.set(raw);
    else stageCur.set(themeDark() ? 0x313940 : 0xe2e6e7);
    renderer.setClearColor(stageCur, 1);
    scene.fog.color.copy(stageCur);
    canvas.style.backgroundColor = raw || (themeDark() ? '#313940' : '#e2e6e7');
    applySceneTheme();
  }
  function syncTheme() {
    sampleStage();
    themeUntil = performance.now() + 1200;
    draw();
  }
  sampleStage();
  const themeObs = new MutationObserver(syncTheme);
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
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
  const pivot = new THREE.Group();
  scene.add(pivot);
  let root = new THREE.Group();
  pivot.add(root);

  let parts = {}, fxList = [], spec = null, sel = {}, radius = 6, framePts = null;
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.8, metalness: 0, flatShading: true, ...o });
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

    // ground. A finite disc. The outer ring fades to the stage colour so the cream
    // plate does not meet the panel as a hard edge in either theme.
    radius = Math.max(5.2, (W + gw) * 0.9 + 1.5);
    groundU.radius.value = radius;
    const lawnMat = M(C.lawn, { roughness: 1, flatShading: false });
    lawnMat.customProgramCacheKey = () => 'gleam-ground';
    lawnMat.onBeforeCompile = shader => {
      shader.uniforms.uStage = { value: stageCur };
      shader.uniforms.uRadius = groundU.radius;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vGroundP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundP = position.xy;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vGroundP;\nuniform vec3 uStage;\nuniform float uRadius;')
        .replace('#include <fog_fragment>', `#include <fog_fragment>
          float gDist = length(vGroundP) / max(uRadius, 0.001);
          float gFade = smoothstep(0.72, 0.96, gDist);
          vec3 stageLin = max(uStage, vec3(0.0));
          vec3 stageSRGB = mix(stageLin * 12.92, 1.055 * pow(stageLin, vec3(0.416666667)) - 0.055, step(vec3(0.0031308), stageLin));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, stageSRGB, gFade);`);
    };
    const lawn = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), lawnMat);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.y = -0.004;
    lawn.receiveShadow = true;
    lawn.castShadow = false;
    lawn.userData.plate = radius;
    root.add(lawn);
    const paveOf = mat => { mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -2; return mat; };
    const slab = (parent, w, h, d, mat, x, z, yBottom, order) => {
      const m = box(w, h, d, mat, x, yBottom + h / 2, z);
      m.castShadow = false;
      m.renderOrder = order;
      parent.add(m);
      return yBottom + h;
    };

    // neighbours overlap the main wall so the shared face is buried, and their roof sits lower so the slopes are not coplanar
    const nbMat = M(C.nb), nbRoof = M('#c9d2d6');
    const gx = gw ? x0 + W / 2 + gw / 2 - 0.06 : 0;
    const neighbour = side => {
      const nx = side * (W - 0.08) + x0;
      const wall = box(W, H, Dp - 0.04, nbMat, nx, H / 2, -0.03);
      root.add(wall);
      if (flat) root.add(box(W + 0.02, 0.22, Dp + 0.02, nbMat, nx, H + 0.06, -0.02));
      else { const rf = gable(W, Dp + 0.3, 0.85, nbRoof); rf.position.set(nx, H - 0.1, 0); root.add(rf); }
    };
    if (s.neigh === 'left' || s.neigh === 'both') neighbour(-1);
    if (s.neigh === 'both') neighbour(1);

    // walls
    const pw = part('walls');
    const wallMat = dirtyMat(pw, C.wallDirty, C.wall, { roughness: 0.76 });
    pw.g.add(box(W, H, Dp, wallMat, x0, H / 2, 0));
    if (gw) pw.g.add(box(gw, 1.0, Dp * 0.85, wallMat, gx, 0.5, -Dp * 0.075));
    if (s.apt) for (let f = 1; f < s.floors; f++) pw.g.add(box(W + 0.12, 0.06, Dp + 0.12, wallMat, x0, f * FH, 0));
    const streakMat = () => decalMat(C.streak, 0.28);
    for (let i = 0; i < 7 + s.bays * 2; i++) {
      const h = 0.25 + r() * 0.6, sx = x0 - W / 2 + 0.15 + r() * (W - 0.3);
      grime(pw, new THREE.Mesh(new THREE.PlaneGeometry(0.035 + r() * 0.05, h), streakMat()), 'fade');
      pw.dirt[pw.dirt.length - 1].position.set(sx, H - h / 2 - r() * 0.15 - (r() < 0.5 ? 0 : FH * Math.floor(r() * s.floors)), front + 0.012);
    }
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.22), decalMat(C.moss, 0.35));
      m.position.set(x0, 0.12, front + 0.012); grime(pw, m, 'fade'); }

    // door, sunk into the wall and the lawn
    root.add(box(0.5, 0.86, 0.08, M(C.door), x0 + (s.bays > 2 ? 0 : -W / 4 + 0.1), 0.41, front + 0.01));
    if (gw) root.add(box(gw - 0.25, 0.8, 0.08, M(C.garage), gx, 0.38, -Dp * 0.075 + Dp * 0.425 + 0.01));

    // windows
    const pwin = part('windows');
    const glassMat = dirtyMat(pwin, C.glassDirty, C.glass, { roughness: 0.16, metalness: 0.04, emissive: col('#000000') });
    const frameMat = M(C.frame);
    const doorBay = s.bays > 2 ? Math.floor(s.bays / 2) : 0;
    for (let f = 0; f < s.floors; f++) {
      for (let b = 0; b < s.bays; b++) {
        if (f === 0 && b === doorBay) continue;
        const wx = x0 - W / 2 + 0.2 + bay * (b + 0.5), wy = f * FH + 0.55;
        pwin.g.add(box(0.62, 0.58, 0.08, frameMat, wx, wy, front + 0.02));
        pwin.g.add(box(0.52, 0.48, 0.04, glassMat, wx, wy, front + 0.055));
        const dust = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), decalMat(C.grime, 0.32));
        dust.position.set(wx, wy - 0.13, front + 0.1); grime(pwin, dust, 'fade');
      }
      if (!s.neigh) {
        const sxp = x0 + (gw ? -1 : 1) * (W / 2 + 0.05);
        const g = box(0.06, 0.48, 0.52, glassMat, sxp, f * FH + 0.55, 0.2); pwin.g.add(g);
      }
    }

    // roof, dropped into the wall so the soffit is not coplanar with the wall top
    const pr = part('roof');
    const roofMat = dirtyMat(pr, C.roofDirty, C.roof, { roughness: 0.78 });
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
      if (gw) pr.g.add(box(gw + 0.06, 0.08, Dp * 0.85 + 0.06, roofMat, gx, 0.98, -Dp * 0.075));
    } else {
      const roof = s.neigh ? gable(RW, RD, RH, roofMat) : hip(RW, RD, RH, roofMat);
      roof.position.set(x0, H - roofSink, 0); pr.g.add(roof);
      if (gw) { const gr = gable(gw + 0.2, Dp * 0.85 + 0.2, 0.45, roofMat); gr.position.set(gx, 0.94, -Dp * 0.075); pr.g.add(gr); }
      slope = Math.atan2(RH, RD / 2);
      const mossMat = new THREE.MeshStandardMaterial({ color: col(C.moss), roughness: 1, flatShading: true, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 });
      const ny = Math.cos(slope), nz = Math.sin(slope);
      for (let i = 0; i < 16 + s.bays * 4; i++) {
        const t = 0.15 + r() * 0.75, z = (RD / 2) * (1 - t), y = H - roofSink + RH * t;
        const half = (RW / 2) * (s.neigh ? 1 : (1 - t * 0.85)) - 0.1;
        const rad = 0.05 + r() * 0.06, lift = rad + 0.04;
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 0), mossMat);
        m.position.set(x0 + (r() * 2 - 1) * half, y + ny * lift, z + nz * lift); m.scale.y = 0.5;
        m.castShadow = false;
        grime(pr, m, 'shrink');
      }
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
    arr.children.filter(c => c.userData.local).forEach(d => { d.userData.mode = 'fade'; d.userData.o0 = d.material.opacity; d.userData.p0 = d.position.clone(); d.userData.s0 = d.scale.clone(); ps.dirt.push(d); });

    // gutters sit in front of the eave, leaves rest on the gutter rather than inside the roof
    const pg = part('gutters');
    const gutMat = dirtyMat(pg, C.gutDirty, C.gut);
    if (flat) {
      for (let i = 0; i < Math.max(2, s.bays - 1); i++) {
        const sx = x0 - W / 2 + 0.6 + i * ((W - 1.2) / Math.max(1, Math.max(2, s.bays - 1) - 1));
        pg.g.add(box(0.1, 0.08, 0.4, gutMat, sx, H + 0.1, front + 0.28));
        const stain = new THREE.Mesh(new THREE.PlaneGeometry(0.16, H * 0.7), decalMat(C.streak, 0.3));
        stain.position.set(sx, H * 0.62, front + 0.012); grime(pg, stain, 'fade');
      }
    } else {
      const gutH = 0.08, gutD = 0.1, gutZ = RD / 2 + 0.04 + gutD / 2, gutY = H - 0.16;
      pg.g.add(box(RW + 0.05, gutH, gutD, gutMat, x0, gutY, gutZ));
      const pipeTop = gutY - gutH / 2, pipeH = pipeTop + 0.04;
      const pipe = (x) => pg.g.add(box(0.06, pipeH, 0.06, gutMat, x, pipeTop - pipeH / 2, gutZ));
      pipe(x0 - W / 2 + 0.08);
      if (!s.neigh) pipe(x0 + W / 2 - 0.08);
      const leafMat = new THREE.MeshStandardMaterial({ color: col(C.leaf), roughness: 1, flatShading: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      for (let i = 0; i < 10 + s.bays * 3; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.05), leafMat);
        m.position.set(x0 + (r() - 0.5) * (RW - 0.2), gutY + gutH / 2 + 0.012, gutZ + (r() - 0.5) * 0.04);
        m.rotation.set(r() * 0.4, r() * 3, r() * 0.4);
        m.castShadow = false;
        grime(pg, m, 'fall');
      }
    }

    // driveway, patio and path each have their own height. Dirt sits just above its own slab.
    const pd = part('driveway');
    const paveMat = paveOf(dirtyMat(pd, C.paveDirty, C.pave));
    const dw = gw ? gw + 0.3 : 1.3, dx = gw ? gx : x0 + W / 2 - dw / 2 - 0.05, dl = radius - front - 0.3;
    const driveTop = slab(pd.g, dw, 0.028, dl, paveMat, dx, front + dl / 2, 0.1, 2);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.1 + r() * 0.2, 8), decalMat(C.grime, 0.45));
      m.rotation.x = -Math.PI / 2; m.position.set(dx + (r() - 0.5) * (dw - 0.3), driveTop + 0.016, front + 0.3 + r() * (dl - 0.6)); m.scale.set(1, 1 + r(), 1);
      grime(pd, m, 'fade');
    }

    const pp = part('patio');
    const patMat = paveOf(dirtyMat(pp, C.paveDirty, C.pave));
    const px = gw || s.neigh ? x0 - W / 2 + 0.75 : x0 - W / 2 - 0.1;
    const patioTop = slab(pp.g, 1.4, 0.024, 1.3, patMat, px, front + 0.95, 0.028, 1);
    const pathTop = slab(pp.g, 0.5, 0.02, 1.0, patMat, x0 + (s.bays > 2 ? 0 : -W / 4 + 0.1), front + 0.5, 0.175, 3);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.08 + r() * 0.14, 7), decalMat(i % 2 ? C.moss : C.grime, 0.45));
      m.rotation.x = -Math.PI / 2; m.position.set(px + (r() - 0.5) * 1.0, patioTop + 0.016, front + 0.55 + r() * 0.7);
      grime(pp, m, 'fade');
    }
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.06 + r() * 0.05, 7), decalMat(C.grime, 0.4));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x0 + (s.bays > 2 ? 0 : -W / 4 + 0.1) + (r() - 0.5) * 0.2, pathTop + 0.016, front + 0.35 + r() * 0.5);
      grime(pp, m, 'fade');
    }

    if (!s.neigh) {
      const t = new THREE.Group();
      t.add(box(0.1, 0.74, 0.1, M('#b4bcc0'), 0, 0.33, 0));
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), M(C.tree)); crown.position.y = 1.05; t.add(crown);
      t.position.set(-(W + gw) / 2 - 0.9, 0, 0.6); root.add(t);
    }

    pivot.position.x = -x0 * 0.15;
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
    p.mats.forEach(m => m.color.copy(m.userData.a).lerp(m.userData.b, e));
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

  // a sweep of light across the part, a glow, and spray particles
  function wash(id) {
    const p = parts[id];
    if (!p || reduced) return;
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
      const dur = (p.target ? 1.1 : 0.5) * 1000;
      const t = Math.min(1, (now - (p.since || now)) / dur);
      p.clean = p.from + (p.target - p.from) * t;
      if (t >= 1) p.clean = p.target;
      applyClean(p);
    });
  }

  // drag to turn, tap to toggle. Rotation eases toward the pointer so a coarse drag stays smooth.
  let rot = 0, rotT = 0, vel = 0, drag = null, lastInput = -1e9;
  const clampRot = v => Math.max(-1, Math.min(1, v));
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
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* pointer already gone */ }
    drag = { x: e.clientX, y: e.clientY, r: rotT, t: performance.now(), moved: false, lt: performance.now() };
    vel = 0;
    lastInput = performance.now();
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) { if (e.pointerType === 'mouse') canvas.style.cursor = pick(e.clientX, e.clientY) ? 'pointer' : ''; return; }
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) drag.moved = true;
    if (drag.moved) {
      const next = clampRot(drag.r + dx * 0.008);
      const now = performance.now();
      const dtm = Math.max(8, now - drag.lt) / 1000;
      vel = Math.max(-2.4, Math.min(2.4, (next - rotT) / dtm));
      drag.lt = now;
      rotT = next;
      lastInput = now;
    }
  });
  const end = e => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved && performance.now() - d.t < 600) { const id = pick(e.clientX, e.clientY); if (id && opts.onTap) opts.onTap(id); }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', () => { drag = null; });

  const _pivotPos = new THREE.Vector3();
  const _target = new THREE.Vector3();
  const _viewDir = new THREE.Vector3(0.04, 0.38, 1).normalize();
  const _world = new THREE.Vector3();
  const YAWS = [];
  for (let a = -1; a <= 1.0001; a += 0.1) YAWS.push(a);
  const YAW_C = YAWS.map(a => Math.cos(a));
  const YAW_S = YAWS.map(a => Math.sin(a));

  function captureFrame() {
    pivot.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(pivot.matrixWorld).invert();
    const pts = [];
    const corner = new THREE.Vector3();
    root.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
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
      if (!geo.boundingBox) geo.computeBoundingBox();
      const bb = geo.boundingBox;
      for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
        corner.set(x, y, z).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
        pts.push(corner.x, corner.y, corner.z);
      }
    });
    framePts = pts;
  }

  function projectSpan(limit) {
    const pts = framePts;
    if (!pts || pts.length < 3) return null;
    pivot.getWorldPosition(_pivotPos);
    let maxX = 0, maxY = 0, outside = false;
    for (let i = 0; i < YAWS.length; i++) {
      const c = YAW_C[i], s = YAW_S[i];
      for (let p = 0; p < pts.length; p += 3) {
        _world.set(
          _pivotPos.x + pts[p] * c + pts[p + 2] * s,
          _pivotPos.y + pts[p + 1],
          _pivotPos.z - pts[p] * s + pts[p + 2] * c
        ).project(camera);
        const ax = Math.abs(_world.x), ay = Math.abs(_world.y);
        if (ax > maxX) maxX = ax;
        if (ay > maxY) maxY = ay;
        if (ax > limit || ay > limit || _world.z < -1 || _world.z > 1) outside = true;
      }
    }
    return { maxX, maxY, outside };
  }

  function frameHouse() {
    const pts = framePts;
    if (!pts || pts.length < 3) return;
    pivot.getWorldPosition(_pivotPos);
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < YAWS.length; i++) {
      const c = YAW_C[i], s = YAW_S[i];
      for (let p = 0; p < pts.length; p += 3) {
        const x = pts[p] * c + pts[p + 2] * s;
        const y = pts[p + 1];
        const z = -pts[p] * s + pts[p + 2] * c;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }
    }
    _target.set(_pivotPos.x + (minX + maxX) / 2, _pivotPos.y + (minY + maxY) / 2, _pivotPos.z + (minZ + maxZ) / 2);
    const place = dist => {
      camera.position.copy(_target).addScaledVector(_viewDir, dist);
      camera.near = Math.max(0.65, dist * 0.2);
      camera.far = dist * 2.5;
      camera.lookAt(_target);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
    };
    let lo = 1.5, hi = 80;
    place(hi);
    if (projectSpan(0.88).outside) hi = 160;
    for (let n = 0; n < 18; n++) {
      const mid = (lo + hi) * 0.5;
      place(mid);
      if (projectSpan(0.88).outside) lo = mid; else hi = mid;
    }
    place(hi);
  }

  let viewW = -1, viewH = -1;
  function resize(fromObserver) {
    const w = host.clientWidth || 360, h = Math.round(Math.min(w / 1.48, (window.innerHeight || 700) * (w >= 960 ? 0.62 : 0.38)));
    // A language switch can notify the observer without changing the drawing size.
    // Skip that so the camera is not framed again. A real rebuild still reframes.
    if (fromObserver && (!host.clientWidth || (w === viewW && h === viewH))) return;
    viewW = w;
    viewH = h;
    canvas.style.height = h + 'px';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
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
    if (drag) {
      rot += (rotT - rot) * (1 - Math.exp(-dt * 22));
    } else if (Math.abs(vel) > 0.03 || Math.abs(rotT - rot) > 0.0015) {
      rotT = clampRot(rotT + vel * dt);
      if (rotT <= -1 || rotT >= 1) vel = 0;
      vel *= Math.exp(-dt * 3.4);
      rot += (rotT - rot) * (1 - Math.exp(-dt * 22));
      if (Math.abs(vel) <= 0.03) vel = 0;
    } else if (!reduced && now - lastInput > 2500) {
      const aim = Math.sin(now / 4200) * 0.32;
      rot += (aim - rot) * Math.min(1, dt * 0.8);
      rotT = rot;
    }
    pivot.rotation.y = rot;
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
      // sample points on the part until one picks back to the same id
      const meshes = []; p.g.traverse(o => { if (o.isMesh && o.visible && !(o.material && o.material.transparent)) meshes.push(o); });
      for (const m of meshes) {
        const bb = new THREE.Box3().setFromObject(m);
        const fr = [0.5, 0.2, 0.8, 0.35, 0.65, 0.1, 0.9];
        for (const fx of fr) for (const fy of fr) for (const fz of [0.5, 0, 1, 0.25, 0.75]) {
          const c = new THREE.Vector3(bb.min.x + (bb.max.x - bb.min.x) * fx, bb.min.y + (bb.max.y - bb.min.y) * fy, bb.min.z + (bb.max.z - bb.min.z) * fz);
          c.project(camera);
          const x = b.left + (c.x + 1) / 2 * b.width, y = b.top + (1 - c.y) / 2 * b.height;
          if (x > b.left + 2 && x < b.right - 2 && y > b.top + 2 && y < b.bottom - 2 && pick(x, y) === id) return { x, y };
        }
      }
      return null;
    },
    parts: () => Object.keys(parts),
    setYaw(y) { rot = rotT = clampRot(y); vel = 0; pivot.rotation.y = rot; lastInput = performance.now(); draw(); },
    coverage() { return projectSpan(0.88); },
    msaa: () => msaa,
    pixelRatio: () => renderer.getPixelRatio(),
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
