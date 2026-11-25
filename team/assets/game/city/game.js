/* =====================================================================
   2030 MYEONGDONG — EXPERIENCE CONTROLLER
   states: off → stairs (scroll drives the climb) → ground ("CLICK TO EXPLORE")
           → explore (WASD + mouse, collisions, discovery) ⇄ inspect (product viewer)
   ===================================================================== */
(function(){
'use strict';
const {MB,M4,hex}=CE;const W=window.CW,P=window.CP;

/* ---- [V11] product data — taken from each product's own website (bridge/, smart-basket/, crossroad-site/PRODUCT01/) ---- */
const PRODUCTS=[
  {key:'p1',no:'01',name:'BRIDGE',sub:'Smart Communication Gate',place:'포장마차 거리 · 떡볶이 명가 카운터',
   img:'bridge/assets/img/render-2.webp',href:'bridge/index.html?from=game',
   problem:'상인과 관광객이 같은 언어를 쓰지 않아, 수량·맵기·옵션을 묻는 주문이 소통 오류로 끊어집니다.',
   solve:'카운터 위 게이트형 기기가 카메라·마이크로 두 사람의 말과 행동을 읽고, MCU AI가 두 언어를 중재해 양면 디스플레이와 스피커로 전합니다. 상단 조명(흰색·보라·라임)이 상태를 알려 주고, 마지막 결정은 사람이 합니다.'},
  {key:'p2',no:'02',name:'스마트 바구니 디스플레이',sub:'Smart Basket Display',place:'쇼핑몰 거리 · 올리브영 매장 안',
   img:'smart-basket/images/IMG-01_hero.webp',href:'smart-basket/index.html',
   problem:'말이 통하지 않는 외국인 방문객은 넓은 매장에서 원하는 코너를 찾거나 직원에게 도움을 청하기 어렵습니다.',
   solve:'바구니 입구 테두리에 거는 가로형 디스플레이입니다. 다이얼로 코너를 고르면 화면이 아이콘과 화살표로 경로와 바구니 금액을 보여 주고, 라임색 호출 버튼을 누르면 가까운 직원에게 위치가 전달됩니다.'},
  {key:'p3',no:'03',name:'EMERGENCY PATH SYSTEM',sub:'Future Emergency Path',place:'명동 교차로 · 남서쪽 코너',
   img:'assets/products/emergency-path-card.webp',href:'product-crossroad.html',
   problem:'밀집된 인파와 좁은 골목, 복잡한 교차로에서는 긴급 차량이 진입해야 하는 순간 사람들로 인해 통행이 지연됩니다.',
   solve:'평소에는 바닥과 일체화되어 보행을 방해하지 않다가, AI와 센서가 긴급 차량 접근을 감지하면 양쪽 패널이 기둥으로 서고 투명판과 보라색 LED가 통행 경계를 만듭니다. 차량이 지나가면 원래 상태로 돌아갑니다.'}
];

W.products.sort((a,b)=>a.key<b.key?-1:1);
const G=window.CITY={SPEED:3.12,STRIDE:.86,state:'off',ready:false,found:new Set(),cam:{pos:[0,-2.3,-8.6],yaw:Math.PI,pitch:.3,fov:1.18},vel:[0,0],keys:{},look:{x:0,y:0}};
try{JSON.parse(localStorage.getItem('md2030_found')||'[]').forEach(k=>G.found.add(k))}catch(e){}
const $=s=>document.querySelector(s);
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),lerp=(a,b,t)=>a+(b-a)*t,sm=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};

/* ---------------- dynamic prop meshes ---------------- */
const pm=new MB();const PR={};const part=(n,fn)=>{const i0=pm.i.length;fn();PR[n]={first:i0,count:pm.i.length-i0}};
const w1=[1,1,1];
/* ---------------- [V11] real product models (low-poly, built from the product GLBs' proportions) ----------------
   Units: metres. Local origin = bottom centre, local +z = product front.
   01 BRIDGE            ← bridge/assets/model/bridge.glb (frame · top bar with double-sided display · camera · top/bottom LED)
   02 SMART BASKET      ← smart-basket/models/3D-01_product.glb (280×90 mm body · display · dial + violet ring · lime call button · hook)
   03 EMERGENCY PATH    ← crossroad-site/PRODUCT01/assets/models/emergency-path-device.glb (OPEN state: base · two vertical
                          pillars · transparent acrylic bar · purple LED strip · end warning modules)                     */
function hexa(P,col,mat){const c=[0,0,0];P.forEach(p=>{c[0]+=p[0]/8;c[1]+=p[1]/8;c[2]+=p[2]/8});
  [[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]].forEach(f=>{const q=f.map(i=>P[i]);
    const e1=[q[1][0]-q[0][0],q[1][1]-q[0][1],q[1][2]-q[0][2]],e2=[q[3][0]-q[0][0],q[3][1]-q[0][1],q[3][2]-q[0][2]];
    let n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];
    const fc=[0,1,2].map(k=>(q[0][k]+q[1][k]+q[2][k]+q[3][k])/4);if(n[0]*(fc[0]-c[0])+n[1]*(fc[1]-c[1])+n[2]*(fc[2]-c[2])<0)n=n.map(v=>-v);
    pm.quad(q[0],q[1],q[2],q[3],col,mat,undefined,n)})}
