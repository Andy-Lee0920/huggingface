---
name: slide-schema
description: data/slides.json 작성 규격 표준. 슬라이드 데이터를 작성·검증하거나, 이를 렌더링/스타일링할 때 반드시 참조한다.
---

# Slide Schema 표준 (v2.0)

> 변경 이력 — 2.0: 범용 템플릿화 (주제 중립 예시, 장별 id 스타일 금지, major 버전 검사). 1.x 데이터 구조와 필드는 그대로 호환되며 `version`만 `"2.0"`으로 올린다.

`data/slides.json`의 구조를 정의하는 **에이전트 간 계약 문서**다.
- planner는 이 규격대로 데이터를 작성한다.
- developer는 이 규격의 모든 `type`을 렌더링한다.
- designer는 "CSS 클래스 계약"에 정의된 클래스를 스타일링한다.
- 발표의 주제·청중·히어로 색 등 입력은 `data/brief.md`(사용자 소유)에 있다. 색은 **brief.md → designer → theme.css** 경로로만 흐르며 slides.json에는 색 필드를 두지 않는다.

이 문서의 변경은 사용자 승인 후에만 가능하며, 변경 시 `version`을 올린다. 뷰어(app.js)는 major 버전(`"2"`)만 확인하고, 다르면 콘솔 경고 후 렌더링을 계속한다.

## 0. 공통 규칙

- **theme.css에서 slide id 선택자(`#<slide-id>`) 금지.** 특정 장만 따로 조정해야 하면 스키마 필드나 타입 변형(variant, 예: `layout`, `imageRatio`, `tone`)을 추가해 달라고 요청한다(`요청 사항: 메인 세션 — <타입>에 <필드/변형> 추가 제안`). 장 하나에 맞춘 픽셀 보정은 다음 덱에서 쓰레기 규칙이 된다.
- 마크업 클래스는 6절 계약만 쓴다. 인라인 색·폰트 금지(색은 designer의 CSS 토큰).
- 이미지는 `assets/images/` 아래 로컬 파일만 쓴다(외부 URL 직접 연결 금지).

## 1. 최상위 구조

```json
{
  "version": "2.0",
  "meta": {
    "title": "발표 제목",
    "author": "발표자",
    "date": "2026-11-01",
    "language": "ko",
    "aspectRatio": "16:9",
    "steps": ["배경", "문제", "해결안", "효과", "다음 단계"]
  },
  "slides": [ /* Slide 객체 배열 */ ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `version` | string | ✅ | 스키마 버전. 현재 `"2.0"` (major `2`면 허용) |
| `meta.title` | string | ✅ | 발표 제목 (브라우저 `<title>`에도 사용) |
| `meta.author` | string | ⬜ | 발표자 |
| `meta.date` | string | ⬜ | `YYYY-MM-DD` |
| `meta.language` | string | ⬜ | 기본 `"ko"` |
| `meta.aspectRatio` | string | ✅ | 항상 `"16:9"` (변경 금지) |
| `meta.steps` | string[] | ⬜ | 진행 표시줄 단계 이름(최대 6개, 각 8자 이내). `step`을 쓰는 슬라이드가 있으면 필수 |
| `slides` | Slide[] | ✅ | 1개 이상 |

## 2. Slide 공통 필드

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | string | ✅ | 고유 식별자. kebab-case (`intro`, `market-size`). 중복 금지. **스타일 선택자로 쓰지 않는다** |
| `type` | string | ✅ | 아래 3절의 레이아웃 타입 중 하나 |
| `title` | string | 타입별 | 슬라이드 제목 |
| `notes` | string | ⬜ | 발표자 노트 (화면에 표시되지 않음) |
| `theme` | `"light"` \| `"dark"` \| `"accent"` | ⬜ | 슬라이드별 배경 변형. 기본 `"light"`. `dark`·`accent`의 바탕은 히어로 색에서 파생된다 |
| `kicker` | string | ⬜ | 제목 위 작은 머리글(섹션명 등). 예: `"02 · 해결안"`. cover·quote 제외 모든 타입 |
| `step` | integer | ⬜ | `meta.steps` 기준 현재 단계(1부터). 지정하면 캔버스 상단 안전 영역 안에 단계 진행 표시줄(`.stepbar`)을 그리고 해당 단계를 강조한다. `0`이면 표시줄을 그리되 강조 없음(개요용). 생략하면 표시줄 없음. cover·section·closing·quote 제외 |
| `background` | object | ⬜ | 배경 사진. `{ "src", "alt", "credit", "focus", "overlay": "dark"(기본) \| "light" }`. 캔버스 전체를 사진이 채우고(안전 영역 예외) 위에 가독성 막을 깐 뒤 콘텐츠를 올린다. `dark`면 밝은 글자. **허용 타입: `stats`, `big-number`, `quote`, `cards`, `process`, `bullets`, `pillars`**. 자체 이미지가 있는 타입(`split`·`band`·`cover`·`image`)과 표(`comparison`)·`matrix`·`chart`에는 쓰지 않는다 |
| `source` | string | ⬜ | 하단 출처 각주 한 줄. 예: `"출처: 통계청(2026.1), 회사 IR(2026.2)"`. 상세 URL은 Appendix에 둔다 |

## 3. 레이아웃 타입

타입은 세 묶음이다 — **기본**(3.1~3.9), **시각**(3.10~3.17), **특화**(3.18~3.24: 특정 장면에 맞춘 다이어그램형).

### 3.1 `cover` — 표지
```json
{ "id": "cover", "type": "cover", "title": "발표 제목", "subtitle": "부제", "presenter": "홍길동 · 2026.11",
  "image": { "src": "assets/images/cover-hero.jpg", "alt": "이미지 설명", "credit": "Photo: Jane Doe / Unsplash", "focus": "right" },
  "imageStyle": "full", "overlay": "dark" }
