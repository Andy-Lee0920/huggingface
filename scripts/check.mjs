#!/usr/bin/env node
// 전체 검증 + 상태 기록.  npm run check  =  node scripts/check.mjs
// 사용: node scripts/check.mjs [--stage <이름>]
//   --stage storyboard  → 스토리보드 검사만
//   그 외(build-deck · research · motion · check …) → 전부:
//     validate-storyboard · validate-slides · check-topic-leftovers · node --check · capture · export-pdf
// 결과: output/check.json(단계별 원본), output/status.json({stage, ok, unverified, issues, …}),
//       output/log.md에 한 줄 추가. 종료 코드 0 = ok, 1 = 오류.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const args = process.argv.slice(2);
const stage = args.includes('--stage') ? args[args.indexOf('--stage') + 1] : 'check';
mkdirSync('output', { recursive: true });

const run = (cmd, argv) => {
  const r = spawnSync(cmd, argv, { encoding: 'utf8', cwd: root, shell: false });
  return { code: r.status ?? 1, out: (r.stdout || '') + (r.stderr || ''), missing: r.error?.code === 'ENOENT' };
};
const steps = [];
const issues = [];
const add = (name, res, parse) => {
  const step = { name, ok: res.code === 0, output: res.out.trim().split('\n').slice(-40).join('\n') };
  steps.push(step);
  if (parse) parse(res, step);
  else if (!step.ok) issues.push({ source: name, severity: 'error', message: step.output.split('\n').filter((l) => l.startsWith('✖')).join(' / ') || step.output.slice(-300) });
  console.log(`${step.ok ? '✔' : '✖'} ${name}`);
  return step;
};
const jsonOut = (res) => { try { return JSON.parse(res.out.trim().split('\n').pop()); } catch { return null; } };

// 1. storyboard
let sbUnverified = [];
add('validate-storyboard', run(process.execPath, ['scripts/validate-storyboard.mjs', '--json']), (res, step) => {
  const j = jsonOut(res);
  if (!j) { issues.push({ source: 'validate-storyboard', severity: 'error', message: res.out.slice(-300) }); return; }
  sbUnverified = j.unverified;
  j.errors.forEach((m) => issues.push({ source: 'storyboard', owner: 'storyteller', severity: 'error', message: m }));
  j.warnings.forEach((m) => issues.push({ source: 'storyboard', owner: 'storyteller', severity: 'warn', message: m }));
  step.summary = `${j.slides}장, 스토리라인 ${j.storyline}개, 미확인 수치 ${j.unverified.length}개`;
});

let unverified = [];
if (stage !== 'storyboard') {
  // 2. slides.json
  add('validate-slides', run(process.execPath, ['scripts/validate-slides.mjs', '--json']), (res, step) => {
    const j = jsonOut(res);
    if (!j) { issues.push({ source: 'validate-slides', owner: 'planner', severity: 'error', message: res.out.slice(-300) }); return; }
    unverified = j.unverified;
    j.errors.forEach((m) => issues.push({ source: 'slides', owner: m.startsWith('storyboard') ? 'planner' : 'planner', severity: 'error', message: m }));
    j.warnings.forEach((m) => issues.push({ source: 'slides', owner: 'planner', severity: 'warn', message: m }));
    step.summary = `${j.slides}장, 확인 필요 ${j.unverified.length}개`;
  });
  // 3. 잔재 · id 선택자
  const lf = run('bash', ['scripts/check-topic-leftovers.sh']);
  if (lf.missing) { steps.push({ name: 'check-topic-leftovers', ok: true, output: 'bash 없음 — 건너뜀' }); issues.push({ source: 'check-topic-leftovers', severity: 'warn', message: 'bash가 없어 건너뜀' }); }
  else add('check-topic-leftovers', lf, (res, step) => { if (!step.ok) issues.push({ source: 'theme', owner: 'designer', severity: 'error', message: res.out.split('\n').filter((l) => /#|theme\.css|\.\//.test(l)).slice(0, 10).join(' / ') }); });
  // 4. JS 문법
  for (const f of readdirSync('src').filter((f) => f.endsWith('.js'))) {
    add(`node --check src/${f}`, run(process.execPath, ['--check', `src/${f}`]), (res, step) => {
      if (!step.ok) issues.push({ source: 'syntax', owner: f === 'app.js' ? 'developer' : 'animator', severity: 'error', message: `src/${f}: ${res.out.split('\n').slice(0, 4).join(' ')}` });
    });
  }
  // 5. 캡처
  add('capture', run(process.execPath, ['scripts/capture.mjs']), (res, step) => {
    if (!existsSync('output/review.json')) { issues.push({ source: 'capture', owner: 'developer', severity: 'error', message: res.out.slice(-400) }); return; }
    const r = JSON.parse(readFileSync('output/review.json', 'utf8'));
    for (const i of r.issues) {
      const owner = i.kind === 'console' || i.kind === 'load' || i.kind === 'render' ? (/motion/i.test(i.message) ? 'animator' : 'developer')
        : i.kind === 'aspect' ? 'developer' : 'planner|designer';
      issues.push({ source: 'capture', owner, severity: i.severity, slide: i.slide, id: i.id, kind: i.kind, message: i.message + (i.text ? ` — "${i.text}"` : '') });
    }
    step.summary = `${r.slides.length}장, 오류 ${r.errors}, 경고 ${r.warnings}`;
  });
  // 6. PDF
  add('export-pdf', run(process.execPath, ['scripts/export-pdf.mjs']), (res, step) => {
    if (!step.ok) issues.push({ source: 'export-pdf', owner: 'designer', severity: 'error', message: res.out.trim().split('\n').pop() });
    step.summary = res.out.trim().split('\n').pop();
  });
}

const errors = issues.filter((i) => i.severity === 'error');
const unverifiedList = stage === 'storyboard' ? sbUnverified : unverified.map((u) => `${u.id}: ${u.value}`);
const status = {
  stage,
  ok: errors.length === 0,
  unverified: unverifiedList.length,
  issues,
  unverifiedItems: unverifiedList,
  errors: errors.length,
  warnings: issues.length - errors.length,
  steps: steps.map(({ name, ok, summary }) => ({ name, ok, ...(summary ? { summary } : {}) })),
  updatedAt: new Date().toISOString(),
};
writeFileSync('output/check.json', JSON.stringify({ stage, steps }, null, 2));
writeFileSync('output/status.json', JSON.stringify(status, null, 2));
if (!existsSync('output/log.md')) writeFileSync('output/log.md', '# 작업 로그\n\n');
appendFileSync('output/log.md', `- ${status.updatedAt} \`check --stage ${stage}\` → ok=${status.ok}, 오류 ${status.errors}, 경고 ${status.warnings}, 확인 필요 ${status.unverified}\n`);

console.log(`\n${status.ok ? '✔' : '✖'} [${stage}] 오류 ${status.errors}건 · 경고 ${status.warnings}건 · 확인 필요 수치 ${status.unverified}개 → output/status.json`);
process.exit(status.ok ? 0 : 1);