const MET=[10,0,0,0],PLN=[0,0,0,0],EM=k=>[9,k,0,0];
const C_FRAME=[.085,.088,.1],C_PANEL=[.12,.125,.14],C_GLASS=[.02,.02,.026],C_PUR=[.62,.32,1],C_LIME=[.77,1,.21],C_WHITE=[.92,.9,1];
part('mBridge',()=>{
  // slanted legs (wider foot, as in the render), 0.4 m tall in the GLB → scaled to the 500 mm spec height
  [-1,1].forEach(s=>{const b=(x,y,z)=>[s*x,y,z];
    hexa([b(.296,0,-.05),b(.346,0,-.05),b(.346,0,.05),b(.296,0,.05),b(.284,.5,-.016),b(.306,.5,-.016),b(.306,.5,.016),b(.284,.5,.016)],C_FRAME,MET)});
  pm.box(-.296,.4,-.024,.296,.5,.024,C_FRAME,MET);                       // top frame
  pm.box(-.278,.408,.0235,.278,.492,.0262,C_GLASS,EM(.18));              // display, customer side
  pm.box(-.278,.408,-.0262,.278,.492,-.0235,C_GLASS,EM(.18));            // display, vendor side
  [[-.2,.12],[.08,.17]].forEach(([x0,x1])=>{pm.box(x0,.44,.0263,x1,.452,.0268,C_WHITE,EM(.9));pm.box(x0,.44,-.0268,x1,.452,-.0263,C_WHITE,EM(.9))}); // translated text lines
  pm.box(-.055,.405,-.034,.055,.495,.034,C_PANEL,MET);                   // centre module
  [1,-1].forEach(s=>{pm.box(-.022,.415,s>0?.034:-.042,.022,.445,s>0?.042:-.034,[.22,.23,.27],MET);   // physical button
    pm.cyl([-.042,.475,s*.034],[-.042,.475,s*.042],.006,.006,10,[.01,.01,.015],MET);pm.cyl([-.042,.475,s*.042],[-.042,.475,s*.043],.003,.003,8,C_PUR,EM(2))}); // camera
  pm.box(-.29,.5,-.011,.29,.507,.011,C_PUR,EM(5));                       // top status light
  pm.box(-.28,.394,-.01,.28,.4,.01,C_PUR,EM(3.2));                        // lower light line
});
part('mBasket',()=>{
  // shopping basket (tapered, slatted walls) — carries the display on its front rim
  const B=[[-.19,0,-.13],[.19,0,-.13],[.19,0,.13],[-.19,0,.13]],T=[[-.215,.22,-.155],[.215,.22,-.155],[.215,.22,.155],[-.215,.22,.155]];
  const BC=[.2,.19,.24];
  pm.quad(B[0],B[1],B[2],B[3],BC,PLN,undefined,[0,1,0]);
  for(let i=0;i<4;i++){const a=B[i],b=B[(i+1)%4],c=T[(i+1)%4],d=T[i];
    for(let k=0;k<5;k++){const v0=k/5+.03,v1=(k+1)/5-.03,L=(p,q,t)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,p[2]+(q[2]-p[2])*t];
      pm.quad(L(a,d,v0),L(b,c,v0),L(b,c,v1),L(a,d,v1),BC,PLN)}
    [0,.33,.66,1].forEach(t=>{const L=(p,q)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,p[2]+(q[2]-p[2])*t];const p0=L(a,b),p1=L(d,c);pm.cyl(p0,p1,.006,.006,4,BC,PLN,false)})}
  [[-.215,-.155,.215,-.145],[-.215,.145,.215,.155],[-.215,-.155,-.205,.155],[.205,-.155,.215,.155]].forEach(([x0,z0,x1,z1])=>pm.box(x0,.21,z0,x1,.23,z1,[.26,.25,.3],PLN));
  // a few cosmetics inside
  [[-.12,-.05,.05,.12,'#ff8fb1'],[-.02,.03,.04,.16,'#ffffff'],[.08,-.04,.05,.1,'#b6a4ff'],[.13,.06,.035,.14,'#7fd6c2']].forEach(([x,z,r,h,c])=>pm.box(x-r,.004,z-r*.7,x+r,h,z+r*.7,hex(c),PLN));
});
part('mBasketDisp',()=>{
  // SMART BASKET DISPLAY 280 × 90 × 61 mm — body, screen, dial with violet ring, lime call button, hook plate + camera
  pm.box(-.14,-.014,-.045,.14,.014,.045,[.11,.11,.14],MET);
  pm.box(-.09,.0141,-.03,.074,.0146,.03,C_GLASS,EM(.2));                     // display
  pm.box(-.083,.0147,-.012,-.064,.0149,.012,C_WHITE,EM(1.4));               // cart icon
  pm.box(-.058,.0147,-.008,-.004,.0149,.01,C_WHITE,EM(1.6));               // price 48,000
  pm.box(.011,.0147,-.012,.035,.0149,.012,C_LIME,EM(1.4));                 // corner icon
  pm.box(.045,.0147,-.004,.068,.0149,.004,C_WHITE,EM(1.6));                // arrow
  pm.cyl([.107,.014,0],[.107,.03,0],.02,.019,18,[.16,.16,.2],MET);         // dial
  pm.cyl([.107,.0305,0],[.107,.032,0],.0172,.0172,18,C_PUR,EM(4));         // dial ring glow
  pm.cyl([.107,.0321,0],[.107,.0325,0],.012,.012,14,[.12,.12,.15],MET);
  pm.cyl([-.115,.014,0],[-.115,.019,0],.011,.011,14,C_LIME,EM(2.2));       // call button
  pm.box(-.05,-.034,-.045,.05,-.011,-.005,[.06,.06,.08],MET);               // centre hook plate (100 mm)
  pm.box(-.01,-.033,-.029,.01,-.027,-.021,[.02,.02,.03],MET);               // recognition camera
});
part('mDevice',()=>{
  // EMERGENCY PATH device, OPEN state (2.79 m long, 0.36 m deep)
  hexa([[-1.394,0,-.181],[1.394,0,-.181],[1.394,0,.181],[-1.394,0,.181],[-1.37,.065,-.165],[1.37,.065,-.165],[1.37,.065,.165],[-1.37,.065,.165]],[.05,.05,.06],MET); // base + housings
  [-1,1].forEach(s=>{const b=(x,y,z)=>[s*x,y,z];
    hexa([b(.9,.065,-.15),b(1.36,.065,-.15),b(1.36,.065,.15),b(.9,.065,.15),b(.95,.17,-.105),b(1.31,.17,-.105),b(1.31,.17,.105),b(.95,.17,.105)],[.055,.055,.065],MET); // warning module
    hexa([b(.932,.122,-.13),b(1.328,.122,-.13),b(1.328,.122,.13),b(.932,.122,.13),b(.94,.136,-.126),b(1.32,.136,-.126),b(1.32,.136,.126),b(.94,.136,.126)],C_WHITE,EM(3)); // LED ring
    pm.box(s>0?.752:-.83,.065,-.105,s>0?.83:-.752,.86,.105,[.045,.045,.055],MET);   // vertical pillar (side panel raised 90°)
    pm.box(s>0?.745:-.837,.06,-.112,s>0?.837:-.745,.075,.112,[.07,.07,.08],MET);    // hinge foot
    pm.box(s>0?.752:-.758,.7,-.03,s>0?.758:-.752,.79,.03,C_PUR,EM(1.6))});          // acrylic slot glow
  pm.box(-.79,.065,-.013,.79,.077,.013,C_PUR,EM(6));                                 // LED strip
  pm.box(-.86,.018,.1815,.86,.04,.1825,C_PUR,EM(3.5));pm.box(-.86,.018,-.1825,.86,.04,-.1815,C_PUR,EM(3.5)); // side glow
  pm.box(-.752,.7,-.022,.752,.704,.022,C_PUR,EM(3));pm.box(-.752,.786,-.022,.752,.79,.022,C_PUR,EM(3));      // acrylic edges
});
part('mAcrylic',()=>pm.box(-.752,.704,-.021,.752,.786,.021,[1,1,1],EM(1)));          // drawn additively → transparent
part('ring',()=>{for(let s=0;s<48;s++){const a0=s/48*Math.PI*2,a1=(s+1)/48*Math.PI*2;pm.quad([Math.cos(a0)*.96,0,Math.sin(a0)*.96],[Math.cos(a1)*.96,0,Math.sin(a1)*.96],[Math.cos(a1),0,Math.sin(a1)],[Math.cos(a0),0,Math.sin(a0)],w1,[9,2,0,0],undefined,[0,1,0])}});
part('dot',()=>pm.sphere([0,0,0],[.045,.045,.045],6,w1,[9,4,0,0]));
part('sigHead',()=>pm.box(-.16,-.45,-.12,.16,.45,.12,[.12,.12,.15],[10,0,0,0]));
part('lamp',()=>pm.sphere([0,0,0],[.075,.075,.04],8,w1,[9,5,0,0]));
part('treeT',()=>pm.cyl([0,0,0],[0,1.6,0],.07,.05,8,[.32,.26,.24],[0,0,0,0]));
part('treeF',()=>{[[0,1.95,0,.5],[.28,1.75,.15,.36],[-.25,1.8,-.12,.4],[0,2.3,.05,.34]].forEach(([x,y,z,r])=>pm.sphere([x,y,z],[r,r*.85,r],9,w1,[0,0,0,0],(p,n)=>[p[0]*(1+.08*Math.sin(n[1]*9)),p[1],p[2]*(1+.08*Math.cos(n[0]*7))]))});
part('lantern',()=>{const N=7;for(let i=0;i<=N;i++){const t=i/N,z=t,y=-.55*4*t*(1-t);pm.sphere([0,y,z],[.06,.09,.06/9.6],5,[1,.85,.6],[9,5,0,0])}});
part('wire',()=>{const N=16;for(let i=0;i<N;i++){const t0=i/N,t1=(i+1)/N;pm.cyl([0,-.55*4*t0*(1-t0),t0],[0,-.55*4*t1*(1-t1),t1],.006,.006,3,[.15,.15,.18],[0,0,0,0],false)}});
/* car: lofted body with curved panels (cross-sections along the length), separate glass / tyres / lights.
   Procedural — a GLB vehicle can replace it later (see README). */
const CARX=[],CARS=[];(function(){const N=26;
  const sm3=x=>x<0?0:x>1?1:x*x*(3-2*x);
  for(let i=0;i<=N;i++){const x=-2.3+4.6*i/N;CARX.push(x);
    const nose=sm3((2.3-x)/.55),tail=sm3((x+2.3)/.45);const w=.9*(.8+.2*Math.min(nose,tail));
    const yb=x>1.15?.8-.24*Math.pow((x-1.15)/1.15,2):(x<-1.55?.84-.1*Math.pow((-1.55-x)/.75,2):.82+.02*Math.sin(x));
    const g0=-1.3,g1=1.0;let yr=yb;if(x>g0&&x<g1){const t=(x-g0)/(g1-g0);yr=yb+.58*Math.min(1,sm3(t/.32)*sm3((1-t)/.38))}
    const ww=.72;const P=[[0,.24],[w*.86,.24],[w,.34],[w,yb-.08],[w*.96,yb],[ww,yb+.05],[ww*.86,yr-.04],[ww*.62,Math.max(yr,yb+.02)],[0,Math.max(yr,yb+.025)]];
    CARS.push(P)}})();
