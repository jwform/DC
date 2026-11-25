2030 MYEONGDONG — V15 수정 내역 (V14 기반)

1. BRIDGE 개인 사이트 교체 (bridge/ 폴더 = BRIDGE_FINAL_REFINED_V4_1)
 - 지도 경로: 지도 → 포장마차 거리 → 제품 자세히 보기 → bridge/index.html?from=map
 - 게임 경로: 게임 → BRIDGE 제품 → VIEW PRODUCT → bridge/index.html?from=game
 - 돌아가기: 개인 사이트의 홈 버튼과 엔드 카드의 링크가 기존 절대주소(github.io)에서 상대경로로 바뀌었습니다.
     from=map  → ../index.html?return=street#explore (지도의 포장마차 거리로 복귀, 인트로 생략)
     from=game → ../game.html (게임으로 복귀)
     그냥 직접 열면 지도 쪽으로 돌아갑니다.
 - 수정 파일: index.html(지도 링크), assets/game/city/game.js(게임 링크), bridge/index.html · js/main.js · js/config.js(복귀 링크)

2. 모바일 게임 조작 (game.html, assets/game/city/game.js)
 - 이전에는 키보드(WASD)+마우스 전용이라 폰에서는 둘러보기만 되고 이동이 안 됐습니다.
 - 추가: 왼쪽 아날로그 조이스틱(이동) · 화면 드래그(시점) · 제품이 가운데에 오면 탭(제품 정보)
 - 터치 기기에서만 보이고, 제품 패널이 열리면 조이스틱은 숨겨집니다. PC 조작은 그대로입니다.
 - 폰 렌더 해상도 상한 1.5 → 1.25 (터치 기기만)

3. 성능
 - 매 프레임 일어나던 강제 레이아웃(scrollHeight 읽기)을 초당 2회로 줄였습니다.
 - 히어로 지하철 터널 캔버스: 해상도 상한 1.75 → 1.25(폰/작은 화면은 1.0), 모션블러 패스 4 → 2(폰)
 - V14 흐름 효과 스크립트: 읽기/쓰기를 분리해 레이아웃 재계산을 줄였고, 확인용 배지는 제거했습니다.
