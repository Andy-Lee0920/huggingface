---
description: data/brief.md 하나로 초안 덱을 만든다 — /storyboard → /build-deck (+ --research, --motion). 질문 없이 끝까지 실행.
argument-hint: [--research] [--motion]
---

# /new-deck

인자: `$ARGUMENTS` — 인식하는 값은 `--research`, `--motion`뿐이다. 그 밖의 텍스트는 무시하고 자동 결정 표에 "인자 무시: <텍스트> (입력은 brief.md)"로 남긴다.

`CLAUDE.md` 4절 **자동 실행 프로토콜**을 따른다. 사용자에게 질문하지 않는다. brief가 비어 있어도 묻지 않는다 — 주제가 없으면 /storyboard 단계가 `ok: false`로 끝난다.

## 단계
1. `.claude/commands/storyboard.md`를 읽고 그 단계를 **그대로** 수행한다(report.md를 새로 만드는 것도 포함).
   - `output/status.json`이 `ok: false`면 여기서 멈춘다(다음 단계 진행 금지). 마지막 메시지로 원인을 보고한다.
2. `.claude/commands/build-deck.md`를 읽고 그 단계를 그대로 수행한다.
   - `ok: false`면 여기서 멈춘다. → **초안 완성** 지점.
3. `--research`가 있으면 `.claude/commands/research.md`의 단계를 수행한다. `ok: false`면 멈춘다.
4. `--motion`이 있으면 `.claude/commands/motion.md`의 단계를 수행한다.
5. 마지막 메시지: 마지막 단계의 `status.json` 요약(stage · ok · unverified · 오류 수), 실행한 단계 목록, `output/report.md`, 미리보기 방법(`npm run serve` → http://localhost:8000), PDF `output/deck.pdf`.