function carLoft(glassPass){const N=CARX.length-1,K=CARS[0].length;const G=[];
  for(let i=0;i<=N;i++){const row=[];for(let k=-K+1;k<K;k++){const q=CARS[i][Math.abs(k)];row.push([CARX[i],q[1],k<0?-q[0]:q[0]])}G.push(row)}
  const M=G[0].length,nr=(i,k)=>{const a=G[Math.min(N,i+1)][k],b=G[Math.max(0,i-1)][k],c=G[i][Math.min(M-1,k+1)],d=G[i][Math.max(0,k-1)];
    const u=[a[0]-b[0],a[1]-b[1],a[2]-b[2]],v=[c[0]-d[0],c[1]-d[1],c[2]-d[2]];let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(...n)||1;return n.map(x=>-x/l)};
  for(let i=0;i<N;i++)for(let k=0;k<M-1;k++){const ka=Math.abs(k-(K-1)),kb=Math.abs(k+1-(K-1));const seg=Math.max(ka,kb);
    const x=(CARX[i]+CARX[i+1])/2;const side=Math.min(ka,kb)>=4&&Math.max(ka,kb)<=6,roof=Math.min(ka,kb)>=6;
    const glass=(side&&x>-1.2&&x<.95)||(roof&&((x>.45&&x<.98)||(x>-1.3&&x<-.85)));
    if(glass!==glassPass)continue;const mt=glass?[10,0,0,0]:[10,0,0,0],cl=glass?[.05,.06,.09]:w1;
    const ids=[[i,k],[i+1,k],[i+1,k+1],[i,k+1]].map(([a,b])=>pm.vert(G[a][b],nr(a,b),cl,mt,[0,0]));pm.tri(ids[0],ids[2],ids[1]);pm.tri(ids[0],ids[3],ids[2])}
  if(!glassPass)[0,N].forEach(i=>{const cy=(CARS[i][3][1]+.24)/2;const c=pm.vert([CARX[i],cy,0],[i?1:-1,0,0],w1,[10,0,0,0],[0,0]);
    for(let k=0;k<M-1;k++){const a=pm.vert(G[i][k],[i?1:-1,0,0],w1,[10,0,0,0],[0,0]),b=pm.vert(G[i][k+1],[i?1:-1,0,0],w1,[10,0,0,0],[0,0]);i?pm.tri(c,a,b):pm.tri(c,b,a)}})}
part('carBody',()=>{carLoft(false);pm.box(-1.9,.18,-.8,1.9,.26,.8,[.08,.08,.1],[10,0,0,0]);[-.94,.94].forEach(z=>pm.box(.7,.86,z-.05*Math.sign(z),.85,.95,z+.08*Math.sign(z),w1,[10,0,0,0]))});
part('carFix',()=>{carLoft(true);
  [[-1.42,-.84],[1.42,-.84],[-1.42,.84],[1.42,.84]].forEach(([x,z])=>{const s=Math.sign(z);pm.cyl([x,.34,z-.12*s],[x,.34,z+.1*s],.34,.34,16,[.07,.07,.08],[0,0,0,0]);
    pm.cyl([x,.34,z+.1*s],[x,.34,z+.112*s],.22,.22,16,[.72,.74,.8],[10,0,0,0]);pm.cyl([x,.34,z+.112*s],[x,.34,z+.116*s],.1,.1,10,[.6,.4,1],[9,2.5,0,0])});
  pm.box(2.22,.6,-.72,2.29,.66,-.38,[1,.97,.92],[9,6,0,0]);pm.box(2.22,.6,.38,2.29,.66,.72,[1,.97,.92],[9,6,0,0]);pm.box(2.24,.69,-.6,2.3,.705,.6,[.75,.9,1],[9,3,0,0]);
  pm.box(-2.3,.76,-.8,-2.25,.8,.8,[1,.12,.25],[9,4.5,0,0]);pm.box(-2.0,.2,-.82,2.0,.23,.82,[.6,.3,1],[9,3,0,0])});
part('puff',()=>pm.quad([-.5,-.5,0],[.5,-.5,0],[.5,.5,0],[-.5,.5,0],w1,[13,1,0,0],[[0,0],[1,0],[1,1],[0,1]],[0,0,1]));
part('beacon',()=>{pm.cyl([0,.18,0],[0,0,0],.11,0,4,w1,[9,4,0,0]);pm.cyl([0,.18,0],[0,.24,0],.11,.0,4,w1,[9,4,0,0])});
part('flow',()=>pm.sphere([0,0,0],[.05,.05,.05],6,[.77,1,.2],[9,6,0,0]));

/* ---------------- boot ---------------- */
G.init=function(canvas){
  try{
    const r=new CE.Renderer(canvas);G.r=r;
    r.atlas(W.atlas);G.world=r.upload(W.mb);G.decal=r.upload(W.dm);G.glass=r.upload(W.gb);if(P.init)P.init(r);G.props=r.upload(pm);
    r.lights=W.lights.slice();G.ready=true;
  }catch(e){console.warn('[CITY] WebGL2 init failed',e);G.fail=String(e);const f=$('#ctyFail');if(f)f.style.display='flex'}
  bindUI();
};

