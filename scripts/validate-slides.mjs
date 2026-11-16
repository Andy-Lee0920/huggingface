#!/usr/bin/env node
// data/slides.json 검사기 — .claude/skills/slide-schema.md v2.0 기준 (Node 표준 라이브러리만 사용)
// 사용: node scripts/validate-slides.mjs [경로]   (기본: data/slides.json)
// 종료 코드: 0 = 통과, 1 = 오류 있음. 경고(⚠)는 통과를 막지 않는다.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = resolve(process.argv[2] || resolve(root, 'data/slides.json'));
const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isArr = Array.isArray;
const isObj = (v) => v !== null && typeof v === 'object' && !isArr(v);
const len = (s) => [...String(s).replace(/\*\*/g, '')].length;

function need(obj, key, where, check = (v) => v !== undefined && v !== null && v !== '') {
  if (!isObj(obj) || !check(obj[key])) { err(where, `필수 필드 \`${key}\` 누락 또는 형식 오류`); return false; }
  return true;
}
function max(v, n, where, label) {
  if (v === undefined || v === null) return;
  if (len(v) > n) err(where, `${label} ${len(v)}자 — ${n}자 이내`);
}
function count(arr, lo, hi, where, label) {
  if (!isArr(arr)) return;
  if (arr.length < lo || arr.length > hi) err(where, `${label} ${arr.length}개 — ${lo}~${hi}개`);
}
function image(img, where, { required = false } = {}) {
  if (img === undefined) { if (required) err(where, '필수 필드 `image` 누락'); return; }
  const list = isArr(img) ? img : [img];
  list.forEach((im, i) => {
    const w = isArr(img) ? `${where}[${i}]` : where;
    if (!isObj(im)) return err(w, 'image는 객체여야 함');
    if (!isStr(im.src)) return err(w, 'image.src 누락');
    if (!isStr(im.alt)) err(w, 'image.alt 누락(필수)');
    if (/^(https?:)?\/\//.test(im.src)) err(w, `외부 URL 이미지 금지: ${im.src}`);
    else if (!im.src.startsWith('assets/')) err(w, `이미지는 assets/ 아래 로컬 경로여야 함: ${im.src}`);
    else if (!existsSync(resolve(root, im.src))) warn(w, `이미지 파일 없음: ${im.src}`);
  });
}
const TONES = ['default', 'accent', 'muted', 'danger'];
function tone(v, where, allowed = TONES) {
  if (v !== undefined && !allowed.includes(v)) err(where, `tone "${v}" — ${allowed.join(' | ')}`);
}

// ---------- 타입별 검사 ----------
const T = {
  cover(s, w) {
    need(s, 'title', w, isStr);
    image(s.image, `${w}.image`);
    if (s.image) { max(s.title, 40, w, 'title'); if (len(s.title || '') > 24) warn(w, 'image가 있는 cover title은 24자 이내 권장'); }
    if (s.imageStyle && !['full', 'split'].includes(s.imageStyle)) err(w, 'imageStyle — full | split');
    if (s.overlay && !['dark', 'light', 'none'].includes(s.overlay)) err(w, 'overlay — dark | light | none');
    if (s.logo !== undefined) { if (isArr(s.logo)) count(s.logo, 1, 2, w, 'logo'); image(s.logo, `${w}.logo`); }
  },
  section(s, w) { need(s, 'title', w, isStr); },
  bullets(s, w) {
    need(s, 'title', w, isStr);
    if (need(s, 'bullets', w, isArr)) bulletsList(s.bullets, w, s.background ? 4 : 6, 60);
  },
  'two-column'(s, w) {
    need(s, 'title', w, isStr);
    for (const side of ['left', 'right']) {
      if (!need(s, side, w, isObj)) continue;
      const c = s[side], cw = `${w}.${side}`;
      if (!isArr(c.bullets) && !isStr(c.body)) err(cw, '`bullets` 또는 `body` 필요');
      if (isArr(c.bullets)) bulletsList(c.bullets, cw, 5, 60);
      tone(c.tone, cw, ['default', 'accent', 'danger']);
    }
  },
  image(s, w) {
    need(s, 'src', w, isStr); need(s, 'alt', w, isStr);
    if (isStr(s.src)) image({ src: s.src, alt: s.alt }, w);
    if (s.fit && !['contain', 'cover'].includes(s.fit)) err(w, 'fit — contain | cover');
  },
  stats(s, w) {
    need(s, 'title', w, isStr);
    if (need(s, 'items', w, isArr)) {
      count(s.items, 2, 4, w, 'items');
      s.items.forEach((it, i) => { need(it, 'value', `${w}.items[${i}]`, isStr); need(it, 'label', `${w}.items[${i}]`, isStr); max(it.value, 8, `${w}.items[${i}]`, 'value'); });
    }
  },
  quote(s, w) { need(s, 'quote', w, isStr); max(s.quote, 120, w, 'quote'); },
  closing(s, w) { need(s, 'title', w, isStr); },
  references(s, w) {
    need(s, 'title', w, isStr);
    if (need(s, 'category', w, isStr) && !['article', 'official', 'report', 'paper', 'other', 'image'].includes(s.category)) err(w, `category "${s.category}" — article | official | report | paper | other | image`);
    if (need(s, 'items', w, isArr)) {
      count(s.items, 1, 6, w, 'items');
      s.items.forEach((it, i) => {
        const iw = `${w}.items[${i}]`;
        need(it, 'publisher', iw, isStr); need(it, 'title', iw, isStr);
        if (need(it, 'url', iw, isStr) && !/^https?:\/\//.test(it.url)) err(iw, 'url은 http(s)://로 시작');
        max(it.title, 70, iw, 'title');
        if (it.date && !/^\d{4}-\d{2}(-\d{2})?$/.test(it.date)) err(iw, 'date — YYYY-MM 또는 YYYY-MM-DD');
      });
    }
  },
  'big-number'(s, w) {
    need(s, 'value', w, isStr); need(s, 'label', w, isStr);
    max(s.value, 10, w, 'value'); max(s.label, 40, w, 'label'); max(s.context, 60, w, 'context');
  },
  process(s, w) {
    need(s, 'title', w, isStr);
    if (s.layout !== undefined && s.layout !== 'stairs') err(w, 'layout — "stairs"만 허용');
    max(s.caption, 60, w, 'caption');
    if (need(s, 'steps', w, isArr)) {
      count(s.steps, 3, 5, w, 'steps');
      s.steps.forEach((st, i) => {
        const sw = `${w}.steps[${i}]`;
        need(st, 'label', sw, isStr); max(st.label, 12, sw, 'label'); max(st.text, 40, sw, 'text'); max(st.gate, 20, sw, 'gate');
        if (st.gate && i === s.steps.length - 1) err(sw, '마지막 단계에는 gate를 쓰지 않는다');
      });
    }
  },
  chart(s, w) {
    need(s, 'title', w, isStr); max(s.caption, 60, w, 'caption');
    if (!need(s, 'chart', w, isObj)) return;
    const c = s.chart;
    if (!['bar', 'line', 'hbar'].includes(c.kind)) err(`${w}.chart`, `kind "${c.kind}" — bar | line | hbar`);
    if (need(c, 'data', `${w}.chart`, isArr)) {
      count(c.data, 2, 8, `${w}.chart`, 'data');
      if (c.kind === 'hbar' && c.data.length > 5) warn(`${w}.chart`, 'hbar data는 2~5개 권장');
      c.data.forEach((d, i) => {
        const dw = `${w}.chart.data[${i}]`;
        need(d, 'label', dw, isStr); need(d, 'value', dw, (v) => typeof v === 'number' && Number.isFinite(v));
        max(d.label, 10, dw, 'label');
      });
    }
    if (c.baseline !== undefined) {
      need(c.baseline, 'value', `${w}.chart.baseline`, (v) => typeof v === 'number'); max(c.baseline?.label, 16, `${w}.chart.baseline`, 'label');
    }
  },
  comparison(s, w) {
    need(s, 'title', w, isStr);
    if (!need(s, 'columns', w, isArr) || !need(s, 'rows', w, isArr)) return;
    count(s.columns, 2, 5, w, 'columns'); count(s.rows, 2, 6, w, 'rows');
    s.columns.forEach((c, i) => max(c, 20, `${w}.columns[${i}]`, '열 제목'));
    const cell = s.columns.length <= 3 ? 32 : 20;
    s.rows.forEach((r, i) => {
      const rw = `${w}.rows[${i}]`;
      need(r, 'label', rw, isStr); max(r.label, 10, rw, 'label');
      if (need(r, 'values', rw, isArr)) {
        if (r.values.length !== s.columns.length) err(rw, `values ${r.values.length}개 — columns 수(${s.columns.length})와 같아야 함`);
        r.values.forEach((v, j) => max(v, cell, `${rw}.values[${j}]`, '셀'));
      }
      if (r.marks !== undefined) {
        if (!isArr(r.marks) || r.marks.length !== s.columns.length) err(rw, 'marks는 values와 같은 길이 배열');
        else r.marks.forEach((m) => { if (m !== null && !['good', 'bad', 'warn'].includes(m)) err(rw, `mark "${m}" — null | good | bad | warn`); });
      }
    });
    if (s.highlight !== undefined && !(Number.isInteger(s.highlight) && s.highlight >= 0 && s.highlight < s.columns.length)) err(w, 'highlight 열 인덱스 범위 밖');
    if (s.highlightRow !== undefined && !(Number.isInteger(s.highlightRow) && s.highlightRow >= 0 && s.highlightRow < s.rows.length)) err(w, 'highlightRow 행 인덱스 범위 밖');
  },
  split(s, w) {
    need(s, 'title', w, isStr);
    if (!isArr(s.bullets) && !isStr(s.body) && !s.image) err(w, '`bullets` | `body` | `image` 중 하나 이상 필요');
    image(s.image, `${w}.image`);
    if (s.imageSide && !['left', 'right'].includes(s.imageSide)) err(w, 'imageSide — left | right');
    if (s.imageRatio && !['1/3', '1/2', '2/3'].includes(s.imageRatio)) err(w, 'imageRatio — 1/3 | 1/2 | 2/3');
    const narrow = s.imageRatio === '2/3' && s.image;
    if (isArr(s.bullets)) bulletsList(s.bullets, w, narrow ? 2 : 4, 50);
    max(s.body, narrow ? 80 : 120, w, 'body');
  },
  matrix(s, w) {
    need(s, 'title', w, isStr); max(s.caption, 60, w, 'caption');
    if (need(s, 'axes', w, isObj)) for (const a of ['x', 'y']) {
      const aw = `${w}.axes.${a}`;
      if (need(s.axes, a, `${w}.axes`, isObj)) { need(s.axes[a], 'label', aw, isStr); for (const k of ['label', 'low', 'high']) max(s.axes[a][k], 12, aw, k); }
    }
    if (need(s, 'quadrants', w, isArr)) {
      count(s.quadrants, 1, 4, w, 'quadrants');
      const seen = new Set();
      s.quadrants.forEach((q, i) => {
        const qw = `${w}.quadrants[${i}]`;
        if (!['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(q.position)) err(qw, `position "${q.position}"`);
        else if (seen.has(q.position)) err(qw, `position 중복: ${q.position}`); else seen.add(q.position);
        need(q, 'label', qw, isStr); max(q.label, 16, qw, 'label'); max(q.text, 50, qw, 'text'); tone(q.tone, qw);
        if (isArr(q.items)) { count(q.items, 0, 4, qw, 'items'); q.items.forEach((t, j) => max(t, 16, `${qw}.items[${j}]`, '항목')); }
      });
    }
  },
  cards(s, w) {
    need(s, 'title', w, isStr);
    if (!need(s, 'cards', w, isArr)) return;
    count(s.cards, 2, 4, w, 'cards');
    const withImg = s.cards.filter((c) => c && c.image).length;
    if (withImg && withImg !== s.cards.length) err(w, '카드는 모두 이미지가 있거나 모두 없어야 함');
    s.cards.forEach((c, i) => {
      const cw = `${w}.cards[${i}]`;
      need(c, 'title', cw, isStr);
      max(c.label, 16, cw, 'label'); max(c.title, 24, cw, 'title'); max(c.value, 8, cw, 'value');
      max(c.text, c.image ? 40 : 60, cw, 'text');
      if (isArr(c.bullets)) { count(c.bullets, 0, c.image ? 2 : 3, cw, 'bullets'); c.bullets.forEach((b, j) => max(b, 30, `${cw}.bullets[${j}]`, 'bullet')); }
      image(c.image, `${cw}.image`); tone(c.tone, cw);
    });
  },
  band(s, w) {
    need(s, 'title', w, isStr); image(s.image, `${w}.image`, { required: true });
    if (!isArr(s.items) && !isArr(s.bullets) && !isStr(s.body)) err(w, '`items` | `bullets` | `body` 중 하나 필요');
    if (len(s.title || '') > 32) warn(w, 'band title은 1줄(32자) 권장');
    if (isArr(s.items)) { count(s.items, 2, 4, w, 'items'); s.items.forEach((it, i) => { const iw = `${w}.items[${i}]`; need(it, 'heading', iw, isStr); max(it.heading, 16, iw, 'heading'); max(it.text, 50, iw, 'text'); max(it.value, 8, iw, 'value'); }); }
    if (isArr(s.bullets)) bulletsList(s.bullets, w, 3, 50);
    max(s.body, 100, w, 'body');
  },
  tree(s, w) {
    need(s, 'title', w, isStr); need(s, 'root', w, isStr); max(s.root, 12, w, 'root'); max(s.caption, 60, w, 'caption');
    if (need(s, 'levels', w, isArr)) { count(s.levels, 2, 2, w, 'levels'); s.levels.forEach((l, i) => { const lw = `${w}.levels[${i}]`; need(l, 'question', lw, isStr); max(l.question, 20, lw, 'question'); max(l.signal, 30, lw, 'signal'); }); }
    if (need(s, 'branches', w, isArr)) {
      count(s.branches, 2, 2, w, 'branches');
      s.branches.forEach((b, i) => {
        const bw = `${w}.branches[${i}]`;
        need(b, 'label', bw, isStr); max(b.label, 10, bw, 'label');
        if (need(b, 'children', bw, isArr)) { count(b.children, 2, 2, bw, 'children'); b.children.forEach((c, j) => { const cw = `${bw}.children[${j}]`; need(c, 'label', cw, isStr); need(c, 'leaf', cw, isStr); max(c.label, 10, cw, 'label'); max(c.leaf, 14, cw, 'leaf'); tone(c.tone, cw); }); }
      });
    }
    if (s.background) err(w, 'tree에는 background 금지');
  },
  equation(s, w) {
    need(s, 'title', w, isStr); max(s.caption, 60, w, 'caption');
    if (need(s, 'terms', w, isArr)) { count(s.terms, 2, 3, w, 'terms'); s.terms.forEach((t, i) => { const tw = `${w}.terms[${i}]`; need(t, 'label', tw, isStr); max(t.label, 12, tw, 'label'); max(t.text, 40, tw, 'text'); }); }
    if (need(s, 'result', w, isObj)) { need(s.result, 'label', `${w}.result`, isStr); max(s.result.label, 12, `${w}.result`, 'label'); max(s.result.text, 40, `${w}.result`, 'text'); }
    if (s.operators !== undefined) {
      if (!isArr(s.operators) || (isArr(s.terms) && s.operators.length !== s.terms.length - 1)) err(w, 'operators 길이 = terms − 1');
      else s.operators.forEach((o, i) => max(o, 2, `${w}.operators[${i}]`, '연산자'));
    }
  },
  pillars(s, w) {
    need(s, 'title', w, isStr);
    const one = (p, pw) => { if (!isStr(p.value) && !isStr(p.title)) err(pw, '`value` 또는 `title` 필요'); max(p.label, 16, pw, 'label'); max(p.value, 8, pw, 'value'); max(p.title, 20, pw, 'title'); max(p.text, 50, pw, 'text'); tone(p.tone, pw, ['default', 'accent', 'muted']); };
    if (need(s, 'pillars', w, isArr)) { count(s.pillars, 2, 3, w, 'pillars'); s.pillars.forEach((p, i) => one(p, `${w}.pillars[${i}]`)); }
    if (need(s, 'base', w, isObj)) one(s.base, `${w}.base`);
  },
  roc(s, w) {
    need(s, 'title', w, isStr); max(s.title, 50, w, 'title'); max(s.kicker, 60, w, 'kicker');
    if (need(s, 'axes', w, isObj)) { need(s.axes, 'x', `${w}.axes`, isStr); need(s.axes, 'y', `${w}.axes`, isStr); max(s.axes.x, 40, `${w}.axes`, 'x'); max(s.axes.y, 40, `${w}.axes`, 'y'); }
    const inUnit = (p) => isArr(p) && p.length === 2 && p.every((v) => typeof v === 'number' && v >= 0 && v <= 1);
    if (need(s, 'curves', w, isArr)) {
      count(s.curves, 1, 4, w, 'curves');
      s.curves.forEach((c, i) => {
        const cw = `${w}.curves[${i}]`;
        need(c, 'name', cw, isStr); max(c.name, 20, cw, 'name'); max(c.desc, 30, cw, 'desc');
        if (need(c, 'points', cw, isArr) && (c.points.length < 2 || !c.points.every(inUnit))) err(cw, 'points는 0~1 좌표 [x, y] 2개 이상');
        if (c.style && !['lead', 'alt', 'dim'].includes(c.style)) err(cw, 'style — lead | alt | dim');
      });
    }
    if (isArr(s.markers)) s.markers.forEach((m, i) => { if (!inUnit(m.point)) err(`${w}.markers[${i}]`, 'point는 0~1 좌표'); });
    if (s.note?.items) s.note.items.forEach((it, i) => (it.lines || []).forEach((l, j) => max(l, 20, `${w}.note.items[${i}].lines[${j}]`, 'line')));
    if (isArr(s.takeaways)) { count(s.takeaways, 1, 3, w, 'takeaways'); s.takeaways.forEach((t, i) => max(t, 60, `${w}.takeaways[${i}]`, 'takeaway')); }
  },
  'data-panels'(s, w) {
    need(s, 'title', w, isStr);
    if (need(s, 'panels', w, isArr)) {
      count(s.panels, 2, 2, w, 'panels');
      s.panels.forEach((p, i) => {
        const pw = `${w}.panels[${i}]`;
        need(p, 'heading', pw, isStr);
        if (p.tone && !['primary', 'secondary'].includes(p.tone)) err(pw, 'tone — primary | secondary');
        if (isArr(p.stats)) { count(p.stats, 0, 3, pw, 'stats'); p.stats.forEach((st, j) => { max(st.value, 8, `${pw}.stats[${j}]`, 'value'); max(st.label, 16, `${pw}.stats[${j}]`, 'label'); }); }
        max(p.message, 40, pw, 'message'); max(p.chartTitle, 24, pw, 'chartTitle');
        if (p.figure) image(p.figure, `${pw}.figure`);
        if (p.fields) { max(p.fields.label, 8, `${pw}.fields`, 'label'); max(p.fields.text, 80, `${pw}.fields`, 'text'); }
      });
    }
    if (s.link) { max(s.link.value, 6, `${w}.link`, 'value'); max(s.link.label, 10, `${w}.link`, 'label'); max(s.link.note, 30, `${w}.link`, 'note'); }
  },
  iceberg(s, w) {
    need(s, 'title', w, isStr); max(s.subtitle, 60, w, 'subtitle'); max(s.message, 40, w, 'message');
    if (need(s, 'above', w, isArr)) { count(s.above, 2, 4, w, 'above'); s.above.forEach((a, i) => { const aw = `${w}.above[${i}]`; need(a, 'heading', aw, isStr); max(a.heading, 12, aw, 'heading'); max(a.text, 26, aw, 'text'); max(a.example, 30, aw, 'example'); tone(a.tone, aw, ['default', 'accent']); }); }
    if (need(s, 'below', w, isArr)) { count(s.below, 3, 5, w, 'below'); s.below.forEach((b, i) => { const bw = `${w}.below[${i}]`; need(b, 'heading', bw, isStr); max(b.heading, 20, bw, 'heading'); max(b.text, 24, bw, 'text'); }); }
    if (isArr(s.flow)) { count(s.flow, 2, 5, w, 'flow'); s.flow.forEach((f, i) => max(f, 16, `${w}.flow[${i}]`, 'flow')); }
    if (s.background) err(w, 'iceberg에는 background 금지');
  },
  interview(s, w) {
    need(s, 'title', w, isStr); image(s.image, `${w}.image`, { required: true });
    need(s, 'quote', w, isStr); need(s, 'interviewee', w, isStr);
    max(s.quote, 90, w, 'quote'); max(s.interviewee, 30, w, 'interviewee'); max(s.implication, 60, w, 'implication');
    if (/^["“”]|["“”]$/.test((s.quote || '').trim())) warn(w, '인용 부호는 CSS가 붙이므로 데이터에 넣지 않는다');
    if (isArr(s.insights)) { count(s.insights, 0, 2, w, 'insights'); s.insights.forEach((it, i) => { const iw = `${w}.insights[${i}]`; need(it, 'heading', iw, isStr); max(it.heading, 16, iw, 'heading'); max(it.text, 50, iw, 'text'); }); }
    if (s.background) err(w, 'interview에는 background 금지');
  },
  contrast(s, w) {
    need(s, 'title', w, isStr);
    const imgs = [];
    for (const side of ['left', 'right']) {
      if (!need(s, side, w, isObj)) continue;
      const c = s[side], cw = `${w}.${side}`;
      need(c, 'headline', cw, isStr); max(c.label, 10, cw, 'label'); max(c.headline, 16, cw, 'headline');
      if (isStr(c.headline) && c.headline.split('\n').length > 2) err(cw, 'headline은 최대 2줄');
      if (isArr(c.lines)) { count(c.lines, 0, 3, cw, 'lines'); c.lines.forEach((l, i) => max(l, 30, `${cw}.lines[${i}]`, 'line')); }
      if (isArr(c.stats)) { count(c.stats, 0, 3, cw, 'stats'); c.stats.forEach((st, i) => { max(st.value, 8, `${cw}.stats[${i}]`, 'value'); max(st.label, 16, `${cw}.stats[${i}]`, 'label'); }); }
      if (c.image !== undefined) { if (isArr(c.image)) count(c.image, 1, 2, cw, 'image'); image(c.image, `${cw}.image`); (isArr(c.image) ? c.image : [c.image]).forEach((im) => { if (im?.fit && !['cover', 'contain'].includes(im.fit)) err(cw, 'image.fit — cover | contain'); }); }
      imgs.push(c.image !== undefined);
    }
    if (imgs.length === 2 && imgs[0] !== imgs[1]) err(w, 'image는 양쪽 모두 넣거나 모두 뺀다');
    if (s.background) err(w, 'contrast에는 background 금지');
  },
};
function bulletsList(list, w, maxItems, maxLen) {
  count(list, 1, maxItems, w, 'bullets');
  list.forEach((b, i) => {
    const bw = `${w}.bullets[${i}]`;
    if (typeof b === 'string') return max(b, maxLen, bw, 'bullet');
    if (!isObj(b) || !isStr(b.text)) return err(bw, 'bullet은 string 또는 { text, sub }');
    max(b.text, maxLen, bw, 'bullet');
    if (b.sub !== undefined) { if (!isArr(b.sub)) err(bw, 'sub는 string[]'); else { count(b.sub, 0, 3, bw, 'sub'); b.sub.forEach((x, j) => max(x, maxLen, `${bw}.sub[${j}]`, 'sub')); } }
  });
}

// ---------- 공통 ----------
const NO_KICKER = ['cover', 'quote'];
const NO_STEP = ['cover', 'section', 'closing', 'quote'];
const BG_OK = ['stats', 'big-number', 'quote', 'cards', 'process', 'bullets', 'pillars'];
const SOURCE_LONG = ['roc', 'data-panels'];
const TITLE_LONG = ['roc'];

function walkStrings(v, path, fn) {
  if (typeof v === 'string') fn(v, path);
  else if (isArr(v)) v.forEach((x, i) => walkStrings(x, `${path}[${i}]`, fn));
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) walkStrings(x, path ? `${path}.${k}` : k, fn);
}

let data;
try { data = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error(`✖ JSON을 읽을 수 없음: ${file}\n  ${e.message}`); process.exit(1); }

if (!isStr(data.version)) err('version', '필수 (예: "2.0")');
else if (data.version.trim().split('.')[0] !== '2') err('version', `"${data.version}" — major 2 필요`);
if (!isObj(data.meta)) err('meta', '필수');
else {
  need(data.meta, 'title', 'meta', isStr);
  if (data.meta.aspectRatio !== '16:9') err('meta.aspectRatio', '"16:9"이어야 함');
  if (data.meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.meta.date)) err('meta.date', 'YYYY-MM-DD');
  if (data.meta.steps !== undefined) { if (!isArr(data.meta.steps)) err('meta.steps', 'string[]'); else { count(data.meta.steps, 1, 6, 'meta', 'steps'); data.meta.steps.forEach((s, i) => max(s, 8, `meta.steps[${i}]`, '단계 이름')); } }
}
if (!isArr(data.slides) || !data.slides.length) err('slides', '1개 이상 필요');

const ids = new Set();
(data.slides || []).forEach((s, i) => {
  const w = `슬라이드 ${i + 1}${s?.id ? ` (${s.id})` : ''}`;
  if (!isObj(s)) return err(w, '객체여야 함');
  if (!isStr(s.id)) err(w, '`id` 필수');
  else { if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)) err(w, 'id는 kebab-case'); if (ids.has(s.id)) err(w, `id 중복: ${s.id}`); ids.add(s.id); }
  if (!T[s.type]) return err(w, `알 수 없는 type "${s.type}"`);
  if (s.theme && !['light', 'dark', 'accent'].includes(s.theme)) err(w, 'theme — light | dark | accent');
  if (s.kicker !== undefined && NO_KICKER.includes(s.type)) warn(w, `${s.type}에는 kicker를 쓰지 않는다`);
  if (s.kicker !== undefined && s.type !== 'roc') max(s.kicker, 20, w, 'kicker');
  if (s.title !== undefined && s.type !== 'cover' && !TITLE_LONG.includes(s.type)) max(s.title, 40, w, 'title');
  if (s.subtitle !== undefined && s.type !== 'iceberg') max(s.subtitle, 60, w, 'subtitle');
  if (s.source !== undefined && !['quote'].includes(s.type)) max(s.source, SOURCE_LONG.includes(s.type) ? 160 : 80, w, 'source');
  if (s.step !== undefined) {
    if (NO_STEP.includes(s.type)) err(w, `${s.type}에는 step을 쓰지 않는다`);
    else if (!Number.isInteger(s.step) || s.step < 0) err(w, 'step은 0 이상 정수');
    else if (!isArr(data.meta?.steps)) err(w, 'step을 쓰려면 meta.steps 필요');
    else if (s.step > data.meta.steps.length) err(w, `step ${s.step} > meta.steps 개수 ${data.meta.steps.length}`);
  }
  if (s.background !== undefined) {
    if (!BG_OK.includes(s.type)) err(w, `background는 ${BG_OK.join('·')}에만`);
    image(s.background, `${w}.background`);
  }
  walkStrings(s, '', (v, p) => { if (/<\/?[a-z][^>]*>/i.test(v)) err(`${w}.${p}`, 'HTML 태그 금지'); });
  T[s.type](s, w);
});

const rel = file.startsWith(root) ? file.slice(root.length + 1) : file;
for (const m of warnings) console.log(`⚠ ${m}`);
if (errors.length) {
  for (const m of errors) console.log(`✖ ${m}`);
  console.log(`\n${rel}: 오류 ${errors.length}건, 경고 ${warnings.length}건 — 실패`);
  process.exit(1);
}
console.log(`✔ ${rel}: 슬라이드 ${data.slides.length}장 — 스키마 v2.0 통과 (경고 ${warnings.length}건)`);
