# 멀티에이전트 웹 슬라이드 템플릿

HTML/CSS/Vanilla JS로 된 16:9 웹 슬라이드 덱을, 역할이 나뉜 Claude Code 서브에이전트 다섯 명이 만드는 범용 템플릿입니다. 주제는 `data/brief.md` 하나로 바꾸고, 색은 **히어로 색 1개**에서 덱 전체 팔레트가 파생됩니다.

- 빌드 도구 없음 — 정적 서버만 있으면 됩니다.
- 1920×1080 고정 캔버스를 `transform: scale()`로 맞춰 어떤 창 크기에서도 16:9 유지, 인쇄 시 한 페이지 = 한 장.
- 레이아웃 타입 25종(기본 9 · 시각 8 · 특화 8). 규격은 `.claude/skills/slide-schema.md`(v2.0).

## 에이전트 역할

| 에이전트 | 하는 일 | 수정하는 파일 |
|---|---|---|
| 사용자 | 주제·청중·히어로 색 등 입력 | `data/brief.md` |
| `searcher` | 수치·사실 조사와 검증, 라이선스 확인된 이미지 | `data/research.md`, `assets/images/**` |
| `planner` | 스토리라인과 슬라이드 내용 | `data/slides.json` |
| `designer` | 히어로 색 파생 팔레트, 타이포, 레이아웃 스타일 | `src/theme.css` |
| `developer` | 뷰어 마크업 · 렌더링 · 내비게이션 | `index.html`, `src/app.js` |
| `animator` | 슬라이드 전환 · 빌드 애니메이션 | `src/motion.css`, `src/motion.js` |

각 에이전트는 자기 파일만 고치고, 다른 파일이 바뀌어야 하면 보고서에 `요청 사항: <대상> — <내용>`을 남깁니다. 자세한 규칙은 `CLAUDE.md`.

## 새 덱 만드는 법

```text
/new-deck 사내 문서 검색 도구 도입 제안
```

1. `data/brief.md`가 비어 있으면 목적 · 청중 · 발표 시간 · 핵심 메시지 · 톤 · 히어로 색 · 브랜드 자산 · 꼭 넣을 수치 · 금지 사항을 하나씩 묻고 채웁니다.
2. searcher → planner → designer(배치 검토) → developer(필요 시) → designer(히어로 색 적용) → animator → 메인 세션 검수 순으로 위임하고, 단계마다 나온 `요청 사항:`을 다음 위임에 넘깁니다.

직접 진행하려면 `data/brief.md`를 먼저 채운 뒤 에이전트를 순서대로 부르면 됩니다.

### 히어로 색

`src/theme.css`의 `:root { --hero: #3b5bdb; }` 한 줄이 원천입니다. 바탕·강조·dark/accent 테마 색은 모두 `oklch(from var(--hero) L c h)`로 **밝기를 고정한 채** 파생되므로, 아주 밝거나 어두운 히어로를 넣어도 세 테마의 글자 대비가 WCAG AA(4.5:1)를 유지합니다. 상대 색을 지원하지 않는 브라우저용 `color-mix()`/정적 HEX 폴백이 함께 들어 있습니다.

## 로컬 실행

```bash
python -m http.server 8000   # 또는: npx serve .
# http://localhost:8000  — ←/→ · Space · Home/End, URL 해시(#3)로 이동
# ?motion=off 또는 M 키로 애니메이션 끄기
```

`fetch('data/slides.json')`을 쓰므로 `file://`로 직접 열면 동작하지 않습니다.

## 검증

```bash
node scripts/validate-slides.mjs          # slides.json: 필수 필드 · 타입 · 분량 제한(스키마 4절) · HTML 태그 · 이미지 경로
bash scripts/check-topic-leftovers.sh     # 이전 주제 단어 + theme.css의 #<slide-id> 선택자
node --check src/app.js && node --check src/motion.js
```

`validate-slides.mjs`는 다른 경로도 받습니다: `node scripts/validate-slides.mjs path/to/slides.json`. 종료 코드 0이면 통과입니다.

## 폴더

```
data/brief.md        입력 (사용자)
data/research.md     조사 결과 (searcher)
data/slides.json     슬라이드 데이터 (planner)
assets/images/       이미지
src/                 theme.css · app.js · motion.css · motion.js
scripts/             검증 스크립트
.claude/             에이전트 지시문 · 스키마 · /new-deck
```