/* ---------------- input ---------------- */
function bindUI(){
  addEventListener('keydown',e=>{const k=e.key.toLowerCase();G.keys[k]=true;
    if(G.state==='explore'&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
    if(k==='e'){if(G.state==='explore'&&G.target!=null)openPanel(G.target);else if(G.state==='panel')closePanel()}
    if(k==='escape'&&G.state==='panel')closePanel();
    if((G.state==='explore'||G.state==='return')&&['1','2','3','0'].includes(k))NAV.select(k==='0'?null:+k-1)});
  addEventListener('keyup',e=>{G.keys[e.key.toLowerCase()]=false});
  addEventListener('blur',()=>{G.keys={}});
  const cv=G.r?G.r.cv:$('#ctyCv');
  $('#ctyClick').addEventListener('click',()=>enterExplore());
  document.addEventListener('pointerlockchange',()=>{G.locked=document.pointerLockElement===cv;
    const h=$('#ctyLockHint');if(h)h.classList.toggle('show',!G.locked&&G.state==='explore'&&!G.paused)});
  document.addEventListener('pointerlockerror',()=>{G.noLock=true;const h=$('#ctyLockHint');if(h&&G.state==='explore')h.classList.add('show')});
  // mouse look: pointer-lock (movementX/Y); look sensitivity is kept separate from the walking speed
  G.lookSens=.0021;
  addEventListener('mousemove',e=>{if(G.state==='explore'&&G.locked&&!G.paused){G.cam.yaw-=e.movementX*G.lookSens;G.cam.pitch=clamp(G.cam.pitch-e.movementY*G.lookSens,-1.2,1.25)}});
  // click: open the product in front of you, otherwise (re)capture the mouse. Drag-look stays as a fallback when pointer lock is refused.
  let drag=null,tl=null;   // [V15] tl = one-finger look/tap on touch screens
  cv.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||G.state!=='explore'||G.paused||tl)return;tl={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now()};try{cv.setPointerCapture(e.pointerId)}catch(_){}});
  cv.addEventListener('pointermove',e=>{if(!tl||e.pointerId!==tl.id)return;const dx=e.clientX-tl.x,dy=e.clientY-tl.y;tl.x=e.clientX;tl.y=e.clientY;if(G.state!=='explore'||G.paused)return;G.cam.yaw-=dx*.0058;G.cam.pitch=clamp(G.cam.pitch-dy*.0058,-1.2,1.25)});
  const tEnd=e=>{if(!tl||e.pointerId!==tl.id)return;const tap=Math.hypot(e.clientX-tl.sx,e.clientY-tl.sy)<14&&performance.now()-tl.t<450;tl=null;if(tap&&e.type==='pointerup'&&G.state==='explore'&&G.target!=null)openPanel(G.target)};
  cv.addEventListener('pointerup',tEnd);cv.addEventListener('pointercancel',tEnd);
  cv.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;if(G.state!=='explore'||G.paused||e.button!==0)return;
    if(G.target!=null){openPanel(G.target);return}
    if(!G.locked){requestLock();drag={x:e.clientX,y:e.clientY};try{cv.setPointerCapture(e.pointerId)}catch(_){}}});
  cv.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!drag||G.locked)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};
    G.cam.yaw-=dx*.004;G.cam.pitch=clamp(G.cam.pitch-dy*.004,-1.2,1.25)});
  cv.addEventListener('pointerup',()=>{drag=null});
  addEventListener('wheel',e=>{if(G.state==='explore'||G.state==='panel')e.preventDefault()},{passive:false});
  $('#ctyBack').addEventListener('click',()=>closePanel());
  const pc=$('#ctyPanelClose');if(pc)pc.addEventListener('click',()=>closePanel());
  const sub=$('#ctySubway');if(sub)sub.addEventListener('click',()=>leave());
  document.querySelectorAll('#ctyNav [data-dest]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const i=+b.dataset.dest;NAV.select(NAV.dest===i?null:i)}));
  updCount();
  bindTouch();
}
/* [V15] phone / tablet controls: left analog stick = walk · drag anywhere else = look · tap while a product is in the crosshair = info */
function bindTouch(){
  const touch=matchMedia('(pointer: coarse)').matches||(navigator.maxTouchPoints>0&&!matchMedia('(hover: hover)').matches);
  if(!touch)return;G.touch=true;const root=document.documentElement;root.classList.add('touch-dev');
  const j=document.createElement('div');j.id='ctyJoy';j.innerHTML='<i></i><b></b><span>이동</span>';document.body.appendChild(j);
  const base=j.querySelector('i'),knob=j.querySelector('b');let pid=null,cx=0,cy=0;const R=48;
  const set=(x,y)=>{let dx=x-cx,dy=y-cy;const d=Math.hypot(dx,dy);if(d>R){dx*=R/d;dy*=R/d}knob.style.transform='translate('+dx+'px,'+dy+'px)';G.joy=[dx/R,-dy/R]};
  const end=()=>{pid=null;knob.style.transform='';G.joy=[0,0]};
  j.addEventListener('pointerdown',e=>{if(pid!=null)return;e.preventDefault();e.stopPropagation();pid=e.pointerId;const r=base.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;try{j.setPointerCapture(pid)}catch(_){}set(e.clientX,e.clientY)});
  j.addEventListener('pointermove',e=>{if(e.pointerId===pid){e.preventDefault();set(e.clientX,e.clientY)}});
  j.addEventListener('pointerup',e=>{if(e.pointerId===pid)end()});j.addEventListener('pointercancel',e=>{if(e.pointerId===pid)end()});
  const pr=$('#ctyPrompt');if(pr)pr.innerHTML='<kbd class="wide">TAP</kbd><span>제품 정보 보기</span>';
  const ck=$('#ctyClick span');if(ck)ck.textContent='왼쪽 스틱 이동 · 화면 드래그로 둘러보기 · 제품 앞에서 탭';
  const lh=$('#ctyLockHint');if(lh)lh.remove();
  const tip=document.createElement('div');tip.id='ctyTouchTip';tip.textContent='왼쪽 스틱으로 이동 · 화면을 드래그해 둘러보기 · 제품이 가운데 오면 탭';document.body.appendChild(tip);setTimeout(()=>tip.classList.add('hide'),6500);
}
function enterExplore(){if(!G.ready)return;
  if(G.state==='ground'||G.state==='stairs'){G.state='explore';document.documentElement.classList.add('city-lock');G.hudT=performance.now()}
  $('#ctyClick').classList.remove('show');
  try{const p=G.r.cv.requestPointerLock();if(p&&p.catch)p.catch(()=>{G.noLock=true})}catch(e){G.noLock=true}
}
function leave(){try{document.exitPointerLock()}catch(e){}G.state='off';G.inStairs=false;document.documentElement.classList.remove('city-lock');
  $('#ctyPanel').classList.remove('show');G.r.dim=0;scrollTo({top:0,behavior:'smooth'})}
G.requestLock=()=>requestLock();
function requestLock(){if(!G.r)return;try{const p=G.r.cv.requestPointerLock();if(p&&p.catch)p.catch(()=>{G.noLock=true;const h=$('#ctyLockHint');if(h)h.classList.add('show')})}catch(e){G.noLock=true}}
/* [V16] start at the BOTTOM of the subway exit stairs (the existing stair model W.stair, its walls/colliders, height
   profile W.height and its purple stair lights). The player walks up with WASD / joystick — nothing moves on its own.
   The old scroll-driven climb (states 'stairs' → 'ground') is not used any more; its camera step-bob, exposure ramp,
   stair-light ramp, top-of-stairs flash and the "THE FUTURE IS ALREADY HERE" title are now driven by the player's own
   position on the stairs (G.climb 0 → 1) inside the normal 'explore' movement, so collisions, height and view all keep working.
   (The [V11] direct start that spawned the player on the street is replaced by this.) */
G.STAIR={zB:-8.7,zT:1.4};          // same bottom / top marks the old scroll climb used
G.spawn={pos:null,yaw:Math.PI,pitch:.2};
G.climb=0;G.phase='stairs';
G.startDirect=function(o={}){if(!G.ready)return false;const c=G.cam;
  if(!G.spawn.pos){const z=G.STAIR.zB;G.spawn.pos=[0,W.height(0,z)+1.62,z]}
  if(o.reset||G.state==='off'||G.state==='stairs'||G.state==='ground'){c.pos=G.spawn.pos.slice();c.yaw=G.spawn.yaw;c.pitch=G.spawn.pitch;G.gy=null;G.walk=0;
    G.climb=0;G.phase='stairs';G.titleDone=false;G.startT=performance.now();if(G.r){G.r.exposure=.55}}
  G.vel=[0,0];G.keys={};G.state='explore';G.paused=false;G.hudT=performance.now();
  document.documentElement.classList.add('city-lock');
  ['#ctyClick','#ctyPanel'].forEach(q=>{const el=$(q);if(el)el.classList.remove('show')});const fu=$('#ctyFuture');if(fu)fu.style.opacity='0';
  const r=G.r;r.fade=o.fade===false?1:Math.min(r.fade||0,.15);G.fadeIn=true;if(G.phase!=='stairs')r.exposure=1.05;r.flash=0;r.dim=0;
  if(o.lock!==false)requestLock();
  const h=$('#ctyLockHint');if(h)h.classList.toggle('show',!document.pointerLockElement);
  return true};
/* pause: stops movement, look and (via game.html) the render loop — used when the game is hidden / exited */
G.pause=function(){G.paused=true;G.keys={};G.vel=[0,0];try{if(document.pointerLockElement)document.exitPointerLock()}catch(e){}
  if(G.state==='panel'){$('#ctyPanel').classList.remove('show');G.state='explore'}
  const h=$('#ctyLockHint');if(h)h.classList.remove('show')};

/* ---------------- [V11] product info panel ----------------
   click (or E) near a product → small glass panel: image · name · place · problem · how it solves it · VIEW PRODUCT.
   While it is open, walking and mouse-look are paused; closing it resumes from the same spot and view. */
G.spin={x:0,y:0};
function openPanel(i){if(G.state!=='explore')return;const d=PRODUCTS[i];G.state='panel';G.insp=i;G.keys={};G.vel=[0,0];G.joy=[0,0];document.documentElement.classList.add('cty-panel-open');
  G.saved={pos:G.cam.pos.slice(),yaw:G.cam.yaw,pitch:G.cam.pitch};
  try{document.exitPointerLock()}catch(e){}
  const im=$('#ctyImg');if(im){im.src=d.img;im.alt=d.name+' 제품 렌더링'}
  $('#ctyNo').textContent='PRODUCT '+d.no+' · '+d.sub.toUpperCase();$('#ctyZone').textContent=d.place;$('#ctyName').textContent=d.name;
  const pb=$('#ctyProblem');if(pb)pb.textContent=d.problem;const sv=$('#ctySolve');if(sv)sv.textContent=d.solve;
  const lk=$('#ctyView');if(lk){lk.href=d.href;lk.setAttribute('aria-label',d.name+' 제품 자세히 보기')}
  $('#ctyPanel').classList.add('show');$('#ctyPrompt').classList.remove('show');const h=$('#ctyLockHint');if(h)h.classList.remove('show');
  if(!G.found.has(d.key)){G.found.add(d.key);try{localStorage.setItem('md2030_found',JSON.stringify([...G.found]))}catch(e){}updCount(true)}
  setTimeout(()=>{const c=$('#ctyPanelClose');if(c)try{c.focus({preventScroll:true})}catch(_){}},60)}