```
필수: `title` / 선택: `subtitle`, `presenter`, `image`, `imageStyle`, `overlay`, `logo`(`{ "src": "assets/images/…", "alt": "…" }` 또는 최대 2개 배열 `[ {로고1}, {로고2} ]`. 표지 왼쪽 위 안전 영역 안 작은 로고. 클래스 `.cover__logo`(img). 배열이면 `.cover__logos`(div, `data-count`) 안에 순서대로 `img.cover__logo`를 두고 사이 구분선은 CSS로. **brief.md "사용 가능한 브랜드 자산"에 사용자가 제공한 파일만** 쓴다)

| 필드 | 값 | 설명 |
|---|---|---|
| `image.src` / `image.alt` | string | 대표 이미지. `assets/images/` 로컬 파일만. `alt` 필수 |
| `image.credit` | string | 저작자·라이선스 표기. 표지 하단 구석에 작게 표시 |
| `image.focus` | `"center"`(기본) \| `"left"` \| `"right"` \| `"top"` \| `"bottom"` | 잘릴 때 남길 피사체 위치 (`object-position`) |
| `imageStyle` | `"full"`(기본) \| `"split"` | `full`: 이미지가 캔버스 전체를 채우는 풀블리드 배경, 텍스트는 그 위에. `split`: 캔버스 오른쪽 약 55%를 이미지가 가장자리까지 채우고 왼쪽에 텍스트 |
| `overlay` | `"dark"`(기본) \| `"light"` \| `"none"` | `full`일 때 텍스트 가독성을 위한 그라데이션 막. `dark`면 밝은 글자, `light`면 어두운 글자. `none`은 이미지 자체에 텍스트용 여백·명암이 충분할 때만 |

- 이미지가 있는 cover는 안전 영역 예외로 이미지가 캔버스 가장자리까지 채운다. 텍스트는 안전 영역(80px) 안에 둔다.
- 분량: 이미지가 있는 cover의 `title`은 **24자 이내 권장**(최대 40자), `subtitle` 40자 이내 권장.

### 3.2 `section` — 챕터 구분
```json
{ "id": "part-1", "type": "section", "number": "01", "title": "문제 정의" }
```
필수: `title` / 선택: `number`, `subtitle`

### 3.3 `bullets` — 제목 + 글머리표
```json
{
  "id": "why", "type": "bullets", "title": "지금 바꿔야 하는 세 가지 이유",
  "bullets": [
    "처리 시간이 3년간 2배로 늘었다",
    { "text": "대안 도구의 강점", "sub": ["속도", "비용"] }
  ]
}
```
필수: `title`, `bullets` / 항목은 string 또는 `{ "text": string, "sub": string[] }`

### 3.4 `two-column` — 2단 비교
```json
{
  "id": "compare", "type": "two-column", "title": "수작업 3일이 자동화로 10분",
  "left":  { "heading": "Before", "bullets": ["수작업", "3일 소요"] },
  "right": { "heading": "After",  "bullets": ["자동화", "10분 소요"], "tone": "accent" }
}
```
필수: `title`, `left`, `right` / 각 컬럼은 `heading`(선택) + `bullets` 또는 `body`, 선택 `tone`(`"default"` | `"accent"` | `"danger"` — 카드 테두리·머리글 색)

### 3.5 `image` — 이미지 중심
```json
{ "id": "screenshot", "type": "image", "title": "대시보드", "src": "assets/images/dashboard.png", "alt": "대시보드 화면", "caption": "실시간 지표" }
```
필수: `src`, `alt` / 선택: `title`, `caption`, `fit`(`"contain"` 기본 | `"cover"`), `credit`(사진 저작자·라이선스 표기, 예: `"Photo: Jane Doe / Unsplash"`)

> 이미지 규칙: 이미지는 searcher가 라이선스를 확인해 내려받으며, 저작자·라이선스는 슬라이드의 `credit`으로 표시한다(Appendix의 `image` 유형은 라이선스상 별도 표기가 필요한 경우에만 사용).

### 3.6 `stats` — 핵심 수치
```json
{
  "id": "kpi", "type": "stats", "title": "도입 반년 만에 만족도 98%",
  "items": [
    { "value": "98%", "label": "사용자 만족도" },
    { "value": "3.2x", "label": "처리 속도" }
  ]
}
```
필수: `title`, `items`(2~4개) / 각 항목 `value`, `label` 필수

### 3.7 `quote` — 인용
```json
{ "id": "voice", "type": "quote", "quote": "이제 찾는 시간보다 쓰는 시간이 길어졌다.", "source": "시범 사용자 A" }
```
필수: `quote` / 선택: `source`

### 3.8 `closing` — 마무리
```json
{ "id": "end", "type": "closing", "title": "감사합니다", "contact": "team@example.com" }
```
필수: `title` / 선택: `subtitle`, `contact`

### 3.9 `references` — 참고 자료 (Appendix)
발표에 사용한 출처를 **자료 유형별로** 나열한다. 한 슬라이드에는 한 가지 유형만 담고, 항목이 많으면 같은 유형으로 슬라이드를 나눈다(제목에 `(1/2)` 등 표기).
```json
{
  "id": "appendix-articles", "type": "references",
  "title": "Appendix · 참고 자료",
  "category": "article",
  "items": [
    {
      "ref": "F1",
      "publisher": "예시일보",
      "title": "원격 근무 3년, 회의 시간은 오히려 늘었다",
      "date": "2026-08-31",
      "url": "https://news.example.com/articles/12345",
      "usedIn": "3, 7"
    }
  ]
}
```
필수: `title`, `category`, `items` / 선택: `subtitle`

`category` 값과 화면 표기:

| 값 | 화면 표기 | 해당 자료 |
|---|---|---|
| `article` | 기사 | 언론 보도 기사 |
| `official` | 공식 자료 | 기업 보도자료·뉴스룸, IR·공시, 정부·공공기관 발표, 표준 문서 |
| `report` | 보고서·PDF | 리서치 리포트, 통계 보고서, PDF 문서 |
| `paper` | 논문 | 학술 논문, 학회 발표 |
| `other` | 기타 | 위에 해당하지 않는 자료 |
| `image` | 이미지 | 슬라이드에 사용한 사진·일러스트 (항목 `title`에 내용과 라이선스를 함께 적는다. 예: `"사무실 책상 위 노트북 사진 — Unsplash License"`) |

`items` 각 항목:

| 필드 | 필수 | 설명 |
|---|---|---|
| `publisher` | ✅ | 매체·기관·저자 |
| `title` | ✅ | 기사·문서·논문 제목 (원문 제목) |
| `url` | ✅ | 원문 링크 (`http(s)://`로 시작) |
| `date` | ⬜ | 발행일 `YYYY-MM-DD` 또는 `YYYY-MM` |
| `ref` | ⬜ | `data/research.md`의 사실 ID (예: `"F1"`, `"F1, F2"`) |
| `usedIn` | ⬜ | 이 자료를 근거로 쓴 슬라이드 번호 (예: `"3, 7"`) |

### 3.10 `big-number` — 단일 핵심 수치
화면을 지배하는 숫자 하나와 그 의미. 추이·비교 맥락을 함께 준다.
```json
{ "id": "growth", "type": "big-number", "kicker": "성과", "title": "활성 사용자 5년 만에 3배",
  "value": "116만", "label": "월간 활성 사용자 (2025)",
  "context": "2020년 36만 → 2024년 100만 → 2025년 116만", "source": "출처: 회사 IR(2026.1)" }
```
필수: `value`, `label` / 선택: `title`, `context`

### 3.11 `process` — 단계 흐름
```json
{ "id": "pipeline", "type": "process", "title": "요청부터 배포까지 네 단계로 줄인다",
  "steps": [
    { "label": "접수", "text": "요청을 한 양식으로 받는다", "gate": "필수 항목 확인" },
    { "label": "분석", "text": "영향 범위를 자동으로 계산" },
    { "label": "검토", "text": "담당자 1명이 승인" },
    { "label": "배포", "text": "승인 즉시 자동 배포" }
  ],
  "caption": "평균 처리 기간 5일 → 1일" }
```
필수: `title`, `steps`(3~5개) / 각 단계 `label` 필수, `text` 선택, `gate` 선택(string — 이 단계 **다음**으로 넘어가기 전 관문 조건. 단계 사이에 마름모로 표시. 마지막 단계에는 쓰지 않는다) / 선택: `caption`(60자, 단계 아래 한 줄 `.slide__caption`), `layout`(3.19 b)

