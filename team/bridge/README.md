# BRIDGE — Smart Communication Gate (ACT01–ACT07)

Static site, no build step, no libraries (custom WebGL2). Works on GitHub Pages and any local server.

## Run locally
    cd bridge-experience && python3 -m http.server 8000   # open http://localhost:8000
(Opening index.html directly also works; the model is embedded in assets/model/bridge.glb.js.)

## Deploy to GitHub Pages
Push the folder contents to a repo → Settings → Pages → deploy from branch (root). All paths are relative.

## Things to fill in
- `js/config.js` → `teamSite` : team site URL for the end card.
- ACT05 videos: put muted 16:9 mp4 files at the paths listed in `js/config.js` (assets/video/act05-01-approach.mp4 … act05-06-receive-food.mp4). Missing files show a VIDEO PLACEHOLDER; existing files play automatically.
- ACT05 storyboard: 6 steps, 5 images (assets/img/scenario-1..5.webp = steps 2–6). DISCOVERY is "coming soon"; add scenario-0.webp and edit the cards line in js/main.js when ready.
- Dimensions shown: 600 × 500 mm, thickness 60 mm (as provided; the GLB proportions are 68.5 : 40 : 9.9, so check against the final drawing).

## Notes
- Arched silhouette image was not used (product is a straight horizontal-frame gate).
- `?still` in the URL disables scroll smoothing (for screenshots/tests). prefers-reduced-motion is respected.

## 4차 수정 요약
- ACT03 풀스크린 히어로(BRIDGE / FACE TO FACE)와 ACT07 "THE GATE STAYS OPEN." 화면 삭제 → ACT03은 360° 뷰어로 바로 시작
- 360° 뷰어·시뮬레이터: 위에서 떨어지는 스튜디오 키라이트 + 바닥 빛 웅덩이 + 림 라이트 (`js/gl.js`의 `uBeam`)
- 로고: `assets/img/logo-2030.png`(전체), `logo-symbol.png`(심볼) — 인트로, HUD, 엔드카드(팀 사이트 링크), 파비콘에 사용
- 제목 마우스 효과: 글자 색 변경 대신 커서 주변에 라임→퍼플 그라데이션 빛 (`.lit`)
- 레퍼런스 반영: 픽셀 그리드(조용한 구간, `#pxg`), 웨이브 배경(ACT06), 렌즈 + 뎁스오브필드 스토리보드 카드
- 폰트는 Pretendard(CDN)이므로 인터넷 연결 필요

## 6차 수정 요약 (ACT 05 · 3D 시나리오)
- 인트로 소용돌이 제거 (BRIDGE 원래 인트로 유지)
- ACT 05 = 스크롤로 넘기는 6단계 3D (발견 → 마주함 → 오해 → 이해 → 전달 → 교감)
- 네온 포장마차 거리: 젖은 반사 바닥, 대형 LED 전광판, 일렬로 늘어선 포장마차
- 포장마차 테이블 위 BRIDGE, 상인(안쪽)·관광객(거리쪽)이 마주 보고 양방향 카메라로 관찰
- 4단계 중앙 버튼만 직접 클릭 (스크롤로 지나가면 자동으로 눌림), 퍼플 → 라임 상단 조명
- Three.js 로드 실패 시 기존 스토리보드 이미지로 자동 대체 · `?no3d` 로 3D 끄기
- 문제 시 브라우저 콘솔의 `[BR3]` 메시지를 알려주세요.

## FINAL REFINED (5차)
- ACT05: NPC 약 50%, 키프아웃 존, 떡볶이 간판(지붕), 6단계 카메라(전달은 측면 시점), 모바일 NPC 26
- 홈 버튼(좌상단 2030 로고) → https://jieuon.github.io/Digital-Content/game.html (js/config.js teamSite)
- ACT02 신규 인물/테이블 에셋 + 3단계 포즈 크로스페이드, ACT04 떡볶이 모델, ACT01 실버-라벤더 타이틀(마우스 반사), ACT06 스크롤 길이 약 36%
- js3d 수정 후 `python3 tools/build3d.py` 재실행 필요

## V2 (2차 수정)
- ACT01: LIGHT BEYOND THE GATE — 셰이더(`gateLeak`)로 게이트 틈 빛 번짐·바닥 반사·건축 패널, 스크롤로 틈이 열려 기존 문 진입(doorFx)과 연결 (`gate/gateA` 키프레임, js/main.js SC.a1)
- 전체 배경: 리본/천 조각 제거(rib=0, shards 숨김), 곡선 라이트 아크(`arcLight`, 마우스로 위치·곡률·반사 변화), 안개·입자·그레인 축소, 씬별 강약
- 타이포: Space Grotesk(영문 제목) · Pretendard(한글) · IBM Plex Mono(라벨), 글자 호버 = 은은한 silver/lavender sheen sweep(`--li/--lp`), 인트로·엔딩 BRIDGE 공통 `.brand-t`
- 영한 병기: `.ko-sub`
- ACT06: 한 화면(INPUT→MCU AI→RESPONSE), 5원칙, 상태조명 포함, 스크롤 150vh(이전 550vh / 원본 1700vh). 구조(FIVE INTERACTION POINTS)는 `#act6a`로 분리

## V3 — ACT02 PROBLEM 재설계
- 배경: 그레이니 비대칭 빔 + 플루티드 글라스 굴절 + 분리/파편/수렴 (js/gl.js `probBeam`, 키프레임 `SC.a2b`)
- 타이틀: 빔 헤드(`cs.pHd`)와 글자 활성화가 같은 시계로 동작 (js/main.js `probDirector`)
- 01/02/03: 연속 전환, 키네틱 크롬 숫자, 글래스/크롬 그래픽(CSS), 마우스 패럴랙스
- 수정: `.lit` 글자가 투명해지던 CSS 버그(color:transparent) 제거

## V4 — 피드백 5건 반영
1. ACT01 문 통과: 빛 터널(`tunnelFx`) — 스크롤 거리(`tz`)에 연동된 방사형 빛줄기, 중앙 코어
2. ACT01 후반: 수평선 빛+반사(`horizonFx`), 양쪽 플루티드 글라스 빛, 슬로건 글자 라벤더/보라 그라데이션 활성화
3. EYE CONTACT → ACT03: 옆으로 슬라이드(`hSlide`), 제목에 크롬/글래스 질감 + 마우스 조명 강화
4. ACT06: 리퀴드 크롬 비정형 오브제(`mcuFx`, 레이마칭) 중심, 입력→오브제→출력만 간략히, 스크롤로 순차 생성
5. BRIDGE 타이틀(인트로/엔딩): 크롬 밴드 + 플루티드 글라스 + 홍/청 프리즘 반사 레이어

## V4.1
- BRIDGE/EYE CONTACT 글자의 세로 유리 결 제거, ACT02 큰 숫자-제목 겹침 해소, 03 장면 빛 강화
- INSIGHT→ACT03 가로 슬라이드 구간 확대(1.5vh), 실제 휠 스크롤로 확인
- ACT06: 스크롤 길이 560vh, 입력/출력 순차 강조 + 오브제 형태·색·위치 변화(`mcuUpdate`)
- ACT03/04/6b 배경에 같은 빛 질감(톤 통일), 모든 큰 제목에 소프트 크롬
- 자동 품질 조절: 약 35fps 미만이 지속되면 렌더 해상도·레이마칭 단계를 낮춤(`qL`)