function closePanel(){if(G.state!=='panel')return;document.documentElement.classList.remove('cty-panel-open');$('#ctyPanel').classList.remove('show');G.state='explore';G.keys={};G.vel=[0,0];
  const S=G.saved;if(S){G.cam.pos=S.pos.slice();G.cam.yaw=S.yaw;G.cam.pitch=S.pitch}
  requestLock()}   // the close click is a user gesture → mouse control comes back immediately
function updCount(bump){const n=G.found.size;const el=$('#ctyCount');if(!el)return;el.textContent=String(n).padStart(2,'0');
  if(bump){el.parentElement.classList.remove('bump');void el.offsetWidth;el.parentElement.classList.add('bump')}
  if(bump&&n===3){const c=$('#ctyDone');c.classList.add('show');setTimeout(()=>c.classList.remove('show'),5200)}}

/* ---------------- collision ---------------- */
function collide(x,z,r){for(let it=0;it<3;it++)for(const b of W.colliders){if(x+r<b.x0||x-r>b.x1||z+r<b.z0||z-r>b.z1)continue;
    const cx=clamp(x,b.x0,b.x1),cz=clamp(z,b.z0,b.z1);let dx=x-cx,dz=z-cz,d=Math.hypot(dx,dz);
    if(d<1e-6){const pen=[x-b.x0+r,b.x1-x+r,z-b.z0+r,b.z1-z+r],k=pen.indexOf(Math.min(...pen));if(k===0)x=b.x0-r;else if(k===1)x=b.x1+r;else if(k===2)z=b.z0-r;else z=b.z1+r;continue}
    if(d<r){x=cx+dx/d*r;z=cz+dz/d*r}}
  return[x,z]}