### 3.12 `chart` — 막대/선 그래프
라이브러리 없이 developer가 인라인 SVG로 렌더링한다. 값은 숫자(number)로 쓴다.
```json
{ "id": "market", "type": "chart", "title": "북미가 처음으로 최대 시장이 됐다",
  "chart": {
    "kind": "bar", "unit": "억 달러",
    "data": [
      { "label": "북미", "value": 22, "highlight": true },
      { "label": "유럽", "value": 20 },
      { "label": "아시아", "value": 11 }
    ],
    "baseline": { "value": 15, "label": "전체 평균" }
  },
  "caption": "2025년 지역별 매출", "source": "출처: 회사 연차보고서(2026.1)" }
```
필수: `title`, `chart.kind`(`"bar"` | `"line"` | `"hbar"`), `chart.data`(2~8개, 각 `label` string·`value` number) / 선택: `chart.unit`, `data[].highlight`(boolean, 강조색), `data[].display`(화면 표기 문자열, 예: `"22억"`), `caption`, `chart.baseline`(기준선 `{ "value": number, "label": string }`. 같은 값 축 위치에 차트 폭 전체를 가로지르는 점선을 긋고 끝에 `label`(16자 이내)을 표시한다)

### 3.13 `comparison` — 기준별 비교표
```json
{ "id": "options", "type": "comparison", "title": "세 가지 선택지 중 B가 비용·속도 모두 앞선다",
  "columns": ["A. 직접 구축", "B. 구독형 도구", "C. 현행 유지"],
  "rows": [
    { "label": "초기 비용", "values": ["높음", "낮음", "없음"], "marks": ["bad", "good", null] },
    { "label": "도입 기간", "values": ["6개월", "2주", "—"] }
  ],
  "highlight": 1 }
```
필수: `title`, `columns`(2~5개), `rows`(2~6개, 각 `label` + `values` 배열 길이 = columns 수) / 선택: `highlight`(강조할 열 인덱스, 0부터), `highlightRow`(강조할 행 인덱스, 0부터), `rows[].marks`(values와 같은 길이 배열, 각 값 `null` | `"good"` | `"bad"` | `"warn"` — 셀 단위 색 표시)
- 평점 기호(◎ ○ △ ×)는 일반 텍스트로 쓴다.

### 3.14 `split` — 좌우 분할 (헤드라인 + 내용/이미지)
한쪽에 큰 헤드라인과 본문, 다른 쪽에 이미지(또는 본문)를 둔다.
```json
{ "id": "pilot", "type": "split", "kicker": "시범 운영", "title": "한 팀에서 먼저 써 보고 넓힌다",
  "bullets": ["**지금**: 20명 팀에서 4주 시범 운영", "**다음**: 결과에 따라 전사 확대"],
  "image": { "src": "assets/images/team-desk.jpg", "alt": "책상에서 함께 화면을 보는 팀", "credit": "Photo: Jane Doe / Unsplash" },
  "imageSide": "right" }
```
필수: `title` + (`bullets` | `body` | `image` 중 하나 이상) / 선택: `subtitle`, `image.credit`, `imageSide`(`"right"` 기본 | `"left"`), `imageRatio`(`"1/2"` 기본 | `"1/3"` | `"2/3"` — 캔버스 폭 중 이미지가 차지하는 비율. `2/3`이면 텍스트 칸이 좁으므로 bullets 최대 2개·body 80자)
- `image`가 있으면 이미지가 캔버스 한쪽을 가장자리까지 꽉 채우고(cover, 안전 영역 예외), 반대쪽에 제목과 본문이 온다. `image`가 없으면 왼쪽 제목 / 오른쪽 본문 배치.

### 3.15 `matrix` — 2×2 매트릭스
두 축으로 나눈 네 사분면. 영향력×불확실성 분석, 시나리오 매트릭스에 쓴다.
```json
{ "id": "scenarios", "type": "matrix", "step": 3, "title": "수요와 비용 두 축이 네 가지 미래를 가른다",
  "axes": {
    "x": { "label": "운영 비용", "low": "낮음", "high": "높음" },
    "y": { "label": "시장 수요", "low": "정체", "high": "성장" }
  },
  "quadrants": [
    { "position": "top-left", "label": "① 순항", "text": "투자 확대", "tone": "accent" },
    { "position": "top-right", "label": "② 과열", "text": "효율화가 관건" },
    { "position": "bottom-left", "label": "③ 정체", "text": "현상 유지", "tone": "muted" },
    { "position": "bottom-right", "label": "④ 위기", "text": "사업 재검토", "tone": "danger" }
  ],
  "caption": "성장률만 다른 변형이 아니라 근본적으로 다른 미래" }
```
필수: `title`, `axes.x.label`, `axes.y.label`, `quadrants`(1~4개, 각 `position` + `label`) / 선택: `axes.*.low`·`axes.*.high`(축 양 끝 라벨. x는 왼쪽=low·오른쪽=high, y는 아래=low·위=high), `quadrants[].text`, `quadrants[].items`(string[], 사분면 안에 점·칩으로 나열), `quadrants[].tone`(`"default"` | `"accent"` | `"muted"` | `"danger"`), `caption`
- `position`: `"top-left"` | `"top-right"` | `"bottom-left"` | `"bottom-right"`. 중복 금지.

### 3.16 `cards` — 카드 2~4개
표 대신 쓰는 병렬 비교·목록. 카드마다 사진·톤을 줄 수 있다.
```json
{ "id": "benefits", "type": "cards", "title": "도입 효과는 시간·비용·품질 세 갈래",
  "cards": [
    { "label": "01 · 시간", "value": "−50%", "title": "검색 시간 절반", "text": "문서를 찾는 데 쓰던 시간이 줄어든다", "tone": "accent" },
    { "label": "02 · 비용", "title": "라이선스 통합", "bullets": ["중복 도구 3종 정리", "연간 계약 1건으로"] },
    { "label": "03 · 품질", "title": "최신 문서만 노출", "text": "만료된 문서는 검색에서 자동 제외" }
  ] }
```
필수: `title`, `cards`(2~4개, 각 `title` 필수) / 선택: `cards[].label`(카드 위 머리글), `cards[].text`(본문 문장) 또는 `cards[].bullets`(최대 3개), `cards[].value`(큰 숫자·기호, 8자), `cards[].image`(카드 상단 사진, `assets/images/` 로컬, `alt` 필수, `credit`·`focus` 선택), `cards[].tone`(`"default"` | `"accent"` | `"muted"` | `"danger"`)
- 한 슬라이드의 카드는 모두 이미지가 있거나 모두 없게 쓴다(높이 정렬).

### 3.17 `band` — 사진 띠 + 내용
캔버스 위쪽을 가로 사진 띠가 가장자리까지 채우고(안전 영역 예외), 아래에 제목과 내용이 온다.
```json
{ "id": "roadmap", "type": "band", "title": "시범 운영으로 근거를 쌓고 단계적으로 넓힌다",
  "image": { "src": "assets/images/workshop.jpg", "alt": "화이트보드 앞 워크숍", "credit": "Photo: … / Unsplash", "focus": "center" },
  "items": [ { "heading": "01 시범", "text": "한 팀 4주 운영" }, { "heading": "02 확대", "text": "부서 단위 적용" }, { "heading": "03 정착", "text": "전사 표준화" } ] }
```
필수: `title`, `image`, (`items` | `bullets` | `body` 중 하나) / 선택: `kicker`, `subtitle`, `items[].value`(큰 숫자, 8자)
- `items`: 2~4개, 각 `heading` 필수, `text` 선택. 가로로 나란히 놓인다.
- 사진 띠 높이는 캔버스의 약 40%(designer가 정함). `step`을 쓰면 진행 표시줄은 띠 위에 올라간다(designer가 가독성 처리).

