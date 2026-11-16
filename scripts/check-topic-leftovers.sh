#!/usr/bin/env bash
# 주제 잔재 검사: 이전 덱(특정 브랜드 전략 발표)의 단어와 theme.css의 slide id 선택자가 남았는지 확인한다.
# 사용: bash scripts/check-topic-leftovers.sh      종료 코드 0 = 0건, 1 = 발견
set -u
cd "$(dirname "$0")/.." || exit 2

PATTERN='올리브영|olive|뷰티|Amazon|세포라|sephora|얼타|ulta'
found=0

echo "▶ 1/2 주제 단어 검색: /${PATTERN}/ (대소문자 무시)"
# 이 스크립트 자신(패턴 정의)과 .git, node_modules는 제외한다.
hits=$(grep -rniE "$PATTERN" . \
  --exclude-dir=.git --exclude-dir=node_modules \
  --exclude=check-topic-leftovers.sh 2>/dev/null)
if [ -n "$hits" ]; then
  echo "$hits"
  found=$((found + $(printf '%s\n' "$hits" | wc -l)))
else
  echo "  0건"
fi

echo "▶ 2/2 src/theme.css의 #<id> 선택자 검색"
# 주석을 지우고, 선언 블록 { … } 안(색 HEX 등)을 비운 뒤 남은 선택자/at-rule 머리말에서 #ident를 찾는다.
if command -v perl >/dev/null 2>&1; then
  id_hits=$(perl -0777 -ne '
    s{/\*.*?\*/}{}gs;              # 주석 제거
    s/"[^"]*"|\x27[^\x27]*\x27//g;  # 문자열(url, content) 제거
    s/\{[^{}]*\}/{}/g;             # 가장 안쪽 블록 = 선언 블록 비우기
    my $n = 0;
    for my $line (split /\n/) {
      $n++;
      while ($line =~ /(#[A-Za-z_-][\w-]*)/g) { print "  theme.css(주석·선언 제거 후 $n행): $1\n"; }
    }' src/theme.css)
else
  echo "  (perl 없음 — 대략 검사로 대체)"
  id_hits=$(grep -nE '^[^:;]*#[A-Za-z_-][A-Za-z0-9_-]*[^;]*\{' src/theme.css)
fi
if [ -n "$id_hits" ]; then
  echo "$id_hits"
  found=$((found + $(printf '%s\n' "$id_hits" | wc -l)))
else
  echo "  0건"
fi

echo
if [ "$found" -eq 0 ]; then
  echo "✔ 주제 잔재 0건"
  exit 0
fi
echo "✖ 주제 잔재 ${found}건"
exit 1
