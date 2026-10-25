import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const [m,w] of [['sa',390],['uk',390],['us',1440],['nz',360]]) {
  const p = await b.newPage({ viewport: { width: w, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', c => c.type()==='error' && errs.push(c.text()));
  await p.goto(`http://127.0.0.1:8787/${m}/`); await p.waitForFunction(() => window.__h3d || window.__h3dError, null, { timeout: 15000 }).catch(()=>{});
  await p.waitForTimeout(1500);
  const info = await p.evaluate(() => ({ err: window.__h3dError, fps: window.__h3d && window.__h3d.fps(), dir: document.dir || document.documentElement.dir, h1: document.querySelector('h1').textContent, pr: window.__h3d && window.__h3d.project('roof') }));
  console.log(m, w, JSON.stringify(info), errs.slice(0,3));
  await p.screenshot({ path: `/tmp/smoke-${m}.png` });
}
await b.close();
