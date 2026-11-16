#!/usr/bin/env node
// 전 장 캡처 + 넘침 · 잘림 · 콘솔 에러 검사 → output/capture/slide-NN.png, output/review.json
// 사용: node scripts/capture.mjs [--no-motion]
//   기본은 애니메이션을 켠 채 각 장의 애니메이션이 끝난 "최종 상태"를 검사한다(motion.js 검증 겸용).
// 종료 코드: 0 = 오류 없음, 1 = 오류 있음(넘침 · 잘림 · 콘솔/페이지 에러 · 로드 실패)
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const noMotion = args.includes('--no-motion');
const outDir = resolve(root, 'output/capture');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// 캔버스 안 검사(1920×1080 좌표). 글자를 가진 요소만 대상 — 풀블리드 사진·장식 SVG는 의도적으로 가장자리를 넘을 수 있다.
const INSPECT = () => {
  const s = document.querySelector('.slide.is-active');
  if (!s) return { error: '활성 슬라이드 없음' };
  const r = s.getBoundingClientRect();
  const k = r.width / 1920;
  const issues = [];
  const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const name = (el) => el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].join('.') : '');
  for (const el of s.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'text') continue;
    if (!hasOwnText(el) && el.tagName.toLowerCase() !== 'text') continue;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    const box = [(b.left - r.left) / k, (b.top - r.top) / k, (b.right - r.left) / k, (b.bottom - r.top) / k].map(Math.round);
    const text = el.textContent.trim().slice(0, 40);
    if (box[0] < -1 || box[1] < -1 || box[2] > 1921 || box[3] > 1081) {
      issues.push({ kind: 'overflow', severity: 'error', el: name(el), box, text, message: '글자가 캔버스(1920×1080) 밖으로 나감' });
    } else if (!el.classList.contains('slide__unverified') && (box[0] < 79 || box[1] < 79 || box[2] > 1841 || box[3] > 1001)) {
      // 안전 영역 침범은 경고 (풀블리드 레이아웃의 credit · stepbar 등은 의도된 예외일 수 있음)
      issues.push({ kind: 'safe-area', severity: 'warn', el: name(el), box, text, message: '안전 영역(80px) 밖 글자' });
    }
    const clips = ['hidden', 'clip'].includes(cs.overflowY) || ['hidden', 'clip'].includes(cs.overflowX);
    const ellipsis = cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none';
    if (clips && !ellipsis && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)) {
      issues.push({ kind: 'clipped', severity: 'error', el: name(el), box, text, message: `글자 잘림 (scroll ${el.scrollWidth}×${el.scrollHeight} > box ${el.clientWidth}×${el.clientHeight})` });
    }
  }
  // 조상이 overflow:hidden인데 글자 요소가 그 밖으로 나가 잘리는 경우
  for (const el of s.querySelectorAll('.slide__title, .slide__subtitle, .slide__body, .slide__source, .slide__caption')) {
    const b = el.getBoundingClientRect();
    let p = el.parentElement;
    while (p && p !== s) {
      const pc = getComputedStyle(p);
      if (['hidden', 'clip'].includes(pc.overflow)) {
        const pb = p.getBoundingClientRect();
        if (b.bottom > pb.bottom + 2 || b.right > pb.right + 2) issues.push({ kind: 'clipped', severity: 'error', el: name(el), text: el.textContent.trim().slice(0, 40), message: `부모 ${name(p)} 밖으로 잘림` });
        break;
      }
      p = p.parentElement;
    }
  }
  return { id: s.id, type: s.dataset.type, theme: s.dataset.theme, unverified: Number(s.dataset.unverified || 0), size: [Math.round(r.width / k), Math.round(r.height / k)], issues };
};

