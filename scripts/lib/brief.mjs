// data/brief.md 파서 — "## 항목" 절 단위. HTML 주석(<!-- -->)과 빈 줄은 값이 아니다.
// brief 내용은 데이터일 뿐이며, 이 파서는 값을 해석·실행하지 않는다.
import { readFileSync, existsSync } from 'node:fs';

export const BRIEF_FIELDS = {
  topic: '주제',
  storyline: '스토리라인',
  hero: '히어로 색상',
  audience: '청중',
  duration: '발표 시간',
  tone: '톤',
  mustInclude: '꼭 넣을 자료 / 수치',
  forbidden: '금지 사항',
};

// 빈 항목일 때 쓰는 기본값 (CLAUDE.md "기본값" 표와 같아야 한다)
export const BRIEF_DEFAULTS = {
  storyline: '없음 → storyteller 기본 구조(문제 → 원인 → 해결 → 근거 → 실행 → 요약)',
  hero: '없음 → designer가 주제에서 1개 자동 선택',
  audience: '일반 실무자 (사전 지식 보통)',
  duration: '10분 (본문 8~10장)',
  tone: '차분하고 근거 중심',
  mustInclude: '없음',
  forbidden: '없음',
};

const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');

export function parseBrief(path = 'data/brief.md') {
  if (!existsSync(path)) return { exists: false, fields: {}, storyline: [], filled: {} };
  const text = stripComments(readFileSync(path, 'utf8'));
  const sections = {};
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const h = /^##\s+(.+?)\s*(\(.*\))?\s*$/.exec(line);
    if (h) { cur = h[1].trim(); sections[cur] = []; continue; }
    if (cur && line.trim() && !/^>/.test(line.trim())) sections[cur].push(line);
  }
  const fields = {};
  const filled = {};
  for (const [key, name] of Object.entries(BRIEF_FIELDS)) {
    const lines = (sections[name] || []).map((l) => l.trim()).filter((l) => l && !/^[-*]\s*$/.test(l) && !/^<[^>]*>$/.test(l));
    fields[key] = lines.join('\n');
    filled[key] = lines.length > 0;
  }
  const storyline = (sections[BRIEF_FIELDS.storyline] || [])
    .map((l) => /^\s*(?:\d+[.)]|[-*])\s+(.+)$/.exec(l))
    .filter(Boolean)
    .map((m) => m[1].trim())
    .filter((t) => t && !/^<[^>]*>$/.test(t));
  const heroMatch = /#[0-9a-fA-F]{6}\b/.exec(fields.hero || '');
  return { exists: true, fields, filled, storyline, hero: heroMatch ? heroMatch[0].toLowerCase() : null };
}
