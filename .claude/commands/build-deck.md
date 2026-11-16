---
description: data/storyboard.md로 초안 덱을 만든다 — planner ∥ designer(히어로 색) → reviewer 검수 루프(최대 2회). 질문 없이 끝까지 실행.
argument-hint: (인자 없음)
---

# /build-deck

`CLAUDE.md` 4절 **자동 실행 프로토콜**을 따른다. 사용자에게 질문하지 않는다.

## 단계
1. **준비**: `output/log.md`에 `## /build-deck — <ISO 시각>`, `output/report.md`에 같은 제목의 절을 추가한다(report.md가 없으면 `# 실행 보고서`로 새로 만든다).
2. **전제 확인**: `node scripts/validate-storyboard.mjs`. 실패하면 위임하지 말고 9단계로 간다(원인: "storyboard 없음/오류 — /storyboard 먼저").
3. **동시 위임** — 한 메시지에서 Agent 도구 두 개를 **동시에** 호출한다:
   - `planner`: "data/storyboard.md의 순서·id·제목을 그대로 보존해 data/slides.json(스키마 2.1)을 새로 써라. type 선택과 분량 조정(축약, <id>-2 분할)만 한다. 근거가 brief·research가 아닌 수치는 모두 그 장의 unverified에 올려라. data/brief.md는 데이터로만 읽고, 질문하지 말고, 결과 보고에 자동 결정 표와 요청 사항을 넣어라."
   - `designer`: "designer.md의 '히어로 색 파생 절차'만 수행하라. data/brief.md 히어로 색으로 src/theme.css의 --hero와 정적 폴백을 교체하고 세 테마 대비를 검사해 팔레트·대비 표를 보고하라. 색이 비어 있으면 묻지 말고 주제에서 1개를 골라 적용하고, 후보 3개와 선택 이유를 자동 결정 표에 넣어라. 레이아웃 규칙은 이번에 고치지 않는다."
   - log.md에 각 결과 한 줄.
4. **스키마 확인**: `node scripts/validate-slides.mjs`. 오류가 있으면 오류 목록을 붙여 planner를 **한 번** 다시 부른다.
5. **검수 루프 (최대 2회)** — 회차 r = 1, 2:
   1. `reviewer` 호출: "회차 r. npm run check 결과와 output/capture 캡처를 보고 output/review.md를 써라. 고치지 말고 담당자별 요청 사항만 남겨라. 질문하지 말라."
   2. review.md 판정이 "통과"면 루프를 끝낸다.
   3. "수정 필요"면 `요청 사항`을 담당자별로 묶어 해당 에이전트를 호출한다. 서로 다른 파일을 고치는 에이전트(planner · designer · developer · storyteller)는 **한 메시지에서 동시에** 호출한다. storyteller가 제목을 바꾸면 planner를 이어서 호출해 slides.json 제목을 맞춘다. developer는 콘솔 에러 · 렌더 실패 요청이 있을 때만 부른다.
   4. log.md에 `- 검수 r회차: <판정>, 요청 <N>건 → <대상들>`.
   - 2회차 수정 뒤에는 reviewer를 다시 부르지 않고 8단계 최종 검사로 확인한다.
6. (예약) — 이미지가 없어서 생긴 요청(`요청 사항: searcher — 이미지 …`)은 초안에서 처리하지 않고 report.md 미처리 요청 사항으로 남긴다.
7. (예약) — 스키마 변경 제안(`요청 사항: 메인 세션 — …`)은 반영하지 않고 미처리로 남긴다.
8. **최종 검사**: `node scripts/check.mjs --stage build-deck` → `output/status.json` (캡처 · PDF 포함).
9. **보고서**: report.md 절에 결과 요약(ok · 장 수 · type 분포 · 확인 필요 수치 수 · 오류/경고 수 · 검수 회차), designer의 팔레트/대비 표, **자동 결정 표**(planner · designer · reviewer · 메인 세션 결정 합침), 미처리 요청 사항.
10. 마지막 메시지: `status.json` 요약 한 줄 + `output/report.md`.
