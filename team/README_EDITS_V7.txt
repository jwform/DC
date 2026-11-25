2030 MYEONGDONG — V7 수정 내역 (웹사이트 수정 요구 사항.pdf 1~8p 반영)
실행: index.html (로컬 서버 권장, 예: python -m http.server)
코드 내 수정 위치는 모두 [EDIT #번호] 주석으로 표시되어 있습니다.

#1  2030 → 0 진입 모션 (index.html · drawTunnel / initMetro)
    반복 원형 링 터널 삭제 → 네온 라이트 코리도.
    블루·퍼플 워프 스트릭(카메라 속도에 따라 길이/밝기 변화), 벽면 회로형 라이트 트레이스 + 이동하는 데이터 펄스,
    원근 레일, 블루-화이트 코어 + 얇은 수평 플레어. 0의 구멍 안으로만 보이도록 클리핑(글자 마스크 유지),
    기존 스크롤 카메라·줌 블러·디졸브 타이밍 그대로.

#2  지하철 문 열림 전환 (trainCam / plateFit / drawSign)
    그려진 '문 닫힘' 장면의 최종 카메라를 platform.jpg(문 열림 플레이트)의 cover-fit 좌표에 정확히 일치시킴
    (문 중심 x=850, 네온 라인 y=441, 335.9px/월드단위). 표지판·헤더·문 기둥 위치 동일 → 확대 튐 제거.
    플레이트 크로스페이드를 문이 열리는 구간(.622–.662)에 맞춤. 시퀀스 순서는 동일.

#3  3D 크롬 오브젝트 색 (fluid 셰이더 / updateWorld)
    초록 단계 및 라임 반사 제거. 스크롤 연속 색 변화: 무채색 → 은은한 연보라 → 연보라 → 퍼플 → 깊은 보라.
    완전한 보라 도달 시 짧은 바이올렛 림 라이트 + 표면을 한 번 지나가는 빛 스윕(uGlow/uSweep). 형태·회전·마우스 반응 유지.

#4  THREE PRODUCTS 카드 (product-carousel-script 전면 교체)
    삭제: 카드 클릭 시 개인 사이트 이동, 클릭/드래그 넘김, 슬롯 회전. (개인 사이트 이동은 3D 지도 카드에서 유지)
    추가: 마우스가 가까운 카드로 포커스 이동(선명 + 약간 앞으로 + 퍼플 엣지 글로우), 나머지는 블러·디밍,
    벗어나면 중앙 카드로 부드럽게 복귀. 모바일은 탭하면 포커스 후 중앙 복귀.
    썸네일 교체: assets/products/bridge-card.webp, assets/products/emergency-path-card.webp (제공 원본 사용)

#5  게임 섹션 위치: EXPLORER → ABOUT → GAME → ENDING(마지막 유지). 레일 내비에 PLAY 추가, 섹션 측정 재연결.
#6  CITY EXPLORER 좌측(PDF 빨간 원)에 ENTER THE CITY 버튼 → game.html. 장소 선택(줌) 중에는 자동 숨김.
#7  엔딩 버튼 3종: BACK TO START(처음 2030 화면) · BACK TO MAP(지도, 인트로 재생 없음) · PLAY THE GAME(강조).
    START/MAP은 짧은 퍼플 컷 전환 후 즉시 이동. 모바일은 세로 스택(PLAY 우선).
#8  파비콘: 제공 로고의 M 심볼로 favicon.ico(16/32/48), favicon-32/192/512.png, apple-touch-icon 재생성.
    index.html / game.html / product-crossroad.html의 <head>에 연결(기존엔 body 안에 있어 인식 불안정).
#9  2030 배경 Vortex: Aceternity Vortex를 바닐라 Canvas 2D로 포팅(simplex noise 플로우 필드, TTL 페이드, 글로우).
    React/Tailwind 미사용. 퍼플 입자, 포인터 주변 소용돌이, 0으로 진입 시 바깥으로 흐름, mix-blend-mode:lighten으로
    글자 가독성 유지, 저해상도 렌더 + 배치 드로잉으로 성능 최적화.

개인 제품 상세 페이지(bridge/, smart-basket/, crossroad-site/)는 수정하지 않았습니다.