### 3.18 `tree` — 갈림길 나무
출발점 하나가 질문 두 개를 거치며 2 → 4 갈래로 나뉘어 결과 4개에 도착하는 왼쪽→오른쪽 의사결정 나무. 두 질문의 조합이 네 가지 결과가 되는 장면에 쓴다(다음 장 `matrix`로 이어지기 좋다).
```json
{ "id": "two-questions", "type": "tree", "step": 3, "kicker": "두 질문, 네 갈래", "title": "미래를 가를 두 가지 질문",
  "root": "현재 상태",
  "levels": [
    { "question": "수요가 계속 늘까?", "signal": "징후: 신규 가입 3분기 연속 증가" },
    { "question": "비용을 낮출 수 있을까?", "signal": "징후: 단가 협상 진행 중" }
  ],
  "branches": [
    { "label": "늘어난다", "children": [
      { "label": "낮춘다", "leaf": "순항", "tone": "accent" },
      { "label": "못 낮춘다", "leaf": "과열" } ] },
    { "label": "정체", "children": [
      { "label": "낮춘다", "leaf": "현상 유지", "tone": "muted" },
      { "label": "못 낮춘다", "leaf": "위기", "tone": "danger" } ] }
  ],
  "caption": "두 답의 조합 = 다음 장의 네 가지 미래", "source": "출처: …" }
```
필수: `title`, `root`, `levels`(정확히 2개, 각 `question` 필수·`signal` 선택), `branches`(정확히 2개, 각 `label` + `children` 정확히 2개, 각 child `label`·`leaf` 필수) / 선택: `children[].tone`(`"default"` | `"accent"` | `"muted"` | `"danger"`), `caption`, `kicker`, `step`, `source`
- 배치: 4열(출발점 | 첫 번째 질문의 답 2개 | 두 번째 질문의 답 4개 | 결과 4개). `levels[0]`은 2열 위, `levels[1]`은 3열 위에 열 머리글(질문 + 징후)로 표시. 갈래는 선(연결선)으로 잇는다.
- 사진·`background` 사용 금지.

### 3.19 변형 포맷 — 반복 구조(1:1:1) 대체

#### (a) `chart.kind: "hbar"` — 가로 막대
`bar`와 같은 데이터(`data`, `unit`, `highlight`, `display`, `baseline`, `caption`)를 가로 막대로 그린다. 라벨은 왼쪽, 값은 막대 끝. `baseline`은 세로 점선(라벨은 선 위쪽). 데이터 2~5개 권장. 클래스는 bar와 같고 `.slide__chart[data-kind="hbar"]`로 구분.

#### (b) `process.layout: "stairs"` — 올라가는 계단
`process`의 선택 필드. 단계가 왼쪽 아래 → 오른쪽 위로 한 칸씩 높아지는 계단. `gate`는 계단 사이 문턱에 표시. 데이터·분량은 process와 동일(3~4단계 권장). 슬라이드에 `data-layout="stairs"`, 각 `li.step`에 `data-level="0|1|2…"`.

#### (c) `equation` — 수식형
```json
{ "id": "revenue-formula", "type": "equation", "title": "매출은 고객 수와 객단가의 곱",
  "terms": [ { "label": "고객 수", "text": "월간 유료 고객" },
             { "label": "객단가", "text": "고객당 월 결제액" } ],
  "operators": ["×"],
  "result": { "label": "월 매출", "text": "1~3년차 시나리오별" },
  "caption": "두 항 중 하나만 키워도 결과가 커진다", "source": "…" }
```
필수: `title`, `terms`(2~3개, 각 `label` 필수·`text` 선택), `result`(`label` 필수·`text` 선택) / 선택: `operators`(길이 = terms−1, 기본 모두 `"×"`; 각 1~2자), `caption`, `kicker`, `step`, `source`. 결과 앞에는 항상 `=`.
분량: `label` 12자 / `text` 40자 / `caption` 60자.

#### (d) `pillars` — 받침대 + 기둥
```json
{ "id": "value-pillars", "type": "pillars", "title": "두 가지 효과가 공통 기반 위에 선다",
  "pillars": [ { "label": "사용자", "value": "속도", "title": "찾는 시간 단축", "text": "검색 한 번에 최신 문서", "tone": "accent" },
               { "label": "관리자", "value": "통제", "title": "권한 일원화", "text": "접근 기록을 한곳에서" } ],
  "base": { "label": "공통 기반", "value": "데이터", "title": "정리된 문서 저장소", "text": "중복 제거 · 만료 관리 · 태그 표준" } }
```
필수: `title`, `pillars`(2~3개, 각 `value` 또는 `title` 필수), `base`(`value` 또는 `title` 필수) / 선택: 각 `label`·`text`·`tone`(`default`|`accent`|`muted`), `caption`, `kicker`, `step`, `source`. 기둥이 위, 받침대가 아래 전체 폭.
분량: `label` 16자 / `value` 8자 / `title` 20자 / `text` 50자.

### 3.20 `roc` — ROC 곡선 비교
왼쪽 정사각형 ROC 차트(인라인 SVG) + 오른쪽 모델 목록(선 견본·이름·설명·큰 AUC·신뢰구간) + 핵심 해석 문단. 좌표는 모두 0~1 데이터 값(x = FPR, y = TPR). 분류 모델·선별 기준의 성능을 비교할 때 쓴다.
```json
{ "id": "model-roc", "type": "roc", "step": 2, "kicker": "모델 비교", "title": "단순 규칙이 복잡한 모델만큼 잘 맞힌다",
  "axes": { "x": "위양성률 (FPR): 아닌데 맞다고 한 비율", "y": "진양성률 (TPR): 맞는 것을 찾아낸 비율" },
  "chance": { "label": "무작위 예측 (AUC 0.50)" },
  "curves": [
    { "id": "rule", "name": "단순 규칙", "desc": "변수 하나, 기준값만 조정", "auc": "0.78", "ci": "95% CI 0.70–0.85", "style": "lead", "fill": true, "points": [[0,0],[0.1,0.45],[0.38,0.86],[1,1]] },
    { "id": "logit", "name": "로지스틱 회귀", "desc": "변수 5개", "auc": "0.77", "style": "alt", "points": [[0,0],[0.2,0.6],[1,1]] },
    { "id": "base", "name": "기존 기준", "auc": "0.61", "style": "dim", "points": [[0,0],[0.4,0.6],[1,1]] } ],
  "markers": [ { "curve": "rule", "point": [0.38, 0.86], "style": "filled" }, { "curve": "rule", "point": [0.1, 0.45], "style": "hollow" } ],
  "note": { "at": [0.4, 0.36], "heading": "기준값을 바꾸면",
            "items": [ { "label": "느슨하게", "lines": ["35개 중 30개 포착", "212개 중 80개 오탐"] },
                       { "label": "엄격하게", "lines": ["35개 중 17개 포착", "212개 중 30개 오탐"] } ] },
  "takeaways": ["단순 규칙의 AUC가 회귀 모델과 같은 수준", "설명하기 쉬운 쪽을 기본안으로"],
  "source": "대상: … (roc는 160자까지)" }
```
필수: `title`, `axes.x`, `axes.y`, `curves`(1~4개, 각 `name`·`points`(2개 이상, 0~1) 필수) / 선택: `chance.label`, `curves[].id`·`desc`·`auc`(문자열)·`ci`·`style`(`"lead"` | `"alt"` | `"dim"`, 기본 `alt`)·`fill`(true면 곡선 아래 옅은 면, lead 하나만 권장), `markers[]`(`curve`, `point`, `style`: `"filled"`|`"hollow"`), `note`(`at`: 노트 블록 왼쪽 위 데이터 좌표, `heading`, `items[]`: `label` + `lines` 최대 2개), `takeaways`(1~3개, 첫 문장이 핵심·크게), `kicker`, `step`, `source`
- `markers[i]`는 `note.items[i]`와 지시선으로 연결한다.
- 그리기 순서: 면(fill) → 격자 → 무작위 대각선·라벨 → 곡선(dim → alt → lead) → 테두리 → 눈금 → 축 제목 → 지시선 → 표시점 → 노트.
분량: `title` 50자 / `kicker` 60자 / `axes` 각 40자 / `curves[].name` 20자·`desc` 30자 / `note.items[].lines` 각 20자 / `takeaways` 각 60자 / `source` 160자.

