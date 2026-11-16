// data/storyboard.md 파서 — .claude/skills/storyboard-format.md 규격
import { readFileSync, existsSync } from 'node:fs';

export const ROLES = ['cover', 'section', 'body', 'closing'];

export function parseStoryboard(path = 'data/storyboard.md') {
  if (!existsSync(path)) return { exists: false, title: null, slides: [], meta: {} };
  const text = readFileSync(path, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const lines = text.split(/\r?\n/);
  const out = { exists: true, title: null, slides: [], meta: {} };
  let cur = null;
  let list = null; // 현재 하위 목록을 받는 필드 이름
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    let m;
    if ((m = /^#\s+(.+)$/.exec(line)) && !out.title) { out.title = m[1].replace(/^스토리보드:\s*/, '').trim(); continue; }
    if ((m = /^##\s+(\d+)\.\s*(.*)$/.exec(line))) {
      cur = { no: Number(m[1]), title: m[2].trim(), fields: {}, lists: {}, line: lines.indexOf(raw) + 1 };
      out.slides.push(cur);
      list = null;
      continue;
    }
    if (!cur) {
      if ((m = /^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|/.exec(line)) && !/^[-\s|:]+$/.test(line) && m[1] !== '항목') out.meta[m[1]] = m[2];
      continue;
    }
    if ((m = /^- ([^:：]+)[:：]\s*(.*)$/.exec(line))) {
      const key = m[1].trim();
      cur.fields[key] = m[2].trim();
      list = m[2].trim() === '' ? key : null;
      if (list) cur.lists[list] = [];
      continue;
    }
    if ((m = /^\s{2,}[-*]\s+(.+)$/.exec(line)) && list) { cur.lists[list].push(m[1].trim()); continue; }
  }
  for (const s of out.slides) {
    s.id = s.fields.id || '';
    s.role = s.fields['역할'] || '';
    s.message = s.fields['메시지'] || '';
    const sl = s.fields['스토리라인'];
    s.storyline = sl ? sl.split(/[,\s]+/).filter(Boolean).map(Number) : [];
    s.numbers = (s.lists['수치'] || []).map((t) => {
      const [value, basis = ''] = t.split(/\s+[—-]\s+/);
      return { value: value.trim(), basis: basis.trim(), unverified: !/brief|research|F\d+/i.test(basis) };
    });
  }
  return out;
}
