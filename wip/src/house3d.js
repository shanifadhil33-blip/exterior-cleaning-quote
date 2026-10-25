// Gleam 3D house. Low poly, built from boxes, drawn with Three.js.
// mount(host, { onTap }) returns { build(spec), setSel(sel), wash(id), dispose() } or throws if WebGL is missing.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
const col = c => new THREE.Color(c.startsWith('rgba') ? c.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgb($1,$2,$3)') : c);

export function mount(host, opts = {}) {
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('no webgl');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'gl3';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false });
  const gl = renderer.getContext();
  const gpuInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const gpuName = gpuInfo ? String(gl.getParameter(gpuInfo.UNMASKED_RENDERER_WEBGL) || '') : '';
  const weakGpu = /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i.test(gpuName);
  const dprCap = weakGpu ? 1.25 : 2;
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
  sun.shadow.mapSize.set(512, 512);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 28;
  sun.shadow.camera.left = -7.5;
  sun.shadow.camera.right = 7.5;
  sun.shadow.camera.top = 7.5;
  sun.shadow.camera.bottom = -7.5;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 2.5;
  scene.add(hemi, sun);
  const themeDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  const stageTarget = new THREE.Color();
  const stageCur = new THREE.Color();
  function applySceneTheme() {
    const dark = themeDark();
    stageTarget.set(dark ? 0x313940 : 0xe2e6e7);
    if (dark) {
      hemi.color.set(0xfff4e8);
      hemi.groundColor.set(0x9aa4a8);
      hemi.intensity = 3.05;
      sun.color.set(0xffe8cc);
      sun.intensity = 4.05;
    } else {
      hemi.color.set(0xfff7f0);
      hemi.groundColor.set(0xd0d8d6);
      hemi.intensity = 2.5;
      sun.color.set(0xffe4c4);
      sun.intensity = 3.35;
    }
  }
  applySceneTheme();
  stageCur.copy(stageTarget);
  renderer.setClearColor(stageCur, 1);
  new MutationObserver(applySceneTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const pivot = new THREE.Group();
  scene.add(pivot);
  let root = new THREE.Group();
  pivot.add(root);

  let parts = {}, fxList = [], spec = null, sel = {}, radius = 6, framePts = null;
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.8, metalness: 0, flatShading: true, ...o });
  const decalMat = (c, opacity) => new THREE.MeshBasicMaterial({
    color: col(c), transparent: true, opacity, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
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
      parts[id] = { id, g, mats: [], dirt: [], clean: sel[id] ? 1 : 0, target: sel[id] ? 1 : 0 };
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
    mesh.renderOrder = 2;
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

    // ground
    const lawn = new THREE.Mesh(new THREE.CylinderGeometry(radius = Math.max(5.2, (W + gw) * 0.9 + 1.5), radius, 0.12, 40), M(C.lawn, { roughness: 1 }));
    lawn.receiveShadow = true;
    lawn.position.y = -0.06; root.add(lawn);

    // neighbours, so semi detached and terraced homes read right
    const nbMat = M(C.nb), nbRoof = M('#c9d2d6');
    const neighbour = side => {
      const nx = side * (W / 2 + W / 2) + x0;
      root.add(box(W, H, Dp, nbMat, nx, H / 2, 0));
      if (flat) root.add(box(W + 0.02, 0.22, Dp + 0.02, nbMat, nx, H + 0.11, 0));
      else { const rf = gable(W, Dp + 0.3, 0.85, nbRoof); rf.position.set(nx, H, 0); root.add(rf); }
    };
    if (s.neigh === 'left' || s.neigh === 'both') neighbour(-1);
    if (s.neigh === 'both') neighbour(1);

    // walls
    const pw = part('walls');
    const wallMat = dirtyMat(pw, C.wallDirty, C.wall, { roughness: 0.76 });
    pw.g.add(box(W, H, Dp, wallMat, x0, H / 2, 0));
    if (gw) pw.g.add(box(gw, 1.0, Dp * 0.85, wallMat, x0 + W / 2 + gw / 2, 0.5, -Dp * 0.075));
    if (s.apt) for (let f = 1; f < s.floors; f++) pw.g.add(box(W + 0.12, 0.06, Dp + 0.12, wallMat, x0, f * FH, 0));
    const streakMat = () => decalMat(C.streak, 0.28);
    for (let i = 0; i < 7 + s.bays * 2; i++) {
      const h = 0.25 + r() * 0.6, sx = x0 - W / 2 + 0.15 + r() * (W - 0.3);
      grime(pw, new THREE.Mesh(new THREE.PlaneGeometry(0.035 + r() * 0.05, h), streakMat()), 'fade');
      pw.dirt[pw.dirt.length - 1].position.set(sx, H - h / 2 - r() * 0.15 - (r() < 0.5 ? 0 : FH * Math.floor(r() * s.floors)), front + 0.02);
    }
    // a green tinge at the base of the wall
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.22), decalMat(C.moss, 0.35));
      m.position.set(x0, 0.11, front + 0.024); grime(pw, m, 'fade'); }

    // door
    root.add(box(0.5, 0.82, 0.05, M(C.door), x0 + (s.bays > 2 ? 0 : -W / 4 + 0.1), 0.41, front + 0.02));
    if (gw) root.add(box(gw - 0.25, 0.75, 0.04, M(C.garage), x0 + W / 2 + gw / 2, 0.375, front - Dp * 0.075 * 2 + 0.02));

    // windows
    const pwin = part('windows');
    const glassMat = dirtyMat(pwin, C.glassDirty, C.glass, { roughness: 0.16, metalness: 0.04, emissive: col('#000000') });
    const frameMat = M(C.frame);
    const doorBay = s.bays > 2 ? Math.floor(s.bays / 2) : 0;
    for (let f = 0; f < s.floors; f++) {
      for (let b = 0; b < s.bays; b++) {
        if (f === 0 && b === doorBay) continue;
        const wx = x0 - W / 2 + 0.2 + bay * (b + 0.5), wy = f * FH + 0.55;
        pwin.g.add(box(0.62, 0.58, 0.06, frameMat, wx, wy, front + 0.02));
        pwin.g.add(box(0.52, 0.48, 0.06, glassMat, wx, wy, front + 0.045));
        const dust = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), decalMat(C.grime, 0.32));
        dust.position.set(wx, wy - 0.13, front + 0.092); grime(pwin, dust, 'fade');
      }
      // side windows so the turn shows glass too
      if (!s.neigh) {
        const sxp = x0 + (gw ? -W / 2 - 0.03 : W / 2 + 0.03);
        const g = box(0.06, 0.48, 0.52, glassMat, sxp, f * FH + 0.55, 0.2); pwin.g.add(g);
      }
    }

    // roof
    const pr = part('roof');
    const roofMat = dirtyMat(pr, C.roofDirty, C.roof, { roughness: 0.78 });
    const RH = 0.85, RD = Dp + 0.3, RW = W + 0.3;
    let slope = 0;
    if (flat) {
      pr.g.add(box(W + 0.08, 0.1, Dp + 0.08, roofMat, x0, H + 0.05, 0));
      const par = dirtyMat(pr, C.wallDirty, C.wall);
      pr.g.add(box(W + 0.1, 0.26, 0.1, par, x0, H + 0.18, front));
      pr.g.add(box(W + 0.1, 0.26, 0.1, par, x0, H + 0.18, -front));
      pr.g.add(box(0.1, 0.26, Dp, par, x0 - W / 2, H + 0.18, 0));
      pr.g.add(box(0.1, 0.26, Dp, par, x0 + W / 2, H + 0.18, 0));
      for (let i = 0; i < 10 + s.bays * 2; i++) {
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.12 + r() * 0.22, 7), decalMat(C.grime, 0.4));
        m.rotation.x = -Math.PI / 2; m.position.set(x0 + (r() - 0.5) * (W - 0.4), H + 0.128, (r() - 0.5) * (Dp - 0.4));
        grime(pr, m, 'fade');
      }
      if (gw) pr.g.add(box(gw + 0.06, 0.08, Dp * 0.85 + 0.06, roofMat, x0 + W / 2 + gw / 2, 1.04, -Dp * 0.075));
    } else {
      const roof = s.neigh ? gable(RW, RD, RH, roofMat) : hip(RW, RD, RH, roofMat);
      roof.position.set(x0, H, 0); pr.g.add(roof);
      if (gw) { const gr = gable(gw + 0.2, Dp * 0.85 + 0.2, 0.45, roofMat); gr.position.set(x0 + W / 2 + gw / 2, 1.0, -Dp * 0.075); pr.g.add(gr); }
      slope = Math.atan2(RH, RD / 2);
      const mossMat = new THREE.MeshStandardMaterial({ color: col(C.moss), roughness: 1, flatShading: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const ny = Math.cos(slope), nz = Math.sin(slope);
      for (let i = 0; i < 16 + s.bays * 4; i++) {
        const t = 0.15 + r() * 0.75, z = (RD / 2) * (1 - t), y = H + RH * t;
        const half = (RW / 2) * (s.neigh ? 1 : (1 - t * 0.85)) - 0.1;
        const rad = 0.05 + r() * 0.06, lift = rad * 0.75 + 0.02;
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 0), mossMat);
        m.position.set(x0 + (r() * 2 - 1) * half, y + ny * lift, z + nz * lift); m.scale.y = 0.5;
        grime(pr, m, 'shrink');
      }
    }

    // solar panels on the sunny side of the roof
    const ps = part('solar');
    const panelMat = dirtyMat(ps, C.panelDirty, C.panel, { roughness: 0.3, metalness: 0.3 });
    const frame = M('#d5dcde');
    const n = Math.max(2, Math.min(s.bays, 4));
    const arr = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const px = (i - (n - 1) / 2) * 0.52;
      arr.add(box(0.48, 0.03, 0.66, frame, px, 0, 0));
      arr.add(box(0.44, 0.035, 0.62, panelMat, px, 0.005, 0));
      const dust = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.62), decalMat(C.grime, 0.3));
      dust.rotation.x = -Math.PI / 2; dust.position.set(px, 0.048, 0); dust.userData.local = true; dust.renderOrder = 2;
      arr.add(dust);
    }
    if (flat) { arr.rotation.x = 0.3; arr.position.set(x0 - W * 0.12, H + 0.3, -0.2); }
    else { arr.rotation.x = slope; arr.position.set(x0 - (s.neigh ? 0 : RW * 0.08), H + RH * 0.45 + 0.04, RD * 0.275); }
    ps.g.add(arr);
    arr.children.filter(c => c.userData.local).forEach(d => { d.userData.mode = 'fade'; d.userData.o0 = d.material.opacity; d.userData.p0 = d.position.clone(); d.userData.s0 = d.scale.clone(); ps.dirt.push(d); });

    // gutters and downpipes, or roof spouts on a flat roof
    const pg = part('gutters');
    const gutMat = dirtyMat(pg, C.gutDirty, C.gut);
    if (flat) {
      for (let i = 0; i < Math.max(2, s.bays - 1); i++) {
        const sx = x0 - W / 2 + 0.6 + i * ((W - 1.2) / Math.max(1, Math.max(2, s.bays - 1) - 1));
        pg.g.add(box(0.1, 0.08, 0.4, gutMat, sx, H + 0.12, front + 0.2));
        const stain = new THREE.Mesh(new THREE.PlaneGeometry(0.16, H * 0.7), decalMat(C.streak, 0.3));
        stain.position.set(sx, H - H * 0.35, front + 0.028); grime(pg, stain, 'fade');
      }
    } else {
      pg.g.add(box(RW + 0.05, 0.1, 0.12, gutMat, x0, H - 0.02, RD / 2 + 0.02));
      pg.g.add(box(0.07, H, 0.07, gutMat, x0 - W / 2 + 0.05, H / 2, front + 0.06));
      if (!s.neigh) pg.g.add(box(0.07, H, 0.07, gutMat, x0 + W / 2 - 0.05, H / 2, front + 0.06));
      const leafMat = new THREE.MeshStandardMaterial({ color: col(C.leaf), roughness: 1, flatShading: true });
      for (let i = 0; i < 10 + s.bays * 3; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.06), leafMat);
        m.position.set(x0 + (r() - 0.5) * RW, H + 0.05, RD / 2 + 0.02 + (r() - 0.5) * 0.06);
        m.rotation.set(r(), r() * 3, r());
        grime(pg, m, 'fall');
      }
    }

    // driveway
    const pd = part('driveway');
    const paveMat = dirtyMat(pd, C.paveDirty, C.pave);
    paveMat.polygonOffset = true; paveMat.polygonOffsetFactor = -1; paveMat.polygonOffsetUnits = -1;
    const dw = gw ? gw + 0.3 : 1.3, dx = gw ? x0 + W / 2 + gw / 2 : x0 + W / 2 - dw / 2 - 0.05, dl = radius - front - 0.3;
    pd.g.add(box(dw, 0.04, dl, paveMat, dx, 0.02, front + dl / 2));
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.1 + r() * 0.2, 8), decalMat(C.grime, 0.45));
      m.rotation.x = -Math.PI / 2; m.position.set(dx + (r() - 0.5) * (dw - 0.3), 0.064, front + 0.3 + r() * (dl - 0.6)); m.scale.set(1, 1 + r(), 1);
      grime(pd, m, 'fade');
    }

    // patio and path
    const pp = part('patio');
    const patMat = dirtyMat(pp, C.paveDirty, C.pave);
    patMat.polygonOffset = true; patMat.polygonOffsetFactor = -1; patMat.polygonOffsetUnits = -1;
    const px = gw || s.neigh ? x0 - W / 2 + 0.75 : x0 - W / 2 - 0.1;
    pp.g.add(box(1.4, 0.035, 1.3, patMat, px, 0.018, front + 0.95));
    pp.g.add(box(0.5, 0.03, 1.0, patMat, x0 + (s.bays > 2 ? 0 : -W / 4 + 0.1), 0.016, front + 0.5));
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.08 + r() * 0.14, 7), decalMat(i % 2 ? C.moss : C.grime, 0.45));
      m.rotation.x = -Math.PI / 2; m.position.set(px + (r() - 0.5) * 1.1, 0.058, front + 0.45 + r() * 1.0);
      grime(pp, m, 'fade');
    }

    // a tree for scale when there are no neighbours
    if (!s.neigh) {
      const t = new THREE.Group();
      t.add(box(0.1, 0.7, 0.1, M('#b4bcc0'), 0, 0.35, 0));
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
    Object.values(parts).forEach(p => { p.target = sel[p.id] ? 1 : 0; });
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

  function resize() {
    const w = host.clientWidth || 360, h = Math.round(Math.min(w / 1.48, (window.innerHeight || 700) * (w >= 960 ? 0.62 : 0.38)));
    canvas.style.height = h + 'px';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    frameHouse();
  }
  const ro = new ResizeObserver(resize); ro.observe(host);

  let visible = true, raf = 0, last = performance.now(), frames = [];
  const io = new IntersectionObserver(entries => { visible = entries.some(en => en.isIntersecting); });
  io.observe(canvas);
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden) { last = now; return; }
    const elapsed = Math.min(0.25, (now - last) / 1000);
    const dt = Math.min(0.05, elapsed); last = now;
    frames.push(now); if (frames.length > 90) frames.shift();
    Object.values(parts).forEach(p => {
      if (p.clean !== p.target) {
        const sp = elapsed / (p.target ? 1.1 : 0.5);
        p.clean = p.target > p.clean ? Math.min(p.target, p.clean + sp) : Math.max(p.target, p.clean - sp);
        applyClean(p);
      }
    });
    stepFx(now, dt);
    const stageGap = Math.abs(stageCur.r - stageTarget.r) + Math.abs(stageCur.g - stageTarget.g) + Math.abs(stageCur.b - stageTarget.b);
    if (stageGap > 0.004) {
      stageCur.lerp(stageTarget, Math.min(1, dt * 5));
      renderer.setClearColor(stageCur, 1);
    } else if (stageGap > 0) {
      stageCur.copy(stageTarget);
      renderer.setClearColor(stageCur, 1);
    }
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
    renderer.render(scene, camera);
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
    setYaw(y) { rot = rotT = clampRot(y); vel = 0; pivot.rotation.y = rot; lastInput = performance.now(); },
    coverage() { return projectSpan(0.88); },
    canvas,
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer.dispose(); canvas.remove(); }
  };
  host.appendChild(canvas);
  return api;
}