### 3.21 `data-panels` — 두 데이터 패널
두 데이터 출처를 좌우 패널로 나란히 보여 준다. 패널마다 제목·기준 시점·핵심 숫자·한 줄 메시지·차트 제목·차트 그림(SVG 파일)·수집 항목. 선택적으로 두 패널 사이에 연결 원(공통 키).
```json
{ "id": "data-overview", "type": "data-panels", "step": 2, "kicker": "분석 데이터", "title": "두 데이터를 고객 ID로 잇는다",
  "panels": [
    { "tone": "primary", "heading": "구매 기록", "meta": "2021–2025년, 5개년",
      "stats": [ { "value": "735", "label": "정제 후 기록 수" } ],
      "message": "연도별로 고르게 분포", "chartTitle": "연도별 기록 수",
      "figure": { "src": "assets/images/chart-records-by-year.svg", "alt": "연도별 기록 수 막대그래프" },
      "fields": { "label": "수집 항목", "text": "연도, 카테고리, 금액, 고객 ID" } },
    { "tone": "secondary", "heading": "설문 응답", "meta": "2025년 4분기", "stats": [ { "value": "247", "label": "응답 수" } ] } ],
  "link": { "value": "35", "label": "공통 고객", "note": "고객 ID\n기준으로 조인" },
  "source": "출처: 내부 데이터 (data-panels는 160자까지)" }
```
필수: `title`, `panels`(정확히 2개, 각 `heading` 필수) / 선택: 패널의 `tone`(`"primary"`=히어로 색 | `"secondary"`=중립 슬레이트, 기본 순서대로), `meta`, `stats`(0~3개, `value` 8자·`label` 16자), `message`(40자), `chartTitle`(24자), `figure`(`src`는 `assets/images/` 로컬 SVG/PNG, `alt` 필수), `fields`(`label` 8자, `text` 80자); `link`(있으면 두 패널 사이 가운데 열에 원형 배지: `value` 6자, `label` 10자, `note` 30자, `\n` 줄바꿈 허용); `kicker`, `step`, `source`(160자).
- 차트는 그림 파일로 넣는다(범례 포함). 그림은 사용자 제공 데이터로 searcher가 `assets/images/`에 만들고 데이터 출처를 research.md에 남긴다.

### 3.22 `iceberg` — 빙산 모델
수면 위에 "눈에 보이는 활동"(2~4개)을, 수면 아래에 그 활동이 쌓아 주는 "보이지 않는 가치"(3~5개, 네트워크처럼 연결)를 놓는 빙산 다이어그램. 맨 아래에 흐름 한 줄과 결론 문장.
```json
{ "id": "hidden-value", "type": "iceberg", "step": 1, "kicker": "숨은 가치", "title": "작은 서비스가 **큰 자산**을 쌓는다",
  "subtitle": "눈에 보이는 서비스에서 시작해, 보이지 않는 자산이 쌓인다",
  "above": [
    { "heading": "상담 서비스", "text": "고객 문의에 바로 답한다", "example": "예: 주문·배송 문의", "tone": "accent" },
    { "heading": "기록 관리", "text": "문의 이력을 남긴다" },
    { "heading": "정보 제공", "text": "자주 묻는 질문 정리" } ],
  "below": [
    { "heading": "DATA", "text": "고객 문의 데이터" },
    { "heading": "KNOWLEDGE", "text": "축적된 해결 사례" },
    { "heading": "TRUST", "text": "응답 품질에 대한 신뢰" },
    { "heading": "NETWORK", "text": "협력사 연결" } ],
  "flow": ["Data", "Insight", "Opportunity"],
  "message": "**작은 서비스**가 **더 큰 가치**를 만든다" }
```
필수: `title`, `above`(2~4개, 각 `heading` 필수), `below`(3~5개, 각 `heading` 필수) / 선택: `kicker`, `step`, `subtitle`, `above[].text`·`example`·`tone`(`"default"` | `"accent"`), `below[].text`, `flow`(2~5개 문자열), `message`, `source`
- `title`·`subtitle`·`message`의 `**굵게**`는 강조색으로 표시한다(designer).
- 사진·`background` 사용 금지. 빙산·수면·네트워크 점과 선은 developer가 인라인 SVG로 그리고(인라인 색 금지, 클래스만), 색·음영은 designer가 지정한다.
- **배치 기준 좌표(캔버스 1920×1080, developer SVG와 designer 라벨 배치의 공통 기준)**
  - 제목 영역: 왼쪽 위 안전 영역(x 80~900, y 80~300).
  - 수면선: y = 500, 캔버스 좌우 가장자리까지(안전 영역 예외). 수면 아래(y 500~1080)는 바다 면.
  - 수면 위 빙산: 밑변 x 470~1520(y 500), 큰 봉우리 (1180, 290), 작은 봉우리 (900, 360). 여러 면(facet)으로 나뉜 각진 형태.
  - 수면 아래 빙산: (470,500) → (620,650) → (830,820) → (960,860) → (1130,800) → (1360,660) → (1520,500). 바닥 꼭짓점 y ≤ 860.
  - `above` 라벨 위치(`data-pos` = 배열 순서, 개수별): 4개 → 0: 빙산 왼쪽 수면 위(중심 x≈500, y 330~480) · 1: 빙산 몸체 위 왼쪽(중심 x≈880, y 380~490) · 2: 큰 봉우리 위(중심 x≈1180, y 110~270) · 3: 빙산 오른쪽 수면 위(중심 x≈1640, y 330~480). 3개면 0·2·3 위치, 2개면 0·3 위치를 쓴다(`data-slot`에 실제 위치 번호).
  - `below` 노드 중심(`data-pos` = 배열 순서): 0 (960, 570) · 1 (720, 650) · 2 (1240, 640) · 3 (1210, 745) · 4 (960, 790). 3개면 0·1·2, 4개면 0~3 위치. 노드 사이를 가는 선으로 잇고 장식용 작은 점을 흩뿌린다.
  - 하단: `flow` y≈900~945, `message` y≈955~1000 (가운데 정렬, 안전 영역 하단 1000 이내). `source`가 있으면 `message`와 겹치지 않게 designer가 조정.

