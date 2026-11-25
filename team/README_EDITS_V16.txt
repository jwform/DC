2030 MYEONGDONG — V16 수정 내역 (V15_bridge 기반)
코드 안의 수정 위치는 [V16] 주석으로 표시되어 있습니다.

1. 교차로 제품 소개 페이지
 - product-crossroad.html: 위쪽 프레임 바("2030 MYEONGDONG / CROSSROAD · 새 창으로 열기"), 아래쪽 "새 교차로 제품 소개 페이지 / 다시 지도로 돌아가기" 영역과 구분선, 가운데 iframe을 모두 없앴습니다.
   이 주소는 이제 crossroad-site/PRODUCT01/index.html을 전체 화면으로 바로 엽니다(지도·게임의 기존 링크는 그대로).
 - crossroad-site/PRODUCT01/index.html: 왼쪽 위 텍스트 로고 대신 공식 로고(assets/images/logo-official.webp)를 넣었습니다.
   화면 고정, 왼쪽·위 28px, 가로 166px, 마우스를 올리면 보라 글로우와 밝기 변화가 생깁니다.
   클릭하면 ../../index.html?return=crossroad#explore 로 갑니다. 기존 복귀 기능을 그대로 써서 인트로 없이 지도로 가고, 교차로가 선택된 상태로 카메라가 맞춰집니다.
   3D 모델, 애니메이션, 문구, 스크롤 인터랙션은 바꾸지 않았습니다. 예전 텍스트 로고 자리는 보이지 않게만 남겨 상단 배치가 움직이지 않게 했습니다.

2. 공식 로고 파일: 보내 주신 이미지에서 검은 배경과 여백만 투명하게 걷어낸 것입니다(비율 1052:257 유지, 색 보정 없음).
   assets/logo-official.webp(게임용), assets/logo-official.png(PNG 예비), crossroad-site/PRODUCT01/assets/images/logo-official.webp

3. 게임: 지하철 출구 계단 아래에서 시작 (assets/game/city/game.js)
 - [V11] 거리 바로 시작을 바꿔, 기존 계단 모델(W.stair) 맨 아래 바닥에서 1인칭으로 시작합니다.
 - 계단을 오르는 것은 사용자의 W 키/조이스틱입니다. 키를 누르지 않으면 움직이지 않습니다.
   이동 속도, 충돌(계단 양쪽 벽·끝벽), 높이(W.height 계단 경사)는 기존 explore 이동 로직을 그대로 씁니다.
 - 예전에 스크롤로 오르던 계단 연출을 이제 사용자의 실제 위치로 움직입니다(G.climb 0→1).
   단마다 카메라가 살짝 오르내리는 움직임, 노출 0.55→1.05로 거리가 밝아지는 효과, 계단 보라 조명 세기 변화, 지상 직전의 은은한 플래시가 여기에 해당합니다.
 - 꼭대기를 지나면 G.phase가 'street'가 되어 그대로 자유 탐험이 이어집니다. 화면 전환이나 순간 이동은 없습니다.
 - 미리 불러오기(iframe 사전 로딩)는 그대로입니다. 들어갈 때마다 계단 아래로 초기화되므로, 미리 올라가 있는 일이 없습니다.

4·5. 게임 왼쪽 위 공식 로고 (game.html)
 - BACK TO PLAY 버튼을 공식 로고로 바꿨습니다(교차로 페이지와 같은 크기·여백·호버). 계단, 거리, 제품 패널을 열었을 때 모두 항상 보입니다.
 - 마우스가 화면에 고정되어 있으면 로고 아래에 "ESC 커서 활성화 · 로고를 눌러 나가기"가 나옵니다. ESC로 커서를 풀면 바로 클릭할 수 있습니다.
 - 로고를 클릭해도 게임 이동이나 시점 조작으로 인식되지 않습니다(이벤트 전달 차단).
 - 나갈 때: 마우스 고정 해제, 키 입력 초기화, 이동·애니메이션·렌더 루프 정지.
   iframe으로 실행했을 때는 postMessage exit로 메인 페이지의 게임 레이어만 닫습니다(새로고침 없음).
 - 돌아오는 곳(index.html): 사용자가 실제로 누른 버튼(PLAY / ENTER THE CITY / PLAY THE GAME)과 그 버튼이 화면에서 있던 높이를 저장해 두었다가, 정확히 그 화면으로 돌아갑니다.
   game.html을 직접 열었을 때는 index.html?return=play 로 이동하고, sessionStorage에 저장된 같은 정보로 위치를 되돌립니다(인트로·로딩 생략).
 - 다시 PLAY를 누르면 계단 아래부터 새로 시작합니다.

수정한 파일: index.html, game.html, assets/game/city/game.js, product-crossroad.html, crossroad-site/PRODUCT01/index.html (+ 로고 이미지 3개)