/* ---------------- per-frame ---------------- */
let lastT=0;
G.frame=function(time,p,visible){
  if(!G.ready)return;const dt=Math.min(.05,Math.max(.001,time-(lastT||time)));lastT=time;
  const r=G.r,c=G.cam;
  // adaptive resolution: keep the frame rate smooth on slower GPUs
  G.acc=(G.acc||0)+dt;G.fr=(G.fr||0)+1;if(G.acc>2.5){const f=G.fr/G.acc;G.lo=f<32?(G.lo||0)+1:0;G.hi=f>58?(G.hi||0)+1:0;if(G.lo>=2){r.scale=Math.max(.6,r.scale-.1);G.lo=0}else if(G.hi>=3){r.scale=Math.min(1,r.scale+.1);G.hi=0}G.acc=0;G.fr=0}
  // ---- state from scroll (only while not exploring) ----
  if(G.fadeIn){r.fade=Math.min(1,r.fade+dt/.3);if(r.fade>=1)G.fadeIn=false}
  if(G.state!=='explore'&&G.state!=='panel'){
    if(!visible){G.state='off';return}
    const s=sm(.04,.9,p),zB=-8.7,zT=1.4;
    const z=lerp(zB,zT,s),ground=W.height(0,z);
    const stepPh=(z-W.stair.zBot)/W.stair.run;const climbing=z>W.stair.zBot&&z<0;
    c.pos=[Math.sin(stepPh*Math.PI)*.012*(climbing?1:0),ground+1.62+(climbing?Math.abs(Math.sin(stepPh*Math.PI))*.035:0),z];
    c.yaw=Math.PI+Math.sin(time*.35)*.012;c.pitch=lerp(.36,.03,Math.pow(s,1.25))+Math.sin(time*.5)*.006;
    r.exposure=lerp(.55,1.0,sm(0,.95,s));W.lights.forEach(l=>{if(l.tag==='stairs'){l.k0=l.k0??l.k;l.k=l.k0*(.5+1.1*s)}});r.flash=.18*sm(.8,.93,s)*(1-sm(.93,1,s));r.fade=sm(0,.05,p);
    G.state=p>.965?'ground':'stairs';
    $('#ctyClick').classList.toggle('show',G.state==='ground');$('#ctyClick b').textContent='CLICK TO EXPLORE';
    $('#ctyFuture').style.opacity=String((1-sm(.08,.16,p))*sm(.0,.04,p));
    G.vel=[0,0];
  }
  // ---- free exploration ----
  if(G.state==='explore'){
    // [V11] walk 2.15 → 3.12 m/s (×1.45), run 4.3 → 6.24 m/s; diagonal input normalised; frame-rate independent (dt)
    const k=G.keys,run=G.paused?0:(k.shift?G.SPEED*2:G.SPEED);let fx=(k.w||k.arrowup?1:0)-(k.s||k.arrowdown?1:0),sx=(k.d||k.arrowright?1:0)-(k.a||k.arrowleft?1:0);
    {const J=G.joy;if(J&&(J[0]||J[1])){fx+=J[1];sx+=J[0]}}   // [V15] touch joystick (analog)
    const l0=Math.hypot(fx,sx),mag=Math.min(1,l0),l=l0||1;fx/=l;sx/=l;const yw=c.yaw,F=[-Math.sin(yw),-Math.cos(yw)],Rt=[Math.cos(yw),-Math.sin(yw)];
    const tv=[(F[0]*fx+Rt[0]*sx)*run*mag,(F[1]*fx+Rt[1]*sx)*run*mag];const a=1-Math.exp(-dt*(fx||sx?9:20));   // quick start, very short stop
    G.vel=[lerp(G.vel[0],tv[0],a),lerp(G.vel[1],tv[1],a)];if(!fx&&!sx&&Math.hypot(G.vel[0],G.vel[1])<.05)G.vel=[0,0];
    // collision in sub-steps (≤ 0.12 m) so the faster walk can never tunnel through thin walls / rails
    let nx=c.pos[0],nz=c.pos[2];{const mx=G.vel[0]*dt,mz=G.vel[1]*dt,n=Math.max(1,Math.ceil(Math.hypot(mx,mz)/.12));for(let q=0;q<n;q++){nx+=mx/n;nz+=mz/n;[nx,nz]=collide(nx,nz,.32)}}
    const spd=Math.hypot(G.vel[0],G.vel[1]);G.walk=(G.walk||0)+spd*dt;
    const gy=W.height(nx,nz)+1.62;G.gy=G.gy==null?gy:lerp(G.gy,gy,1-Math.exp(-dt*12));
    // [V16] climb progress on the subway stairs (0 = bottom landing, 1 = street level at the top)
    const St=W.stair,inWell=Math.abs(nx)<1.6&&nz>-9.85&&nz<G.STAIR.zT;
    G.climb=inWell?clamp((nz-G.STAIR.zB)/(G.STAIR.zT-G.STAIR.zB)):1;G.phase=G.climb<1?'stairs':'street';
    const onTreads=inWell&&nz>St.zBot&&nz<St.zTop,sk=Math.min(1,spd/G.SPEED);
    // head bob: on the treads one gentle lift per step (tread run 0.30 m, rise 0.18 m) like the original climb;
    // on flat ground the stride bob (cadence ≈ 2 steps/s, amplitude capped at 2.4 cm)
    const bob=onTreads?Math.abs(Math.sin((nz-St.zBot)/St.run*Math.PI))*.03*sk:Math.abs(Math.sin(G.walk/G.STRIDE*Math.PI))*.024*sk;
    c.pos=[nx+(onTreads?Math.sin((nz-St.zBot)/St.run*Math.PI)*.01*sk:0),G.gy+bob,nz];
    const hint=$('#ctyKeys');if(hint)hint.classList.toggle('mini',performance.now()-G.hudT>9000);
  }
  if(G.state==='panel')r.dim=lerp(r.dim,.32,1-Math.exp(-dt*10));
  if(G.state==='explore')r.dim=lerp(r.dim,0,1-Math.exp(-dt*10));
  // indoor exposure (Olive Young is brighter and cleaner)
  const inside=W.indoor(c.pos[0],c.pos[2])?1:0;r.indoor=lerp(r.indoor,inside,1-Math.exp(-dt*3));
  if(G.state==='explore'||G.state==='panel'){
    const s=G.climb??1;
    // [V16] the street's light opens up as you climb (same ramps the old scroll-driven climb used)
    const expo=s<1?lerp(.55,1.05,sm(0,.95,s)):lerp(1.05,.62,r.indoor);r.exposure=lerp(r.exposure,expo,1-Math.exp(-dt*6));
    W.lights.forEach(l=>{if(l.tag==='stairs'){l.k0=l.k0??l.k;l.k=l.k0*(.5+1.1*s)}});
    if(!G.fadeIn)r.fade=1;
    r.flash=s<1?.18*sm(.8,.93,s)*(1-sm(.93,1,s)):lerp(r.flash,0,.1);
    const fu=$('#ctyFuture');if(fu){if(s>.16)G.titleDone=true;
      const t=(performance.now()-(G.startT||0))/1000;
      const o=G.titleDone||G.state!=='explore'?0:Math.min(1,t/.6)*(1-sm(.08,.16,s))*(1-sm(7,8.5,t));
      if(fu._o!==o){fu._o=o;fu.style.opacity=String(o)}}
  }

  // ---- world simulation ----
  P.update(dt,time);
  const sig=P.signal(time);
  updateCars(dt,sig);

  // ---- discovery ----
  G.target=null;let near=null;
  W.products.forEach((pr,i)=>{const dx=pr.pos[0]-c.pos[0],dz=pr.pos[2]-c.pos[2],d=Math.hypot(dx,dz);pr.d=d;
    const fwd=[-Math.sin(c.yaw),-Math.cos(c.yaw)],dot=(dx*fwd[0]+dz*fwd[1])/(d||1);
    pr.glow=lerp(pr.glow||0,(G.state==='panel'&&G.insp===i)?1:sm(4.6,2.4,d),.08);
    if(G.state==='explore'&&!G.paused&&d<(pr.reach||2.9)&&dot>.72){G.target=i}if(!near||d<near.d)near=pr});
  $('#ctyPrompt').classList.toggle('show',G.target!=null&&G.state==='explore');
  {const cr=$('.cty-cross');if(cr)cr.classList.toggle('on',G.target!=null&&G.state==='explore')}

  // ---- draw list ----
  const D=[];const I=M4.ident();
  D.push({mesh:G.world,model:I,cull:false});D.push({mesh:G.decal,model:I,cull:false,poly:true});
  // dynamic lights: product glows, car lamps
  const dyn=[];W.products.forEach(pr=>{if(pr.glow>.02)dyn.push({p:[pr.pos[0],pr.pos[1]+.6,pr.pos[2]],c:[.62,.38,1],r:3.2,k:pr.glow*1.6})});
  W.cars.forEach(cr=>{const d=cr.lane?-1:1;dyn.push({p:[cr.x+d*2.6,.7,cr.lane?63.6:60.4],c:[1,.92,.8],r:6,k:.9})});
  r.lights=W.lights.concat(dyn);
  // people
  P.draws(c,null,D);
  // products — [V11] installed real-product models (static, on the ground / counter / podium). The pulse ring and the
  // beacon stay, but the beacon floats well above the product and the rim highlight is kept low so the product stays readable.
  W.products.forEach((pr,i)=>{const sel=G.state==='panel'&&G.insp===i,tgt=G.target===i;
    const hl=pr.glow*.28+(tgt?.18:0),hlc=tgt||sel?[.77,1,.21]:[.62,.38,1];
    (pr.models||[]).forEach(md=>{const model=M4.chain(M4.T(md.p[0],md.p[1],md.p[2]),M4.RY(md.ry||0),M4.RX(md.rx||0),M4.S(md.s||1,md.s||1,md.s||1));
      D.push({mesh:G.props,...PR[md.part],model,hl:md.main?hl:hl*.5,hlc,cull:false});
      if(md.part==='mDevice')D.push({mesh:G.props,...PR.mAcrylic,model,tint:[.3,.2,.5],blend:'add',noRefl:true,cull:false})});
    if(!sel){const fd=G.found.has(PRODUCTS[i].key),hb=pr.pos[1]+(pr.beaconH||1.0)+Math.sin(time*2+i)*.05,kk=(fd?.35:1)*(NAV.dest===i?1.4:1);
      D.push({mesh:G.props,...PR.beacon,model:M4.chain(M4.T(pr.pos[0],hb,pr.pos[2]),M4.RY(time*1.5)),tint:[.77*kk,1*kk,.21*kk],noRefl:true,cull:false})}
    if(pr.glow>.05){const pulse=(time*.7)%1,k=pr.glow,rs=pr.ringR||1;
      D.push({mesh:G.props,...PR.ring,model:M4.chain(M4.T(pr.pos[0],W.height(pr.pos[0],pr.pos[2])+.02,pr.pos[2]),M4.S((.5+pulse*1.6)*rs,1,(.5+pulse*1.6)*rs)),tint:[.77*(1-pulse)*k,1*(1-pulse)*k,.21*(1-pulse)*k],blend:'add',noRefl:true,cull:false})}
  });
  // product 03 — data flow linking the device to the walk signal and the crosswalk
  {const p3=W.products[2],k=Math.max(p3.glow,(G.state==='panel'&&G.insp===2)?1:0);
    if(k>.05){const path=[[p3.pos[0],.9,p3.pos[2]],[-7.6,2.6,57.6],[-6.4,.05,58.9],[6.4,.05,58.9],[6.4,.05,65.2]];
      for(let j=0;j<18;j++){const u=((time*.35+j/18)%1);const seg=u*(path.length-1),si=Math.floor(seg),t=seg-si;const a=path[si],b=path[Math.min(path.length-1,si+1)];
        D.push({mesh:G.props,...PR.flow,model:M4.T(lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)),tint:[k,k,k],blend:'add',cull:false})}}}
  // signals
  W.signals.forEach(s=>{if(s.car){const on=sig.car;D.push({mesh:G.props,...PR.sigHead,model:M4.chain(M4.T(s.x,s.y,s.z),M4.RY(Math.PI/2)),cull:false});
      [['r',.28,[1,.12,.18]],['y',0,[1,.75,.2]],['g',-.28,[.3,1,.55]]].forEach(([k,dy,cc])=>D.push({mesh:G.props,...PR.lamp,model:M4.chain(M4.T(s.x,s.y+dy,s.z+(s.z<62?-.13:.13))),tint:on===k?cc:cc.map(v=>v*.06),cull:false}))}
    else{const g=sig.ped==='g'||(sig.ped==='f'&&Math.sin(time*10)>0);D.push({mesh:G.props,...PR.sigHead,model:M4.chain(M4.T(s.x,s.y,s.z),M4.S(1,.7,1)),cull:false});
      D.push({mesh:G.props,...PR.lamp,model:M4.T(s.x,s.y+.15,s.z+s.face*.13),tint:g?[.06,.1,.08]:[1,.15,.2],cull:false});D.push({mesh:G.props,...PR.lamp,model:M4.T(s.x,s.y-.15,s.z+s.face*.13),tint:g?[.3,1,.6]:[.03,.08,.05],cull:false})}});
  // trees & lantern strings sway gently
  W.trees.forEach(t=>{const sw=Math.sin(time*.8+t.ph)*.03;D.push({mesh:G.props,...PR.treeT,model:M4.chain(M4.T(t.x,.5,t.z),M4.RZ(sw*.3)),cull:false});
    D.push({mesh:G.props,...PR.treeF,model:M4.chain(M4.T(t.x,.5,t.z),M4.RZ(sw),M4.RX(sw*.6)),tint:hex(t.c),cull:false})});
  W.lanterns.forEach(l=>{const sw=Math.sin(time*.9+l.ph)*.06;const m=M4.chain(M4.T(l.x,l.y,l.z0),M4.RZ(sw),M4.S(1,1,l.z1-l.z0));
    D.push({mesh:G.props,...PR.wire,model:m,cull:false});D.push({mesh:G.props,...PR.lantern,model:m,cull:false})});
  // cars
  W.cars.forEach(cr=>{const md=M4.chain(M4.T(cr.x,0,cr.lane?63.6:60.4),M4.RY(cr.lane?Math.PI:0));D.push({mesh:G.props,...PR.carBody,model:md,tint:cr.col,cull:false});D.push({mesh:G.props,...PR.carFix,model:md,cull:false})});
  // steam from the cooking surfaces (camera-facing additive puffs, only near the viewer)
  {const yawB=Math.atan2(c.pos[0],c.pos[2]);W.steam.forEach(st=>{const dx=st.x-c.pos[0],dz=st.z-c.pos[2];if(dx*dx+dz*dz>900)return;const fy=Math.atan2(c.pos[0]-st.x,c.pos[2]-st.z);
    for(let j=0;j<3;j++){const u=(time*.32+j/3+st.k)%1,sz=.2+u*.55,a=Math.sin(u*Math.PI)*.07;
      D.push({mesh:G.props,...PR.puff,model:M4.chain(M4.T(st.x+Math.sin(time*.7+j*2+st.k*9)*.12*u,st.y+u*1.3,st.z),M4.RY(fy),M4.S(sz,sz,sz)),tint:[a,a*.95,a*1.05],blend:'add',noRefl:true,cull:false})}})}
  // navigation route on the ground (first ~16 m)
  if(NAV.path&&G.state==='explore'){let acc=0,prev=[c.pos[0],c.pos[2]];const step=1.1,off=(time*1.4)%step;let need=off;
    for(let j=1;j<NAV.path.length&&acc<16;j++){const q=NAV.path[j],sl=Math.hypot(q[0]-prev[0],q[1]-prev[1]);
      while(need<=sl&&acc+need<16){const t=need/sl,x=lerp(prev[0],q[0],t),z=lerp(prev[1],q[1],t);if(acc+need>1.2)D.push({mesh:G.props,...PR.dot,model:M4.chain(M4.T(x,W.height(x,z)+.05,z),M4.S(1.3,.5,1.3)),tint:[.77,1,.21],blend:'add',noRefl:true,cull:false});need+=step}
      need-=sl;acc+=sl;prev=q}}
  // glass last (blended)
  D.push({mesh:G.glass,model:I,tint:[.06,.09,.08],blend:'add',cull:false});

  if(window.SKIPDRAW)D.splice(0,D.length,...D.filter(window.SKIPDRAW));
  r.render(c,time,D);
  if(G.state==='explore'||G.state==='panel'){NAV.update(time);compass();NAV.draw()}
};
/* =====================================================================
   NAVIGATION — walk grid (0.5 m) built from the floor rectangles minus the colliders
   (inflated by the player radius), A* with 8-neighbours, line-of-sight smoothing.
   ===================================================================== */