### 3.23 `interview` — 인터뷰 · 인용 장
에디토리얼 커버 스타일. 왼쪽 약 40%(캔버스 0~768px)에 사진이 위·아래·왼쪽 가장자리까지 꽉 차고(안전 영역 예외), 오른쪽 약 60%에 머리글 → 제목 → 인용문(가장 강조) → 출처(인터뷰 대상) → 인사이트 2개(가로 2열) → 시사점(하단) 순서로 놓인다. 식별 가능한 인물 얼굴 사진은 쓰지 않고, 그림자·실루엣·뒷모습·사물 사진을 쓴다.
```json
{ "id": "user-voice", "type": "interview", "step": 4, "kicker": "현장 인터뷰", "title": "현장은 속도보다 정확성을 원한다",
  "image": { "src": "assets/images/silhouette-window.jpg", "alt": "창가에 선 사람의 실루엣", "focus": "center" },
  "quote": "빨리 찾는 것보다 **맞는 문서**를 찾는 게 먼저예요.", "interviewee": "실무 담당자 (익명)",
  "insights": [ { "heading": "정확성 우선", "text": "검색 결과의 최신성을 가장 중요하게 꼽음" }, { "heading": "교육 부담", "text": "새 도구 학습 시간은 1시간 이내여야" } ],
  "implication": "도입 기준 1순위는 **문서 최신성 관리**", "source": "인터뷰 2026.10, 3명" }
```
필수: `title`, `image`(`src`·`alt`), `quote`, `interviewee` / 선택: `kicker`, `step`, `insights`(0~2개, 각 `heading` 필수·`text` 선택), `implication`, `source`, `image.credit`·`focus`
- `quote`·`implication`의 `**굵게**`는 강조색. 인용 부호(“ ”)는 CSS/마크업이 붙이므로 데이터에 넣지 않는다.
- `background` 사용 금지.

### 3.24 `contrast` — 대비되는 두 상태
좌우 대비 장. 왼쪽(중립 바탕 상자)에 물러나는 상태, 오른쪽(히어로 계열 강조 면 상자)에 강조할 상태. 양쪽 모두 작은 라벨 → 세리프 대형 헤드라인(2줄) → 보조 내용 순서. 왼쪽 헤드라인은 차분한 muted 톤, 오른쪽은 진한 글자(강조 단어는 히어로 색). 예: 바뀌는 것 vs 남는 것, 과거 vs 미래, 비용 vs 가치.
```json
{ "id": "what-remains", "type": "contrast", "step": 1, "kicker": "핵심 질문", "title": "도구는 바뀌어도 남는 것은?",
  "left":  { "label": "바뀌는 것", "headline": "도구는\n바뀌어도", "lines": ["3년마다 교체되는 소프트웨어", "예: 지난 5년간 2회 교체"] },
  "right": { "label": "남는 것", "headline": "**데이터**는\n남는다",
             "stats": [ { "value": "12만+", "label": "누적 문서 수" }, { "value": "8년", "label": "기록 기간" } ] },
  "source": "출처: …" }
```
필수: `title`, `left`·`right`(각 `headline` 필수) / 선택: `kicker`, `step`, `source`, 각 쪽 `label`, `lines`(최대 3개), `stats`(최대 3개, 각 `value`·`label`), `image`
- 오른쪽 `headline`의 `**굵게**`는 히어로 강조색, 왼쪽은 muted 강조. `\n` 줄바꿈 허용.
- `background` 사용 금지. `source`는 상자 아래 표준 각주 위치.
- `image`: 객체 `{ "src", "alt", "focus", "fit" }` 1개 또는 최대 2개 배열(`assets/images/` 로컬, `alt` 필수). 상자 하단 약 1/2 영역에 놓이며 양쪽 사진은 같은 크기·비율로 맞춘다(designer). 한쪽에만 넣지 말고 양쪽 모두 넣거나 모두 뺀다. 배열이면 같은 미디어 영역 안에 위·아래로 같은 높이로 쌓는다(로고 등). `fit`: `"cover"`(기본, 사진) | `"contain"`(로고 — 잘리지 않게 전체 표시, 흰 띠 위 가운데).

## 4. 분량 제한 (16:9 넘침 방지)

| 항목 | 제한 |
|---|---|
| `title` | 40자 이내 |
| `subtitle` | 60자 이내 |
| `bullets` 항목 수 | 최대 6개 (하위 `sub`는 항목당 최대 3개) |
| bullet 1개 길이 | 60자 이내 |
| `two-column` 각 컬럼 bullets | 최대 5개 |
| `stats.items` | 2~4개, `value`는 8자 이내 |
| `quote` | 120자 이내 |
| `references.items` | 슬라이드당 최대 6개 |
| `kicker` | 20자 이내 |
| `source` | 80자 이내 (`roc`·`data-panels`는 160자) |
| `big-number` | `value` 10자 / `label` 40자 / `context` 60자 |
| `process.steps` | 3~5개 / `label` 12자 / `text` 40자 |
| `process.steps[].gate` | 20자 |
| `chart.data` | 2~8개 (`hbar`는 2~5개 권장) / `label` 10자 / `caption` 60자 / `baseline.label` 16자 |
| `comparison` | 열 2~5개(열 제목 20자) / 행 2~6개(행 라벨 10자). 셀: 열 2~3개면 32자, 4~5개면 20자 |
| `matrix` | 사분면 `label` 16자 / `text` 50자 / `items` 최대 4개·각 16자 / 축 라벨 12자 / `caption` 60자 |
| `meta.steps` | 최대 6개, 각 8자 |
| `cards` | 카드 2~4개 / `label` 16자 / `title` 24자 / `text` 60자 / `bullets` 최대 3개·각 30자 / `value` 8자 / 이미지 있는 카드는 `text` 40자·`bullets` 2개 |
| `band` | `items` 2~4개 / `heading` 16자 / `text` 50자 / `bullets` 최대 3개·각 50자 / `body` 100자 / `title` 1줄 권장(32자) |
| `background` 사용 시 | 해당 타입 분량 제한 그대로, 단 `bullets`는 최대 4개 |
| `split` | `bullets` 최대 4개·각 50자 / `body` 120자 (`imageRatio: "2/3"`이면 bullets 2개·body 80자) |
| `equation` | `label` 12자 / `text` 40자 / `caption` 60자 |
| `pillars` | `label` 16자 / `value` 8자 / `title` 20자 / `text` 50자 |
| `roc` | `title` 50자 / `kicker` 60자 / `axes` 각 40자 / `curves[].name` 20자·`desc` 30자 / `note.items[].lines` 각 20자 / `takeaways` 각 60자 |
| `data-panels` | `stats` 0~3개(`value` 8자·`label` 16자) / `message` 40자 / `chartTitle` 24자 / `fields.label` 8자·`text` 80자 / `link.value` 6자·`label` 10자·`note` 30자 |
| `contrast` | `label` 10자 / `headline` 16자(`\n` 포함 2줄) / `lines` 최대 3개·각 30자 / `stats` 최대 3개: `value` 8자, `label` 16자 |
| `interview` | `title` 40자 / `quote` 90자 / `interviewee` 30자 / `insights` 최대 2개: `heading` 16자, `text` 50자 / `implication` 60자 |
| `iceberg` | `subtitle` 60자(2줄) / `above` 2~4개: `heading` 12자, `text` 26자, `example` 30자 / `below` 3~5개: `heading` 20자(영문 대문자 권장), `text` 24자 / `flow` 2~5개·각 16자 / `message` 40자 |
| `tree` | `root` 12자 / `levels[].question` 20자 / `levels[].signal` 30자 / 갈래 `label` 10자 / `leaf` 14자 / `caption` 60자 |
| `references` 항목 `title` | 70자 이내 (넘으면 원문 제목을 줄이고 끝에 `…`) |
| `references` 항목 `url` | 길이 제한 없음 (화면에서는 한 줄로 말줄임 처리) |