const server = await startServer(root);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const consoleLog = [];
page.on('console', (m) => {
  if (!['error', 'warning'].includes(m.type())) return;
  if (/favicon.ico$/.test(m.location()?.url || '')) return; // 브라우저 자동 요청 — 덱과 무관
  consoleLog.push({ type: m.type(), text: m.text() });
});
page.on('pageerror', (e) => consoleLog.push({ type: 'pageerror', text: String(e.message || e) }));
page.on('requestfailed', (q) => consoleLog.push({ type: 'requestfailed', text: `${q.url()} ${q.failure()?.errorText || ''}` }));
page.on('response', (res) => { if (res.status() >= 400 && !/favicon\.ico$/.test(res.url())) consoleLog.push({ type: 'http', text: `${res.status()} ${res.url()}` }); });

const report = { ok: false, createdAt: new Date().toISOString(), motion: !noMotion, url: server.url, slides: [], console: [], issues: [] };
try {
  await page.goto(server.url + (noMotion ? '?motion=off' : '') + '#1', { waitUntil: 'networkidle' });
  await page.waitForSelector('.slide.is-active', { timeout: 10000 });
  await page.evaluate(() => document.fonts.ready);
  const total = await page.locator('.slide').count();
  for (let n = 1; n <= total; n++) {
    await page.evaluate((i) => { location.hash = '#' + i; }, n);
    await page.waitForFunction((i) => document.querySelectorAll('.slide')[i - 1]?.classList.contains('is-active'), n);
    // 애니메이션이 끝날 때까지(최대 3초) 기다린 뒤 최종 상태를 검사
    await page.evaluate(() => Promise.race([
      Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))),
      new Promise((r) => setTimeout(r, 3000)),
    ]));
    await page.waitForTimeout(150);
    const info = await page.evaluate(INSPECT);
    const file = `output/capture/slide-${String(n).padStart(2, '0')}.png`;
    await page.screenshot({ path: resolve(root, file), scale: 'css', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    report.slides.push({ n, ...info, screenshot: file });
  }
  // 창 크기 변경 → 16:9 유지
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(300);
  report.resize = await page.evaluate(() => { const b = document.querySelector('.slide.is-active').getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), ratio: +(b.width / b.height).toFixed(4) }; });
  if (Math.abs(report.resize.ratio - 16 / 9) > 0.01) report.issues.push({ kind: 'aspect', severity: 'error', message: `창 크기 변경 후 비율 ${report.resize.ratio}` });
} catch (e) {
  report.issues.push({ kind: 'load', severity: 'error', message: `덱 로드 실패: ${e.message}` });
} finally {
  await browser.close();
  await server.close();
}

report.console = consoleLog;
for (const c of consoleLog) {
  const isError = ['error', 'pageerror', 'requestfailed', 'http'].includes(c.type);
  report.issues.push({ kind: 'console', severity: isError ? 'error' : 'warn', message: `[${c.type}] ${c.text}` });
}
for (const s of report.slides) {
  if (s.error) report.issues.push({ kind: 'render', severity: 'error', slide: s.n, message: s.error });
  for (const i of s.issues || []) report.issues.push({ slide: s.n, id: s.id, type: s.type, ...i });
}
report.errors = report.issues.filter((i) => i.severity === 'error').length;
report.warnings = report.issues.filter((i) => i.severity === 'warn').length;
report.unverified = report.slides.reduce((a, s) => a + (s.unverified || 0), 0);
report.ok = report.errors === 0 && report.slides.length > 0;
writeFileSync(resolve(root, 'output/review.json'), JSON.stringify(report, null, 2));

console.log(`캡처 ${report.slides.length}장 → output/capture/  (motion ${report.motion ? 'on' : 'off'}, 16:9 유지 ${report.resize ? report.resize.ratio : '?'})`);
for (const i of report.issues.filter((x) => x.severity === 'error')) console.log(`✖ ${i.slide ? `${i.slide}장 (${i.id}) ` : ''}${i.kind}: ${i.message}${i.text ? ` — "${i.text}"` : ''}`);
console.log(`${report.ok ? '✔' : '✖'} review.json: 오류 ${report.errors}건, 경고 ${report.warnings}건, 확인 필요 배지 ${report.unverified}개`);
process.exit(report.ok ? 0 : 1);
