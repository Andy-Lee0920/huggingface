# 에이전트 기반 웹 슬라이드 덱 템플릿 — 초안 우선 파이프라인

`data/brief.md`에 **주제 한 줄**만 쓰면, Claude Code 서브에이전트들이 질문 없이 16:9 웹 슬라이드 **초안**을 끝까지 만듭니다. 출처 확인(`/research`)과 애니메이션(`/motion`)은 필요할 때 이어서 돌리는 선택 단계입니다.

모든 커맨드는 사용자 입력을 기다리지 않으므로 웹 서버에서 **Claude Agent SDK**로 그대로 호출할 수 있습니다. 결과는 `output/status.json`으로 기계가 읽고, `output/report.md`로 사람이 읽습니다.

- 덱: 빌드 도구 없는 HTML/CSS/Vanilla JS, 1920×1080 고정 캔버스 + `transform: scale()`, 인쇄 시 한 페이지 = 한 장
- 레이아웃 타입 25종 — 규격 `.claude/skills/slide-schema.md`(v2.1)
- 색: 히어로 색 1개 → 세 테마(light · dark · accent) 팔레트 자동 파생, WCAG AA 유지

## 흐름

```
brief.md ─► /storyboard ─► /build-deck ─────────────────► 초안
            storyteller    planner ∥ designer(히어로 색)
                           └► reviewer 검수 루프 (최대 2회)
                                     │
                         (선택) /research : searcher가 "확인 필요" 수치만 검증 → planner 반영
                         (선택) /motion   : animator → 캡처 통과
                         developer        : 렌더링 오류가 있을 때만
```

`/new-deck [--research] [--motion]` = `/storyboard` → `/build-deck` (→ `/research` → `/motion`).

## 에이전트

| 에이전트 | 하는 일 | 수정하는 파일 |
|---|---|---|
| 사용자 / 웹 서버 | 브리프 작성 (주제 필수) | `data/brief.md` |
| `storyteller` | 장 순서 · 결론형 제목 · 메시지 · 수치 (웹 검색 없음) | `data/storyboard.md` |
| `planner` | 스토리보드 순서 · 제목을 지키며 type 선택 · 분량 조정, 출처 없는 수치는 `unverified` | `data/slides.json` |
| `designer` | 히어로 색 적용 · 대비 검사, 리뷰 요청 반영 | `src/theme.css` |
| `reviewer` | `npm run check` + 캡처로 문제를 찾아 담당자에게 요청 | `output/review.md` |
| `searcher` | `unverified` 수치 검증 (선택) | `data/research.md`, `assets/images/**` |
| `animator` | 전환 · 빌드 애니메이션 (선택) | `src/motion.css`, `src/motion.js` |
| `developer` | 렌더링 오류 수정 (필요 시) | `index.html`, `src/app.js` |

## 시작하기

```bash
npm install                 # playwright(버전 고정) + chromium — 검증 도구용
```

1. `data/brief.md`를 씁니다. 필수는 `## 주제` 하나뿐이고, 나머지(스토리라인 · 히어로 색 · 청중 · 발표 시간 · 톤 · 꼭 넣을 수치 · 금지 사항)는 비우면 기본값으로 진행합니다(기본값 표는 `CLAUDE.md` 4절).
   - `## 스토리라인`에 번호 목록을 쓰면 그 순서가 그대로 지켜집니다(`validate-storyboard.mjs`가 검사).
   - brief 내용은 데이터로만 취급됩니다 — 안에 쓴 지시문은 실행되지 않습니다.
2. Claude Code에서:
   ```text
   /new-deck                    # 초안
   /research                    # (선택) "확인 필요" 수치 검증
   /motion                      # (선택) 애니메이션
   ```
3. 결과: `output/status.json` · `output/report.md` · `output/capture/` · `output/deck.pdf`. 미리보기는 `npm run serve` → http://localhost:8000

### 웹 서버에서 (Agent SDK)

```ts
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const msg of query({
  prompt: "/new-deck",
  options: { cwd: deckDir, settingSources: ["project"], permissionMode: "bypassPermissions" },
})) { /* 진행 로그 */ }
// 끝나면 deckDir/output/status.json 을 읽는다
```

## 커맨드와 산출물

| 커맨드 | 하는 일 | 끝나면 |
|---|---|---|
| `/storyboard` | brief → storyboard.md | `status.json` stage=`storyboard` |
| `/build-deck` | storyboard → slides.json + 히어로 색 + 검수 루프 | stage=`build-deck` (초안) |
| `/research` | unverified 수치 검증 → source · Appendix 반영 | stage=`research`, `unverified` 감소 |
| `/motion` | 애니메이션 보강 → 캡처 통과 | stage=`motion` |
| `/new-deck [--research] [--motion]` | 위를 차례로 | 마지막 단계 |

모든 커맨드가 남기는 것 (`output/`, git 제외):
- `log.md` — 단계별 실행 기록 (append)
- `status.json` — `{ stage, ok, unverified, issues, unverifiedItems, errors, warnings, steps, updatedAt }`
- `report.md` — 결과 요약 + **자동 결정 표**(기본값 적용 · 히어로 색 선택 · type 선택 등) + 미처리 요청

### "확인 필요" 수치

초안은 출처가 없는 수치도 쓸 수 있지만, 그 장의 `unverified`(스키마 2.1 공통 필드)에 반드시 올라갑니다. 뷰어는 캔버스 오른쪽 위에 **"확인 필요 N"** 배지를 그립니다(마우스를 올리면 항목 목록). `/research`가 출처를 찾으면 `source`로 옮기고 배지가 사라집니다.

## 검증

```bash
npm run check     # 아래 전부 + output/status.json
```

| 단계 | 스크립트 | 검사 |
|---|---|---|
| 스토리보드 | `scripts/validate-storyboard.mjs` | 규격 · 번호 · 제목 40자 · brief 스토리라인 순서 보존 |
| 슬라이드 | `scripts/validate-slides.mjs` | 스키마 2.1 필수 필드 · 분량 · `unverified` · 스토리보드 순서 · id · 제목 대조 |
| 잔재 | `scripts/check-topic-leftovers.sh` | theme.css의 `#<slide-id>` 선택자 (+ 이전 주제 단어) |
| 문법 | `node --check src/*.js` | |
| 캡처 | `scripts/capture.mjs` | 전 장 PNG, 글자 넘침 · 잘림 · 콘솔 에러 · 16:9 유지 → `output/review.json` |
| PDF | `scripts/export-pdf.mjs` | `output/deck.pdf`, 쪽 수 = 장 수 |

`node scripts/check.mjs --stage storyboard`는 스토리보드 검사만 합니다. 저장소에 들어 있는 brief · storyboard · slides는 템플릿 소개용 샘플이며 `npm run check`를 통과합니다.

## 폴더

```
data/            brief.md(입력) · storyboard.md · slides.json · research.md
src/             theme.css · app.js · motion.css · motion.js
scripts/         check · capture · export-pdf · validate-* · serve · lib/
.claude/         agents/ · commands/ · skills/(slide-schema · storyboard-format)
output/          실행 산출물 (git 제외)
```