제한을 넘기면 슬라이드를 분할한다. 글자 수는 공백 포함, `**` 마크업 제외로 센다. 검증: `node scripts/validate-slides.mjs`.

## 5. 텍스트 규칙

- 일반 텍스트만 사용한다. HTML 태그 금지 (developer는 `textContent`로 삽입).
- 강조는 `**굵게**` 마크업만 허용 (developer가 `<strong>`으로 변환).
- 줄바꿈이 꼭 필요하면 `\n` 사용.
- 이미지 경로는 프로젝트 루트 기준 상대 경로 (`assets/...`).

## 6. CSS 클래스 계약 (developer ↔ designer)

developer는 아래 구조로 마크업을 생성하고, designer는 이 클래스들을 스타일링한다. **slide id(`#…`)는 선택자로 쓰지 않는다.**

| 클래스 | 용도 |
|---|---|
| `.deck` | 전체 뷰포트 컨테이너 (레터박스 영역) |
| `.slide` | 1920×1080 캔버스. `data-type`, `data-theme` 속성 부여 |
| `.slide.is-active` | 현재 표시 중인 슬라이드 |
| `.slide--{type}` | 레이아웃 타입별 변형 (`.slide--cover`, `.slide--bullets` …) |
| `.slide__title` / `.slide__subtitle` | 제목 / 부제 |
| `.slide__body` | 본문 영역 |
| `.slide__bullets`, `.slide__bullets li`, `.slide__subbullets` | 글머리표 |
| `.slide__columns`, `.slide__column`, `.slide__column-heading` | 2단 레이아웃 |
| `.slide__figure`, `.slide__image`, `.slide__caption` | 이미지 |
| `.slide__stats`, `.stat`, `.stat__value`, `.stat__label` | 수치 |
| `.slide__quote`, `.slide__quote-source` | 인용 |
| `.slide__number` | 섹션 번호 |
| `.slide__meta` | 발표자/연락처 등 보조 정보 |
| `.slide__references`, `.reference`, `.reference__meta`, `.reference__title`, `.reference__url` | 참고 자료 목록 (`ol` > `li.reference`). `.reference__url`은 `<a target="_blank" rel="noopener">` |
| `.slide__category` | 참고 자료 유형 표시 (기사 / 공식 자료 / 보고서·PDF / 논문 / 기타). 슬라이드에 `data-category` 속성도 부여 |
| `.slide__kicker` | 제목 위 머리글 (`kicker`) |
| `.slide__source` | 하단 출처 각주 (`source`). 안전 영역 하단 안쪽에 위치 |
| `.slide__credit` | 이미지 저작자·라이선스 표기 (`image`·`split`·`cover`) |
| `.cover__media`, `.cover__image`, `.cover__overlay` | cover 대표 이미지 영역·이미지·가독성 막. 슬라이드에 `data-has-image`, `data-image-style="full|split"`, `data-overlay="dark|light|none"` 속성. 이미지에 `data-focus` 속성. DOM 순서는 `.cover__media`(이미지·막·credit) → 텍스트(title·subtitle·meta) |
| `.cover__logo`, `.cover__logos`(`data-count`) | cover 로고 |
| `.slide__bignumber`, `.bignumber__value`, `.bignumber__label`, `.bignumber__context` | big-number |
| `.slide__process`(`ol`), `.step`, `.step__index`, `.step__label`, `.step__text` | process. `.step__index`는 01, 02… 번호 |
| `.step__gate` | process 관문(마름모 + 조건 텍스트). 해당 `li.step` 다음 형제 `li.step__gate`로 둔다 |
| `.slide--process[data-layout="stairs"]`, `li.step[data-level]` | 계단형 process |
| `.slide__chart`(`figure`, `data-kind="bar|line|hbar"`), `.chart`(`svg`), `.chart__axis`, `.chart__bar`, `.chart__bar--highlight`, `.chart__line`, `.chart__point`, `.chart__point--highlight`, `.chart__value`, `.chart__label`(`data-highlight="true|false"`), `.chart__unit`, `.slide__caption` | chart. SVG 요소에 색·폰트를 인라인으로 지정하지 않고 클래스만 부여한다(색은 designer가 `fill`/`stroke`로 지정) |
| `.chart__baseline`(`line`), `.chart__baseline-tag`(`g`) > `.chart__baseline-tag-bg`(`rect`) + `.chart__baseline-label`(`text`) | chart 기준선. 라벨은 `g` 안에 배경 `rect`(텍스트 크기에 맞춤) → `text` 순서. 막대·값 라벨보다 위에 그린다 |
| `.slide__table`(`table`), `.table__corner`, `.table__colhead`, `.table__rowhead`, `.table__cell`, `.is-highlight` | comparison. 강조 열의 `th`·`td`에 `.is-highlight` |
| `.table__cell[data-mark="good|bad|warn"]`, `tr.is-highlight-row` | comparison 셀 표시·행 강조 |
| `.split__text`, `.split__media` | split 좌우 영역. 슬라이드에 `data-image-side="left|right"`, 이미지가 있으면 `data-has-image` 속성 |
| `.slide--split[data-image-ratio="1/3|1/2|2/3"]` | split 이미지 비율 |
| `.stepbar`(`ol`), `.stepbar__item`, `.stepbar__item.is-current`, `.stepbar__item.is-done`, `.stepbar__index`, `.stepbar__label` | 단계 진행 표시줄 (`step` 지정 시 캔버스 내부 상단). 슬라이드에 `data-step` 속성 |
| `.slide__matrix`, `.matrix__axis`, `.matrix__axis--x`, `.matrix__axis--y`, `.matrix__axis-label`, `.matrix__axis-low`, `.matrix__axis-high`, `.matrix__grid`, `.quadrant`, `.quadrant__label`, `.quadrant__text`, `.quadrant__items`, `.slide__caption` | matrix. `.quadrant`에 `data-position`, `data-tone` 속성 |
| `.slide__column[data-tone="accent|danger"]` | two-column 컬럼 톤 |
| `.slide[data-has-bg]`, `.slide__bg`, `.slide__bg-image`, `.slide__bg-overlay` | background. `.slide__bg`는 `.slide`의 첫 자식(진행 표시줄보다 앞), 안에 `img.slide__bg-image`(`data-focus`)·`.slide__bg-overlay`·`.slide__credit`. 슬라이드에 `data-overlay="dark|light"` |
| `.slide__cards`(`ul`), `.card`, `.card__media`, `.card__image`, `.card__label`, `.card__title`, `.card__value`, `.card__text`, `.card__bullets`, `.slide__credit` | cards. `.slide__cards`에 `data-count`, `data-has-image`. `.card`에 `data-tone`. 카드 사진 credit은 `.card__media` 안 `.slide__credit` |
| `.band__media`, `.band__image`, `.band__content`, `.band__items`(`ul`), `.band__item`, `.band__heading`, `.band__value`, `.band__text` | band. `.band__media`(이미지·credit) → `.band__content`(kicker·title·subtitle·items/bullets/body) 순서. `.band__items`에 `data-count` |
| `.slide__tree`, `.tree__heads`, `.tree__head`(`data-level="root|0|1|leaf"`, 빈 칸은 `data-empty`), `.tree__question`, `.tree__signal`, `.tree__root`, `.tree__node`(`data-depth="1|2"`), `.tree__node-label`, `.tree__leaf`(`data-tone`), `.tree__lines`(`svg`), `.tree__line`, `marker.tree__arrow` > `path.tree__arrow-head` | tree. `.tree__heads`는 열 머리글 줄. 본체는 4열 그리드: `.tree__root` → depth 1 노드 2개 → depth 2 노드 4개 → `.tree__leaf` 4개(모두 `.slide__tree`의 직계 자식, 행 배치는 CSS가 data 속성으로). 각 노드·leaf에 `data-branch="0|1"`, depth 2·leaf에 `data-child="0|1"`. 연결선은 `.tree__lines` SVG 안 `path.tree__line`(인라인 색 금지, 노드 위치를 측정해 그림), 선에 `data-from="0|1|2"`, 마지막 단계는 `data-kind="arrow"` |
| `.slide__equation`(`data-count`), `.equation__term`, `.equation__op`, `.equation__equals`, `.equation__result`, `.equation__label`, `.equation__text` | equation. 순서: term → op → term (→ op → term) → equals → result. `.equation__result`가 주인공 |
| `.slide__pillars`, `.pillars__columns`(`data-count`), `.pillar`(`data-tone`), `.pillars__base`(`data-tone`), `.pillar__label`, `.pillar__value`, `.pillar__title`, `.pillar__text` | pillars. `.pillars__columns` 안에 `.pillar` 2~3개, 그 아래 `.pillars__base`(전체 폭). base 내부도 `.pillar__*` 클래스를 재사용 |
| `.slide__roc`, `.roc__chart`(`figure`), `svg.roc`, `.roc__area`, `.roc__grid`, `.roc__frame`, `.roc__chance`, `.roc__chance-label`, `.roc__curve[data-style="lead|alt|dim"]`, `.roc__tick`, `.roc__axis`, `.roc__lead`, `.roc__marker[data-style="filled|hollow"]`, `.roc__note-heading`, `.roc__note`, `.roc__note-label`, `.roc__aside`, `.roc__models`(`ul`), `.roc__model[data-style]`, `.roc__swatch`(`svg`) > `.roc__swatch-line`, `.roc__name`, `.roc__desc`, `.roc__auc`, `.roc__ci`, `.roc__takeaways`, `.roc__takeaway` | roc. 2열: 왼쪽 `.roc__chart`, 오른쪽 `.roc__aside`(models → takeaways). 인라인 색 금지 |
| `.slide__data-panels`(`data-has-link`), `.dpanel`(`data-tone="primary|secondary"`), `.dpanel__head`, `.dpanel__heading`, `.dpanel__meta`, `.dpanel__stats`(`data-count`), `.dpanel__stat`, `.dpanel__stat-value`, `.dpanel__stat-label`, `.dpanel__message`, `.dpanel__chart-title`, `.dpanel__figure`, `.dpanel__image`, `.dpanel__fields`, `.dpanel__fields-label`, `.dpanel__link`, `.dpanel__link-badge`, `.dpanel__link-value`, `.dpanel__link-label`, `.dpanel__link-note` | data-panels. 순서: 패널1 → (link) → 패널2. 패널 내부: head(heading·meta) → stats → message → chart-title → figure(img.dpanel__image) → fields |
| `.slide__iceberg`(`data-above-count`, `data-below-count`), `svg.iceberg__art`, `.iceberg__sea`, `.iceberg__waterline`, `.iceberg__facet`(`data-part="above|below"`, `data-shade="1~5"`), `.iceberg__link`(`line`), `.iceberg__dot`(`circle`, `data-size="s|m"`), `.iceberg__above`(`ul`), `.iceberg__item`(`data-pos`, `data-slot`, `data-tone`), `.iceberg__heading`, `.iceberg__text`, `.iceberg__example`, `.iceberg__below`(`ul`), `.iceberg__node`(`data-pos`), `.iceberg__node-heading`, `.iceberg__node-text`, `.iceberg__footer`, `.iceberg__flow`(`p`) > `.iceberg__flow-step` + `.iceberg__flow-arrow`, `.iceberg__message` | iceberg. DOM: stepbar → kicker → title → subtitle → `.slide__iceberg`(svg → above → below) → `.iceberg__footer`(flow → message) → source. `svg.iceberg__art`는 viewBox `0 0 1920 1080`, 캔버스 전체(0,0)에 깔리는 장식층(`aria-hidden`). 그라데이션은 `<defs>` 안 `stop.iceberg__stop`에 `data-stop` 속성만 두고 색은 CSS `stop-color`로. 라벨·노드는 3.22 좌표에 맞춰 designer가 absolute 배치 |
| `.interview__media`, `.interview__image`(`data-focus`), `.slide__credit`, `.interview__body`, `.interview__quote`(`blockquote`), `.interview__interviewee`, `.interview__insights`(`ul`, `data-count`), `.interview__insight`, `.interview__insight-heading`, `.interview__insight-text`, `.interview__implication` | interview. DOM: `.interview__media`(img·credit) → stepbar → `.interview__body`(kicker → title → quote → interviewee → insights → implication → source). 인라인 색 금지 |
| `.slide__contrast`, `.contrast__side`(`data-side="left|right"`, 사진이 있으면 `data-has-image`), `.contrast__label`, `.contrast__headline`, `.contrast__lines`(`ul`), `.contrast__line`, `.contrast__stats`(`ul`, `data-count`), `.contrast__stat`, `.contrast__stat-value`, `.contrast__stat-label`, `.contrast__media`(`data-count`) > `img.contrast__image`(`data-focus`, `data-fit="cover|contain"`) | contrast. DOM: stepbar → kicker → title → `.slide__contrast`(left side → right side; 각 side: label → headline → lines → stats → media) → source. 인라인 색 금지 |
| `.progress`, `.page-number` | 진행 표시줄 / 페이지 번호 |
| `.progress__bar` | 진행 표시줄 내부 채움 막대 (JS가 `width`를 % 로 설정) |
| `.nav`, `.nav__button`, `.nav__button--prev`, `.nav__button--next` | 하단 화살표 내비게이션 (`<button>`, 캔버스 밖 `.deck` 위에 고정). 첫/마지막 슬라이드에서 `disabled` 속성 부여 |

