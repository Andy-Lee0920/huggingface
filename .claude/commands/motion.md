---
description: (선택) 슬라이드 전환·빌드 애니메이션을 점검·보강한다 — animator → capture 통과. 질문 없이 끝까지 실행.
argument-hint: (인자 없음)
---

# /motion

`CLAUDE.md` 4절 **자동 실행 프로토콜**을 따른다. 사용자에게 질문하지 않는다.

## 단계
1. **준비**: `output/log.md`에 `## /motion — <ISO 시각>`, `output/report.md`에 같은 제목의 절을 추가한다.
2. **전제 확인**: `node scripts/validate-slides.mjs`. 실패하면 6단계로 간다(원인: "/build-deck 먼저").
3. **animator 위임**: "data/slides.json에 쓰인 type 전부를 대상으로 src/motion.css·src/motion.js의 전환·빌드 애니메이션을 점검하고 빠진 type을 보강하라. 최종 상태는 theme.css 레이아웃과 같아야 하고, 인쇄·reduced-motion에서는 꺼져야 하며, '확인 필요' 배지는 움직이지 않는다. 끝나면 npm run check로 캡처 통과(넘침·잘림·콘솔 에러 0건)를 확인하라. 질문하지 말고, 결과 보고에 타입별 애니메이션 표와 자동 결정 표를 넣어라."
4. **검사**: `node scripts/check.mjs --stage motion`. `status.json`에 animator 담당(콘솔 · motion) 오류가 있으면 오류 목록을 붙여 animator를 다시 부른다 — **최대 2번**. 렌더 오류가 app.js 쪽이면 developer를 한 번 부른다.
5. **최종 상태**: `node scripts/check.mjs --stage motion` → `output/status.json`.
6. **보고서**: report.md 절에 결과 요약(ok · capture 오류 수), 타입별 애니메이션 표, 자동 결정 표, 미처리 요청 사항.
7. 마지막 메시지: `status.json` 요약 한 줄 + `output/report.md`.