const NAV=G.nav={dest:null,path:null,dist:0,t:0,cs:.5};
(function build(){const rs=W.walk.concat([[-1.6,-9.7,1.6,.2]]);let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;rs.forEach(r=>{x0=Math.min(x0,r[0]);z0=Math.min(z0,r[1]);x1=Math.max(x1,r[2]);z1=Math.max(z1,r[3])});
  const cs=NAV.cs,nx=Math.ceil((x1-x0)/cs),nz=Math.ceil((z1-z0)/cs),g=new Uint8Array(nx*nz);
  Object.assign(NAV,{x0,z0,nx,nz,g});
  rs.forEach(r=>{for(let j=Math.max(0,Math.floor((r[1]-z0)/cs));j<Math.min(nz,Math.ceil((r[3]-z0)/cs));j++)for(let i=Math.max(0,Math.floor((r[0]-x0)/cs));i<Math.min(nx,Math.ceil((r[2]-x0)/cs));i++){
    const cx=x0+(i+.5)*cs,cz=z0+(j+.5)*cs;if(cx>=r[0]&&cx<=r[2]&&cz>=r[1]&&cz<=r[3])g[j*nx+i]=1}});
  const inf=.38;W.colliders.forEach(b=>{for(let j=Math.max(0,Math.floor((b.z0-inf-z0)/cs));j<Math.min(nz,Math.ceil((b.z1+inf-z0)/cs));j++)for(let i=Math.max(0,Math.floor((b.x0-inf-x0)/cs));i<Math.min(nx,Math.ceil((b.x1+inf-x0)/cs));i++){
    const cx=x0+(i+.5)*cs,cz=z0+(j+.5)*cs;if(cx>b.x0-inf&&cx<b.x1+inf&&cz>b.z0-inf&&cz<b.z1+inf)g[j*nx+i]=0}});
  // minimap base image (1 px per cell): streets, building footprints
  const cv=document.createElement('canvas');cv.width=nx;cv.height=nz;const x=cv.getContext('2d'),im=x.createImageData(nx,nz);
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const o=((nz-1-j)*nx+i)*4,w=g[j*nx+i];
    im.data[o]=w?58:14;im.data[o+1]=w?54:12;im.data[o+2]=w?82:24;im.data[o+3]=w?255:200}
  x.putImageData(im,0,0);NAV.img=cv})();
NAV.cell=(x,z)=>[Math.floor((x-NAV.x0)/NAV.cs),Math.floor((z-NAV.z0)/NAV.cs)];
NAV.ok=(i,j)=>i>=0&&j>=0&&i<NAV.nx&&j<NAV.nz&&NAV.g[j*NAV.nx+i]===1;
NAV.near=(i,j)=>{if(NAV.ok(i,j))return[i,j];for(let r=1;r<14;r++)for(let a=-r;a<=r;a++)for(const[di,dj]of[[a,-r],[a,r],[-r,a],[r,a]])if(NAV.ok(i+di,j+dj))return[i+di,j+dj];return null};
NAV.los=(a,b)=>{const d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(d/.2);for(let k=1;k<n;k++){const t=k/n,[i,j]=NAV.cell(lerp(a[0],b[0],t),lerp(a[1],b[1],t));if(!NAV.ok(i,j))return false}return true};
NAV.astar=function(sx,sz,tx,tz){const s=NAV.near(...NAV.cell(sx,sz)),t=NAV.near(...NAV.cell(tx,tz));if(!s||!t)return null;
  const nx=NAV.nx,N=nx*NAV.nz,gS=new Float32Array(N).fill(1e9),from=new Int32Array(N).fill(-1),closed=new Uint8Array(N);
  const H=(i,j)=>{const dx=Math.abs(i-t[0]),dz=Math.abs(j-t[1]);return(dx+dz)+(1.4142-2)*Math.min(dx,dz)};
  const heap=[];const push=(f,n)=>{heap.push([f,n]);let k=heap.length-1;while(k>0){const p=(k-1)>>1;if(heap[p][0]<=heap[k][0])break;[heap[p],heap[k]]=[heap[k],heap[p]];k=p}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let k=0;for(;;){const l=2*k+1,r=l+1;let m=k;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===k)break;[heap[m],heap[k]]=[heap[k],heap[m]];k=m}}return top};
  const si=s[1]*nx+s[0],ti=t[1]*nx+t[0];gS[si]=0;push(H(...s),si);let it=0;
  while(heap.length&&it++<200000){const[,n]=pop();if(closed[n])continue;closed[n]=1;if(n===ti)break;const i=n%nx,j=(n/nx)|0;
    for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const a=i+di,b=j+dj;if(!NAV.ok(a,b))continue;if(di&&dj&&(!NAV.ok(i+di,j)||!NAV.ok(i,j+dj)))continue;
      const m=b*nx+a,ng=gS[n]+(di&&dj?1.4142:1);if(ng<gS[m]){gS[m]=ng;from[m]=n;push(ng+H(a,b),m)}}}
  if(from[ti]<0&&si!==ti)return null;
  const raw=[];for(let n=ti;n>=0;n=from[n]){raw.push([NAV.x0+(n%nx+.5)*NAV.cs,NAV.z0+(((n/nx)|0)+.5)*NAV.cs]);if(n===si)break}raw.reverse();
  raw[0]=[sx,sz];const out=[raw[0]];let k=0;while(k<raw.length-1){let m=raw.length-1;while(m>k+1&&!NAV.los(raw[k],raw[m]))m--;out.push(raw[m]);k=m}
  return out};