> 내비게이션·진행 표시 요소는 `.slide` 캔버스 밖(뷰포트 기준)에 위치하며, 인쇄 시 숨긴다.

### 필수 CSS 변수 (designer가 `:root`에 정의)
- 캔버스: `--slide-width: 1920px`, `--slide-height: 1080px`, `--safe-area: 80px`
- 색 원천: `--hero`(덱마다 brief.md의 HEX로 교체), 중립 램프 `--neutral-*`
- 색 파생(시맨틱): `--color-bg`, `--color-text`, `--color-accent`, `--color-primary`, `--color-muted` — 모두 `--hero`/중립 램프에서 파생
- 타이포: `--font-heading`, `--font-body`, `--fs-title`, `--fs-subtitle`, `--fs-body`

## 7. 검증 체크리스트

- [ ] `node scripts/validate-slides.mjs` 통과 (아래 항목을 자동 검사)
- [ ] 유효한 JSON이며 `version`(major 2), `meta.title`, `meta.aspectRatio: "16:9"`, `slides`가 존재
- [ ] 모든 슬라이드에 고유한 `id`와 정의된 `type`이 있음
- [ ] 타입별 필수 필드 누락 없음
- [ ] 4절 분량 제한 준수
- [ ] HTML 태그 미포함
- [ ] `bash scripts/check-topic-leftovers.sh` — theme.css에 `#<id>` 선택자 없음
