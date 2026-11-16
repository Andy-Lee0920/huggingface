#!/usr/bin/env node
// data/storyboard.md 검사기 — .claude/skills/storyboard-format.md 기준 (Node 표준 라이브러리만)
// 사용: node scripts/validate-storyboard.mjs [--json]     종료 코드 0 = 통과, 1 = 오류
import { parseBrief } from './lib/brief.mjs';
import { parseStoryboard, ROLES } from './lib/storyboard.mjs';

const asJson = process.argv.includes('--json');
const errors = [];
const warnings = [];
const err = (w, m) => errors.push(`${w}: ${m}`);
const warn = (w, m) => warnings.push(`${w}: ${m}`);
const len = (s) => [...String(s).replace(/\*\*/g, '')].length;

const brief = parseBrief('data/brief.md');
const sb = parseStoryboard('data/storyboard.md');

if (!brief.exists) err('brief.md', '파일 없음');
else if (!brief.filled.topic) err('brief.md', '필수 항목 "주제"가 비어 있음');

if (!sb.exists) err('storyboard.md', '파일 없음 — /storyboard를 먼저 실행');
else {
  if (!sb.title) err('storyboard.md', '# 제목 줄 없음');
  if (sb.slides.length < 3) err('storyboard.md', `장 ${sb.slides.length}개 — 최소 3장(cover · 본문 · closing)`);
  const ids = new Set();
  sb.slides.forEach((s, i) => {
    const w = `${String(s.no).padStart(2, '0')}. ${s.title || '(제목 없음)'}`;
    if (s.no !== i + 1) err(w, `번호가 ${i + 1}이어야 함 (연속 번호)`);
    if (!s.title) err(w, '제목 없음');
    else if (len(s.title) > 40) err(w, `제목 ${len(s.title)}자 — 40자 이내`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)) err(w, `id "${s.id}" — kebab-case 필수`);
    else if (ids.has(s.id)) err(w, `id 중복 "${s.id}"`);
    ids.add(s.id);
    if (!ROLES.includes(s.role)) err(w, `역할 "${s.role}" — ${ROLES.join(' | ')}`);
    if (!s.message) err(w, '메시지(한 문장) 없음');
    if ((s.lists['내용'] || []).length > 6) warn(w, '내용 항목 6개 초과 — planner가 나누거나 줄여야 함');
    for (const n of s.numbers) if (!n.basis) err(w, `수치 "${n.value}"에 근거 표기 없음 (— brief | 미확인 | F#)`);
  });
  if (sb.slides[0] && sb.slides[0].role !== 'cover') err('01', '첫 장의 역할은 cover');
  const last = sb.slides[sb.slides.length - 1];
  if (last && last.role !== 'closing') warn(`${String(last.no).padStart(2, '0')}`, '마지막 장은 closing 권장');

  // 스토리라인 순서 보존
  const N = brief.storyline.length;
  const content = sb.slides.filter((s) => s.role === 'body' || s.role === 'section');
  if (N) {
    let prev = 0;
    const covered = new Set();
    for (const s of content) {
      const w = `${String(s.no).padStart(2, '0')}. ${s.title}`;
      if (!s.storyline.length) { err(w, '스토리라인 번호 없음 (brief에 스토리라인이 있으면 본문·section 장마다 필수)'); continue; }
      for (const k of s.storyline) {
        if (!Number.isInteger(k) || k < 1 || k > N) err(w, `스토리라인 번호 ${k} — 1~${N}`);
        else { if (k < prev) err(w, `스토리라인 순서 역행: ${prev} 다음에 ${k}`); prev = Math.max(prev, k); covered.add(k); }
      }
    }
    for (let k = 1; k <= N; k++) if (!covered.has(k)) err('스토리라인', `${k}번 "${brief.storyline[k - 1]}"을 다루는 장이 없음`);
  } else {
    for (const s of content) if (s.storyline.length) warn(`${String(s.no).padStart(2, '0')}`, 'brief에 스토리라인이 없는데 번호가 있음');
  }
}

const unverified = sb.slides?.flatMap((s) => s.numbers.filter((n) => n.unverified).map((n) => `${s.id}: ${n.value}`)) || [];
const result = { ok: errors.length === 0, slides: sb.slides?.length || 0, storyline: brief.storyline.length, unverified, errors, warnings };
if (asJson) console.log(JSON.stringify(result));
else {
  for (const m of warnings) console.log(`⚠ ${m}`);
  for (const m of errors) console.log(`✖ ${m}`);
  console.log(result.ok
    ? `✔ storyboard.md: ${result.slides}장, 스토리라인 ${result.storyline ? result.storyline + '개 순서 유지' : '없음(기본 구조)'}, 미확인 수치 ${unverified.length}개`
    : `\nstoryboard.md: 오류 ${errors.length}건 — 실패`);
}
process.exit(result.ok ? 0 : 1);