NAV.select=function(i){NAV.dest=i;NAV.path=null;NAV.t=0;document.querySelectorAll('#ctyNav [data-dest]').forEach(b=>b.classList.toggle('on',+b.dataset.dest===i));
  $('#ctyNav').classList.toggle('active',i!=null);if(i==null){$('#ctyNavD').textContent='PRESS 1 · 2 · 3'}};
NAV.update=function(time){if(NAV.dest==null)return;const c=G.cam,p=W.products[NAV.dest];const tg=p.nav||p.pos;
  if(!NAV.path||time-NAV.t>.5){NAV.t=time;const r=NAV.astar(c.pos[0],c.pos[2],tg[0],tg[tg.length===2?1:2]);if(r){NAV.path=r;NAV.fail=false}else NAV.fail=true}
  if(NAV.path){NAV.path[0]=[c.pos[0],c.pos[2]];let d=0;for(let k=1;k<NAV.path.length;k++)d+=Math.hypot(NAV.path[k][0]-NAV.path[k-1][0],NAV.path[k][1]-NAV.path[k-1][1]);NAV.dist=d}
  const arrived=p.d<2.4;const nxt=NAV.path&&NAV.path[1]?NAV.path[1]:[p.pos[0],p.pos[2]];
  const b=Math.atan2(nxt[0]-c.pos[0],nxt[1]-c.pos[2]),hd=Math.atan2(-Math.sin(c.yaw),-Math.cos(c.yaw));NAV.rel=b-hd;
  $('#ctyNavD').innerHTML=NAV.fail&&!NAV.path?'NO ROUTE':arrived?'<b>ARRIVED</b> · CLICK / E':`PRODUCT ${PRODUCTS[NAV.dest].no} · <b>${Math.round(NAV.dist)} m</b>`;
  $('#ctyNavA').style.transform=`rotate(${NAV.rel}rad)`;$('#ctyNavA').style.opacity=arrived?.3:1};
NAV.draw=function(){const cv=$('#ctyMap');if(!cv)return;const dpr=Math.min(2,devicePixelRatio||1),S=cv.clientWidth||180;if(cv.width!==S*dpr){cv.width=cv.height=S*dpr}
  const x=cv.getContext('2d'),c=G.cam,ppm=3.2*dpr,h=S*dpr/2;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,cv.width,cv.height);
  x.save();x.beginPath();x.arc(h,h,h-1,0,Math.PI*2);x.clip();x.fillStyle='rgba(8,7,14,.82)';x.fillRect(0,0,cv.width,cv.height);
  const W2S=(wx,wz)=>[h+(wx-c.pos[0])*ppm,h-(wz-c.pos[2])*ppm];
  x.imageSmoothingEnabled=false;{const[a,b]=W2S(NAV.x0,NAV.z0+NAV.nz*NAV.cs);x.globalAlpha=.95;x.drawImage(NAV.img,a,b,NAV.nx*NAV.cs*ppm,NAV.nz*NAV.cs*ppm);x.globalAlpha=1}
  // route
  if(NAV.path){x.strokeStyle='#c5ff35';x.lineWidth=2.2*dpr;x.setLineDash([5*dpr,4*dpr]);x.shadowColor='#c5ff35';x.shadowBlur=6*dpr;x.beginPath();NAV.path.forEach((q,k)=>{const[a,b]=W2S(q[0],q[1]);k?x.lineTo(a,b):x.moveTo(a,b)});x.stroke();x.setLineDash([]);x.shadowBlur=0}
  // destinations (clamped to the rim when off-map)
  W.products.forEach((p,i)=>{let[a,b]=W2S(p.pos[0],p.pos[2]);const dx=a-h,dy=b-h,d=Math.hypot(dx,dy),lim=h-11*dpr;const out=d>lim;if(out){a=h+dx/d*lim;b=h+dy/d*lim}
    const f=G.found.has(PRODUCTS[i].key),sel=NAV.dest===i;x.fillStyle=f?'#c5ff35':'#9d5cff';x.strokeStyle=sel?'#fff':'rgba(0,0,0,.6)';x.lineWidth=(sel?2:1)*dpr;
    x.beginPath();x.arc(a,b,(sel?8:6.5)*dpr,0,Math.PI*2);x.fill();x.stroke();x.fillStyle=f?'#111':'#fff';x.font=`600 ${7.5*dpr}px "JetBrains Mono",monospace`;x.textAlign='center';x.textBaseline='middle';x.fillText(PRODUCTS[i].no,a,b+.5*dpr)});
  // player arrow (facing)
  const F=[-Math.sin(c.yaw),-Math.cos(c.yaw)],ang=Math.atan2(F[0],F[1]);x.translate(h,h);x.rotate(ang);
  x.fillStyle='rgba(197,255,53,.12)';x.beginPath();x.moveTo(0,0);x.arc(0,0,34*dpr,-Math.PI/2-.5,-Math.PI/2+.5);x.closePath();x.fill();
  x.fillStyle='#fff';x.shadowColor='#9d5cff';x.shadowBlur=8*dpr;x.beginPath();x.moveTo(0,-8*dpr);x.lineTo(5.5*dpr,6*dpr);x.lineTo(0,3*dpr);x.lineTo(-5.5*dpr,6*dpr);x.closePath();x.fill();x.restore();
  x.strokeStyle='rgba(245,245,246,.25)';x.lineWidth=1*dpr;x.beginPath();x.arc(h,h,h-1,0,Math.PI*2);x.stroke();
  x.fillStyle='#fff';x.font=`500 ${9*dpr}px "JetBrains Mono",monospace`;x.textAlign='center';x.fillText('N',h,10*dpr)};
function lerpA(a,b,t){let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return a+d*t}
function updateCars(dt,sig){const stopFor=sig.car!=='g';
  W.cars.forEach(cr=>{const d=cr.lane?-1:1;let target=6.5;
    const stopX=d>0?-9.6:9.6;const ahead=(stopX-cr.x)*d;if(stopFor&&ahead>0&&ahead<9)target=Math.max(0,(ahead-1)*1.1);
    W.cars.forEach(o=>{if(o===cr||o.lane!==cr.lane)return;const gap=(o.x-cr.x)*d;if(gap>0&&gap<12)target=Math.min(target,Math.max(0,(gap-6)*1.2))});
    cr.v=lerp(cr.v,target,1-Math.exp(-dt*1.8));cr.x+=cr.v*d*dt;if(cr.x>66)cr.x=-66;if(cr.x<-66)cr.x=66})}
/* compass: real bearings of the three products relative to the view direction */
function compass(){const el=$('#ctyComp');if(!el)return;const c=G.cam;const hd=Math.atan2(-Math.sin(c.yaw),-Math.cos(c.yaw));
  let html='';const span=Math.PI*.75,Wd=el.clientWidth||420;
  [['N',0],['E',Math.PI/2],['S',Math.PI],['W',-Math.PI/2]].forEach(([n,a])=>{let r=a-hd;while(r>Math.PI)r-=Math.PI*2;while(r<-Math.PI)r+=Math.PI*2;if(Math.abs(r)<span/2)html+=`<i class="cd" style="left:${(r/span+.5)*Wd}px">${n}</i>`});
  for(let a=-Math.PI;a<Math.PI;a+=Math.PI/12){let r=a-hd;while(r>Math.PI)r-=Math.PI*2;while(r<-Math.PI)r+=Math.PI*2;if(Math.abs(r)<span/2)html+=`<s style="left:${(r/span+.5)*Wd}px"></s>`}
  W.products.forEach((p,i)=>{const b=Math.atan2(p.pos[0]-c.pos[0],p.pos[2]-c.pos[2]);let r=b-hd;while(r>Math.PI)r-=Math.PI*2;while(r<-Math.PI)r+=Math.PI*2;const cl=Math.max(-.5,Math.min(.5,r/span));
    const f=G.found.has(PRODUCTS[i].key);html+=`<b class="${f?'f':''} ${Math.abs(r)>span/2?'edge':''} ${NAV.dest===i?'sel':''}" style="left:${(cl+.5)*Wd}px"><em>${PRODUCTS[i].no}</em><u>${Math.round(p.d||0)}m</u></b>`});
  el.innerHTML=html}
})();
