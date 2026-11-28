/* STORY · 스마트 바구니 디스플레이 — 하나의 매장 장면이 스크롤로 이어지는 3D 스토리
   window.Story(canvas, hudEl, {glbVar, glbScript}) → { setBeat(i,f), resize(), setVisible(b), ready:Promise }
   beat: 0 INTRO · 1 사람으로 가득 · 2 한글 간판 · 3 직원에게 닿지 않음 · 4 CONCEPT · 5 다이얼 · 6 아이콘 · 7 호출 · 8 제품 */
(function(){
var T=window.THREE,P=window.POST;
var LIME=0xc5ff35,VIO=0x7628f5;
function rnd(a,b){return a+Math.random()*(b-a)}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function ease(k,dt){return 1-Math.exp(-k*dt)}
function angDiff(a,b){return ((a-b+Math.PI*3)%(Math.PI*2))-Math.PI}

window.Story=function(canvas,hud,opt){
opt=opt||{};
var R=new T.WebGLRenderer({canvas:canvas,antialias:false,powerPreference:'high-performance'});
R.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=.78;R.outputColorSpace=T.SRGBColorSpace;
var S=new T.Scene();S.background=new T.Color('#06040c');S.fog=new T.FogExp2('#08050f',.028);
var pm=new T.PMREMGenerator(R);S.environment=pm.fromScene(new window.RoomEnvironment(),0.04).texture;S.environmentIntensity=.18;
var cam=new T.PerspectiveCamera(50,1,.05,90);
var comp=new P.EffectComposer(R),rp=new P.RenderPass(S,cam),bl=new P.UnrealBloomPass(new T.Vector2(512,512),.5,.55,.82),op=new P.OutputPass();
comp.addPass(rp);comp.addPass(bl);comp.addPass(op);

function M(c,o){o=o||{};return new T.MeshStandardMaterial(Object.assign({color:c,roughness:.7,metalness:0},o))}
function E(c,i){return new T.MeshStandardMaterial({color:0x000000,emissive:c,emissiveIntensity:i||1.6,toneMapped:false})}

/* ---------- 조명 ---------- */
S.add(new T.HemisphereLight(0x8e7cff,0x1b0f33,.55));
var key=new T.DirectionalLight(0xcdbfff,.35);key.position.set(-6,14,8);S.add(key);
function plight(c,i,d,x,y,z){var l=new T.PointLight(c,i,d,1.7);l.position.set(x,y,z);S.add(l);return l}
plight(0x9d5cff,30,22,-8,5,-4);plight(0x9d5cff,30,22,8,5,-4);plight(0xe7e0ff,16,18,0,5.5,4);plight(0x7628f5,22,20,0,4,-8);
var lightT=plight(LIME,4,5,0,2.6,0),lightS=plight(0x8fe05a,3,4,0,2.6,0);

/* ---------- 바닥/벽 ---------- */
function floorTex(){var c=document.createElement('canvas');c.width=c.height=1024;var g=c.getContext('2d');g.fillStyle='#150d27';g.fillRect(0,0,1024,1024);
 for(var i=0;i<2200;i++){g.fillStyle='rgba(255,255,255,'+(Math.random()*.035)+')';g.fillRect(Math.random()*1024,Math.random()*1024,2,2)}
 g.strokeStyle='rgba(157,92,255,.34)';g.lineWidth=3;g.strokeRect(1,1,1022,1022);
 var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(9,7);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t}
var floor=new T.Mesh(new T.PlaneGeometry(36,28),M('#ffffff',{map:floorTex(),roughness:.3,metalness:.45,envMapIntensity:.5}));floor.rotation.x=-Math.PI/2;S.add(floor);
var wallM=M('#120a22',{roughness:.9});
[[0,3.5,-10,36,7,.5],[-16,3.5,0,.5,7,28],[16,3.5,0,.5,7,28]].forEach(function(w){var m=new T.Mesh(new T.BoxGeometry(w[3],w[4],w[5]),wallM);m.position.set(w[0],w[1],w[2]);S.add(m)});
/* 천장 조명 띠 */
var ceilG=new T.Group();S.add(ceilG);for(var i=-3;i<=3;i++){var st=new T.Mesh(new T.BoxGeometry(.18,.05,26),E(0xcdbfff,.7));st.position.set(i*4.2,6.2,0);ceilG.add(st)}
var ceil=new T.Mesh(new T.PlaneGeometry(36,28),M('#07040f',{roughness:1}));ceil.rotation.x=Math.PI/2;ceil.position.y=6.4;ceilG.add(ceil);

/* ---------- 진열대 ---------- */
var PAL=[0xe9e3ff,0xb79cff,0x9d5cff,0xffffff,0xc5ff35,0xd9c6ff,0xff9ad5];
function shelf(x,z,w,ry){var g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry||0;
 var body=new T.Mesh(new T.BoxGeometry(w,3.6,.8),M('#1c1233',{roughness:.6,metalness:.3}));body.position.y=1.8;g.add(body);
 var rows=5;for(var r=0;r<rows;r++){var y=.55+r*.66;
  var st=new T.Mesh(new T.BoxGeometry(w-.1,.04,.62),E(r%2?0x9d5cff:LIME,.9));st.position.set(0,y,.14);g.add(st);
  var n=Math.floor(w/.3);var im=new T.InstancedMesh(new T.BoxGeometry(.18,.34,.18),new T.MeshStandardMaterial({color:0x000000,emissive:0xffffff,emissiveIntensity:.5,toneMapped:false}),n);var d=new T.Object3D();
  for(var i=0;i<n;i++){d.position.set(-w/2+.3+i*.3,y+.2,.14);d.scale.set(1,rnd(.7,1.25),1);d.updateMatrix();im.setMatrixAt(i,d.matrix);im.setColorAt(i,new T.Color(pick(PAL)).multiplyScalar(.9))}
  g.add(im)}
 S.add(g);return g}
for(var i=0;i<5;i++)shelf(-12.8+i*6.4,-9.5,6.2,0);
shelf(-15.2,0,14,Math.PI/2);shelf(15.2,0,14,-Math.PI/2);
var ISL=[[4.6,-3.2],[-6.8,-3.6],[7.8,3.2]];
function island(x,z){var g=new T.Group();g.position.set(x,0,z);
 var b=new T.Mesh(new T.BoxGeometry(3.6,.95,1.7),M('#241744',{roughness:.45,metalness:.4}));b.position.y=.48;g.add(b);
 var e=new T.Mesh(new T.BoxGeometry(3.66,.05,1.76),E(LIME,.9));e.position.y=.97;g.add(e);
 var e2=new T.Mesh(new T.BoxGeometry(3.66,.04,1.76),E(0x9d5cff,1.2));e2.position.y=.04;g.add(e2);
 var im=new T.InstancedMesh(new T.BoxGeometry(.22,.36,.22),new T.MeshStandardMaterial({color:0,emissive:0xffffff,emissiveIntensity:.55,toneMapped:false}),16);var d=new T.Object3D();
 for(var i=0;i<16;i++){d.position.set(-1.45+(i%8)*.41,1.18,i<8?-.36:.36);d.updateMatrix();im.setMatrixAt(i,d.matrix);im.setColorAt(i,new T.Color(pick(PAL)))}
 g.add(im);S.add(g)}
ISL.forEach(function(p){island(p[0],p[1])});

/* ---------- 간판 (한글 → 아이콘) ---------- */
var SIGN=[['스킨케어','skin',-9.6],['메이크업','make',-3.2],['헤어케어','hair',3.2],['향수','perf',9.6]];
function icon(g,k,cx,cy,s){g.save();g.translate(cx,cy);g.scale(s,s);g.strokeStyle='#fff';g.lineWidth=3.2;g.lineCap=g.lineJoin='round';
 if(k==='skin'){g.beginPath();g.ellipse(0,0,13,16,0,0,7);g.stroke();g.beginPath();g.moveTo(-5,-3);g.lineTo(-5,-3.1);g.moveTo(5,-3);g.lineTo(5,-3.1);g.moveTo(-5,6);g.quadraticCurveTo(0,10,5,6);g.stroke();g.beginPath();g.moveTo(18,-14);g.lineTo(18,-6);g.moveTo(14,-10);g.lineTo(22,-10);g.stroke()}
 if(k==='make'){g.strokeRect(-7,-3,14,18);g.strokeRect(-5,-17,10,14);g.beginPath();g.moveTo(-5,-17);g.lineTo(0,-23);g.lineTo(5,-17);g.stroke()}
 if(k==='hair'){g.beginPath();g.moveTo(-18,-6);g.lineTo(8,-10);g.quadraticCurveTo(20,-8,18,4);g.lineTo(8,6);g.lineTo(-18,2);g.closePath();g.stroke();g.strokeRect(-6,6,8,14)}
 if(k==='perf'){g.strokeRect(-12,-2,24,19);g.strokeRect(-4,-10,8,8);g.strokeRect(-7,-17,14,7);g.beginPath();g.moveTo(-6,6);g.lineTo(6,6);g.stroke()}
 g.restore()}
function signTex(i,mode){var c=document.createElement('canvas');c.width=768;c.height=240;var g=c.getContext('2d');
 g.fillStyle='#120a24';g.fillRect(0,0,768,240);g.fillStyle='#c5ff35';g.fillRect(0,214,768,26);
 g.strokeStyle='rgba(157,92,255,.9)';g.lineWidth=6;g.strokeRect(5,5,758,230);
 g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';
 if(mode==='icon'){icon(g,SIGN[i][1],200,108,3.1);g.font='800 70px "Pretendard","Noto Sans KR",sans-serif';g.fillText(SIGN[i][0],500,112)}
 else{g.font='900 112px "Pretendard","Noto Sans KR","Malgun Gothic",sans-serif';g.fillText(SIGN[i][0],384,112)}
 var t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t}
var signs=SIGN.map(function(s,i){var m=new T.Mesh(new T.PlaneGeometry(3.8,1.19),new T.MeshBasicMaterial({map:signTex(i,'ko'),toneMapped:false}));
 m.position.set(s[2],4.4,-8.7);S.add(m);
 var h1=new T.Mesh(new T.CylinderGeometry(.02,.02,2,6),M('#6a5a95'));h1.position.set(s[2]-1.5,5.4,-8.7);S.add(h1);var h2=h1.clone();h2.position.x=s[2]+1.5;S.add(h2);return m});
function setSigns(mode){signs.forEach(function(m,i){m.material.map=signTex(i,mode);m.material.needsUpdate=true})}

/* ---------- 사람 ---------- */
var CAP=T.CapsuleGeometry,GEO={};
function G(k,f){return GEO[k]||(GEO[k]=f())}
var SKIN=['#f0cfb4','#e3b996','#d9a784','#f2d6bf'],HAIR=['#17110e','#2a1a12','#3a2418','#0e0e12'],TOPS=['#6b5aa6','#c9c2e6','#4a4472','#8f86b8','#5b6aa0','#a99ccf','#7a7298','#9b84d6'],BOTS=['#1b1730','#26233f','#322d52','#141222','#3d3560'];
function human(o){
 var g=new T.Group(),hs=o.h||1,sk=o.skin||pick(SKIN),legs=[],arms=[];
 var em=o.glow||0;
 function mat(c,e){return new T.MeshStandardMaterial({color:c,roughness:.7,metalness:.05,emissive:o.emis||c,emissiveIntensity:e==null?em:e})}
 for(var s=-1;s<=1;s+=2){var l=new T.Group();l.position.set(s*.1,.9*hs,0);
  var lm=new T.Mesh(G('leg'+hs,function(){return new CAP(.07,.74*hs,4,8)}),mat(o.bottom,em*.6));lm.position.y=-.45*hs;l.add(lm);
  var sh=new T.Mesh(G('shoe',function(){return new T.BoxGeometry(.12,.07,.25)}),mat(o.shoe||'#e8e4f4',em*.5));sh.position.set(0,-.92*hs,.05);l.add(sh);g.add(l);legs.push(l)}
 var tor=new T.Mesh(G('tor'+hs,function(){return new CAP(.165,.46*hs,4,10)}),mat(o.top));tor.position.y=1.2*hs;tor.scale.z=.72;g.add(tor);
 for(var s2=-1;s2<=1;s2+=2){var a=new T.Group();a.position.set(s2*.235,1.42*hs,0);
  var am=new T.Mesh(G('arm'+hs,function(){return new CAP(.05,.5*hs,4,8)}),mat(o.sleeve||o.top));am.position.y=-.3*hs;a.add(am);
  var hd=new T.Mesh(G('hand',function(){return new T.SphereGeometry(.047,8,8)}),mat(sk,em*.4));hd.position.y=-.62*hs;a.add(hd);g.add(a);arms.push(a)}
 var head=new T.Mesh(G('head',function(){return new T.SphereGeometry(.122,16,14)}),mat(sk,em*.5));head.position.y=1.66*hs;head.scale.set(.92,1.08,.95);g.add(head);
 var hair=new T.Mesh(G('hair',function(){return new T.SphereGeometry(.136,16,14)}),mat(o.hair||pick(HAIR),em*.3));hair.position.set(0,1.69*hs,-.016);hair.scale.set(1,1.02,1.04);g.add(hair);
 if(o.style==='long'){var hl=new T.Mesh(G('hl',function(){return new CAP(.11,.32,4,10)}),mat(o.hair,em*.3));hl.position.set(0,1.5*hs,-.075);hl.scale.set(1,1,.6);g.add(hl)}
 if(o.style==='pony'){var pn=new T.Mesh(new CAP(.04,.22,4,8),mat(o.hair,em*.3));pn.position.set(0,1.6*hs,-.17);pn.rotation.x=.5;g.add(pn)}
 if(o.face){[-1,1].forEach(function(s){var e=new T.Mesh(new T.SphereGeometry(.013,6,6),new T.MeshBasicMaterial({color:0x14101a}));e.position.set(s*.045,1.67*hs,.113);g.add(e)})}
 if(o.vest){var v=new T.Mesh(new CAP(.172,.3*hs,4,10),mat(o.vest,.55));v.position.y=1.26*hs;v.scale.z=.76;g.add(v)}
 if(o.bag){var bg=new T.Mesh(new T.BoxGeometry(.24,.28,.1),mat(o.bag,em*.5));bg.position.set(.21,.96*hs,.03);g.add(bg)}
 g.userData={legs:legs,arms:arms,ph:Math.random()*6};S.add(g);return g}
var DT=.016;
var FC=0;function walk(h,sp,t){var u=h.userData;if(u.char){if(u.skip&&(FC&1))return;h.updateMatrixWorld(true);u.char.update(sp,DT*(u.skip?2:1));return}var k=Math.sin(t*sp*6.2+u.ph)*Math.min(.42,sp*.5);u.legs[0].rotation.x=k;u.legs[1].rotation.x=-k;u.arms[0].rotation.x=-k*.8;u.arms[1].rotation.x=k*.8}

/* 주인공 & 직원 */
var TX=-3,TZ=3.4;
var tourist=human({skin:'#f1d3bb',top:'#cfe636',bottom:'#4a6fb5',hair:'#e0bd68',style:'long',face:true,glow:.4,bag:'#e9dfcf'});
tourist.position.set(TX,0,TZ);
var staff=human({skin:'#efcdb2',top:'#f4f1ea',bottom:'#2a2838',hair:'#1b130f',style:'pony',face:true,vest:'#6fae2f',glow:.35,shoe:'#222'});
var sx=-1,sz=-6.4;staff.position.set(sx,0,sz);

/* ---------- 바구니 + 디스플레이 (실제 3D 모델) ---------- */
var basket=new T.Group();tourist.add(basket);basket.position.set(.34,.6,.12);basket.rotation.y=Math.PI/2;
var devParts=[],dialMesh=null,callMats=[],modelReady=false;
function loadModel(){
 var V=opt.glbVar||'__GLB_B64_BASKET',build=window.__buildGLB;
 return new Promise(function(res,rej){
  function go(ab){try{var buf=ab||build.b64ToBuf(window[V]),g=build.parseGLB(buf),root=build.buildModel(g,function(){});
   root.traverse(function(m){if(!m.isMesh)return;m.castShadow=false;m.receiveShadow=false;var n=m.name;
    if(/^basket_/.test(n)){}else if(n==='display_frame'||/^(display|dial|dial_|body|hook|rear|usb|camera|call)/.test(n)||/png/.test(n)){devParts.push(m)}
    if(n==='dial'){dialMesh=m}
    if(/^call_(ring|pad|bell)/.test(n)&&m.material)callMats.push(m.material)});
   if(dialMesh){var gm=dialMesh.geometry;gm.computeBoundingBox();var c=gm.boundingBox.getCenter(new T.Vector3());gm.translate(-c.x,-c.y,-c.z);dialMesh.position.copy(c)}
   basket.add(root);modelReady=true;setDev(devOn);res()}catch(e){rej(e)}}
  function viaScript(){if(window[V])return go();var s=document.createElement('script');s.src=opt.glbScript;s.onload=function(){go()};s.onerror=function(){rej(new Error('glb'))};document.head.appendChild(s)}
  if(opt.glbUrl&&window.fetch){fetch(opt.glbUrl).then(function(r){if(!r.ok)throw 0;return r.arrayBuffer()}).then(function(ab){go(ab)}).catch(viaScript)}else viaScript()})}

var devOn=false;function setDev(v){devOn=v;devParts.forEach(function(m){m.visible=v})}
var base=opt.base||'';
function loadScript(src){return new Promise(function(res,rej){var el=document.createElement('script');el.src=src;el.onload=res;el.onerror=function(){rej(new Error(src))};document.head.appendChild(el)})}
var CHD=[],CRC=['#7a6bb8','#5a5290','#8f86c4','#4a4472','#6572a8','#9a8fd0','#6d6694','#8b78c8'];
function charBuf(url){return fetch(url).then(function(r){if(!r.ok)throw 0;return r.arrayBuffer()})}
function applyChars(){var C=window.Chars;if(!C)return Promise.resolve();
 return Promise.all(['char_tourist','char_staff','crowd_a','crowd_b'].map(function(n){return charBuf(base+'models/'+n+'.glb?v=4')})).then(function(bs){
 var d=bs.map(function(b){return C.parse(b)});
 function put(g,inst){g.children.slice().forEach(function(c){c.visible=false});g.add(inst.root);g.userData.char=inst}
 put(tourist,C.make(d[0],{tint:'#bfae86',emis:.2}));put(staff,C.make(d[1],{tint:'#7fb3a6',emis:.2}));
 crowd.forEach(function(c,i){var col=CRC[i%CRC.length];c.h.userData.skip=1;put(c.h,C.make(d[2+i%2],{tint:col,emis:.16,scale:rnd(.94,1.06),sx:rnd(.9,1.12)}))})})}
var ready=loadModel().catch(function(e){console.warn('model',e)});
loadScript(base+'lib/chars.js?v=4').then(function(){return applyChars()}).catch(function(e){console.warn('chars',e)});


/* ---------- 손님들 ---------- */
var crowd=[],N=(window.innerWidth<800?12:18);
function inIsl(x,z,m){for(var k=0;k<ISL.length;k++){if(Math.abs(x-ISL[k][0])<1.9+m&&Math.abs(z-ISL[k][1])<1+m)return true}return false}
var jam=false,open=false;
function outIsl(o){for(var k=0;k<ISL.length;k++){var dx=o.x-ISL[k][0],dz=o.z-ISL[k][1],px=1.9+.25-Math.abs(dx),pz=1+.25-Math.abs(dz);if(px>0&&pz>0){if(px<pz)o.x+=(dx<0?-1:1)*px;else o.z+=(dz<0?-1:1)*pz}}}
function lineZ(x){var d=(sx-TX)||1,u=clamp((x-TX)/d,0,1);return TZ+(sz-TZ)*u}
function pickT(c){for(var n=0;n<14;n++){var x,z;
  if(jam&&c.jam){x=rnd(-1.6,4.2);z=rnd(-.4,2.8)}else{x=rnd(-12,12);z=rnd(-7,9)}
  if(open&&Math.abs(z-lineZ(x))<1.7&&x>-3.8&&x<6.5)continue;
  if(!inIsl(x,z,.5)&&!(Math.abs(x-TX)<1.5&&Math.abs(z-TZ)<1.5)){c.tx=x;c.tz=z;return}}
 c.tx=rnd(-9,9);c.tz=rnd(5,8)}
for(var i=0;i<N;i++){var h=human({top:pick(TOPS),bottom:pick(BOTS),hair:pick(HAIR),style:Math.random()<.4?'long':'',bag:Math.random()<.5?pick(TOPS):0,h:rnd(.93,1.06),glow:.1});
 var c={h:h,x:rnd(-12,12),z:rnd(-7,9),tx:0,tz:0,sp:rnd(.7,1.15),wait:0,yaw:rnd(0,6.28),v:0,jam:i%3!==0};outIsl(c);pickT(c);h.position.set(c.x,0,c.z);crowd.push(c)}

/* ---------- 경로선 (다이얼로 고른 코너까지) ---------- */
var PTS=[[TX,.06,TZ-.9],[TX,.06,.9],[-9.2,.06,.9],[-9.6,.06,-6.2]].map(function(p){return new T.Vector3(p[0],p[1],p[2])});
var curve=new T.CatmullRomCurve3(PTS,false,'catmullrom',.15),SEG=160,RAD=8;
var tube=new T.Mesh(new T.TubeGeometry(curve,SEG,.05,RAD,false),new T.MeshBasicMaterial({color:LIME,toneMapped:false}));tube.geometry.setDrawRange(0,0);S.add(tube);
var pathHead=new T.Mesh(new T.ConeGeometry(.2,.5,16),new T.MeshBasicMaterial({color:LIME,toneMapped:false}));pathHead.visible=false;S.add(pathHead);
var goal=new T.Mesh(new T.RingGeometry(.7,.9,48),new T.MeshBasicMaterial({color:LIME,toneMapped:false,transparent:true,opacity:.0,side:T.DoubleSide}));goal.rotation.x=-Math.PI/2;goal.position.set(-9.6,.07,-6.2);S.add(goal);
var pingM=[0,1,2].map(function(){var m=new T.Mesh(new T.RingGeometry(.95,1,64),new T.MeshBasicMaterial({color:0xff8a1f,toneMapped:false,transparent:true,opacity:0,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;S.add(m);return m});
var ringT=new T.Mesh(new T.RingGeometry(.7,.78,48),new T.MeshBasicMaterial({color:LIME,toneMapped:false,transparent:true,opacity:.9,side:T.DoubleSide}));ringT.rotation.x=-Math.PI/2;ringT.position.y=.06;S.add(ringT);
var ringS=ringT.clone();ringS.material=ringT.material.clone();ringS.material.color.set(0x8fe05a);S.add(ringS);

/* ---------- HUD (화면 위 표시) ---------- */
hud.innerHTML='<div class="h-dens" data-h="dens"><span>매장 안 손님</span><b>'+(N+1)+'</b><span>직원</span><b class="g">1</b></div>'+
 '<div class="h-tag" data-h="tour">외국인 관광객</div><div class="h-tag g" data-h="staff">매장 직원</div>'+
 '<div class="h-q" data-h="q0">?</div><div class="h-q" data-h="q1">?</div><div class="h-q" data-h="q2">?</div>'+
 '<svg class="h-line" data-h="line"><line x1="0" y1="0" x2="0" y2="0"/></svg><div class="h-x" data-h="x">✕</div><div class="h-tag r" data-h="cut">사이에 사람 12명</div>'+
 '<div class="h-tag s" data-h="dev"></div><div class="h-tag s" data-h="goal">스킨케어 코너</div><div class="h-say" data-h="say">도움 필요하시면 말씀해주세요~</div><div class="h-say t" data-h="exc">저기요!</div>';
var H={};[].forEach.call(hud.querySelectorAll('[data-h]'),function(e){H[e.dataset.h]=e});
var v3=new T.Vector3();
function proj(x,y,z){v3.set(x,y,z).project(cam);return{x:(v3.x*.5+.5)*W,y:(-v3.y*.5+.5)*Hh,ok:v3.z<1&&v3.z>-1}}
function place(el,p,on,dx,dy){if(!el)return;var vis=on&&p.ok&&p.x>-60&&p.x<W+60&&p.y>-60&&p.y<Hh+60;el.classList.toggle('on',vis);if(vis)el.style.transform='translate('+(p.x+(dx||0)).toFixed(1)+'px,'+(p.y+(dy||0)).toFixed(1)+'px) translate(-50%,-50%)'}

/* ---------- 카메라 샷 ---------- */
var W=1,Hh=1,beat=0,bt=0,bf=0,first=true;
var SH=[
 {p:[0,13.5,14],l:[0,.5,-1],f:40,sh:0},
 {p:[0,10.5,12.5],l:[0,0,-.5],f:46,sh:.14},
 {p:[-3.1,1.75,6.1],l:[-1.7,3.1,-6],f:60,sh:.16},
 {p:[-.7,2.55,10.2],l:[1.7,1.15,-.9],f:52,sh:.15},
 {loc:[.5,.5,.8],at:[.08,.22,.1],f:34,sh:.25},
 {loc:[.42,.46,.58],at:[.1,.2,.12],f:32,sh:.27},
 {p:[-4.6,2.3,8.6],l:[-4.2,2.4,-6],f:56,sh:.15},
 {p:[-2.4,2.6,7.6],l:[-2.4,1.1,.8],f:46,sh:.15},
 {loc:[.8,.62,1.1],at:[0,.2,0],f:36,sh:.27}];
var cp=new T.Vector3(),cl=new T.Vector3(),cf=40,csh=0,tp=new T.Vector3(),tl=new T.Vector3(),vv=new T.Vector3();
function shot(){var s=SH[beat];
 if(s.loc){tourist.updateMatrixWorld(true);basket.updateMatrixWorld(true);tp.set(s.loc[0],s.loc[1],s.loc[2]);basket.localToWorld(tp);tl.set(s.at[0],s.at[1],s.at[2]);basket.localToWorld(tl)}
 else{tp.set(s.p[0],s.p[1],s.p[2]);tl.set(s.l[0],s.l[1],s.l[2])}
 /* 같은 장면 안에서 아주 천천히 흐르는 카메라 */
 var dr=Math.sin(bt*.35)*.12+bf*.25;tp.x+=dr;if(beat===0){tp.x+=Math.sin(bt*.25)*2.4;tp.y+=Math.sin(bt*.2)*.4}}

/* ---------- 루프 ---------- */
var clk=new T.Clock(),vis=true,raf=0,sTime=0,pingT=-1,callT=-1,dialA=0;
function setBeat(i,f){if(i!==beat){beat=i;bt=0;jam=i===3;open=i>=7;crowd.forEach(function(c){c.wait=0;pickT(c)});sPick();
  ceilG.visible=i>1;setDev(i>=4);setSigns(i>=6?'icon':'ko');if(i===7){callT=-1;pingT=-1}}
 bf=f||0}
var sw={tx:-1,tz:-6.4,yaw:0,wait:0,st:0};
function sPick(){sw.st=0;for(var n=0;n<30;n++){var x=rnd(-11,11),z=rnd(-7,8.5);if(inIsl(x,z,.6))continue;if(beat<=3&&Math.hypot(x-TX,z-TZ)<6.5)continue;sw.tx=x;sw.tz=z;return}sw.tx=7;sw.tz=-6}
function frame(){raf=requestAnimationFrame(frame);if(!vis)return;
 FC++;var dt=Math.min(clk.getDelta(),.05),t=clk.elapsedTime;bt+=dt;DT=dt;
 /* 손님 */
 for(var k=0;k<crowd.length;k++){var c=crowd[k],h=c.h;
  if(c.wait>0){c.wait-=dt;c.v*=.9;walk(h,0,t);if(c.wait<=0)pickT(c);continue}
  var dx=c.tx-c.x,dz=c.tz-c.z,d=Math.hypot(dx,dz);if(d<.9){c.wait=rnd(.6,2.6);c.stk=0;continue}
  c.stk=(c.stk||0)+dt;if(c.stk>2.2){if(c.bd===undefined||d>c.bd-.25){c.wait=rnd(.4,1.2);pickT(c);c.stk=0;c.bd=undefined;continue}c.bd=d;c.stk=0}else if(c.bd===undefined)c.bd=d;
  var ad=angDiff(Math.atan2(dx,dz),c.yaw);c.yaw+=clamp(ad*ease(4,dt),-2.4*dt,2.4*dt);
  var sp=c.sp*(jam&&c.jam?.55:1)*Math.max(.15,Math.cos(Math.min(1.4,Math.abs(ad))));c.v+=(sp-c.v)*ease(3,dt);
  var nx=c.x+Math.sin(c.yaw)*c.v*dt*1.25,nz=c.z+Math.cos(c.yaw)*c.v*dt*1.25;
  if(inIsl(nx,nz,.12)){pickT(c);c.stk=0;c.bd=undefined}else{c.x=nx;c.z=nz}
  for(var j=0;j<crowd.length;j++){var o=crowd[j];if(o===c)continue;var ax=c.x-o.x,az=c.z-o.z,dd=ax*ax+az*az;if(dd<.36&&dd>1e-4){var m=.6/Math.sqrt(dd)*dt*.9;c.x+=ax*m;c.z+=az*m}}
  outIsl(c);
  var tdx=c.x-TX,tdz=c.z-TZ;if(tdx*tdx+tdz*tdz<1.2){c.x+=tdx*dt*1.4;c.z+=tdz*dt*1.4}
  if(open){var lz=lineZ(c.x);if(Math.abs(c.z-lz)<1.1&&c.x>-3.6&&c.x<6.2)c.z+=(c.z>lz?1:-1)*dt*2.4}
  h.position.set(c.x,0,c.z);h.rotation.y=c.yaw;walk(h,c.v,t)}
 /* 직원 */
 var walking=false;
 if(beat<7){if(sw.wait>0){sw.wait-=dt}else{var ddx=sw.tx-sx,ddz=sw.tz-sz,dd=Math.hypot(ddx,ddz);
   if(dd<.7){sw.wait=rnd(.8,2.4);sPick()}
   else{var ya=Math.atan2(ddx,ddz),ad2=angDiff(ya,sw.yaw);sw.yaw+=clamp(ad2*ease(4,dt),-2.2*dt,2.2*dt);
    var spd=1.15*Math.max(.2,Math.cos(Math.min(1.4,Math.abs(ad2))));var nx2=sx+Math.sin(sw.yaw)*spd*dt*1.2,nz2=sz+Math.cos(sw.yaw)*spd*dt*1.2;
    if(inIsl(nx2,nz2,.12)){sPick()}else{sx=nx2;sz=nz2;walking=true}
    sw.st=(sw.st||0)+dt;if(sw.st>9){sw.st=0;sPick()}}}
  staff.rotation.y=sw.yaw}
 else{var go=callT>=0&&bt-callT>.6,gx2=-1.6,gz2=2.5,dx2=gx2-sx,dz2=gz2-sz,d2=Math.hypot(dx2,dz2);
  if(go&&d2>.2){var sp2=2.6;sx+=dx2/d2*sp2*dt;sz+=dz2/d2*sp2*dt;staff.rotation.y+=angDiff(Math.atan2(dx2,dz2),staff.rotation.y)*ease(6,dt);walking=true}
  else if(go){staff.rotation.y+=angDiff(Math.atan2(TX-sx,TZ-sz),staff.rotation.y)*ease(6,dt)}}
 if(beat>=7)sw.yaw=staff.rotation.y;
 var so={x:sx,z:sz};outIsl(so);sx=so.x;sz=so.z;staff.position.set(sx,0,sz);walk(staff,walking?1.2:0,t);
 /* 주인공 */
 var ty=beat<=2?Math.PI:beat===3?Math.PI/2+.4:beat===6?Math.PI:beat===7?(callT>=0?Math.atan2(sx-TX,sz-TZ):Math.atan2(2,-3)):-Math.PI/2;
 tourist.rotation.y+=angDiff(ty,tourist.rotation.y)*ease(3,dt);tourist.position.set(TX,0,TZ);
 var A=tourist.userData.arms;if(!tourist.userData.char){A[0].rotation.x+=((beat===3?-Math.PI+.35+Math.sin(t*5)*.2:beat===2?-1.25:0)-A[0].rotation.x)*ease(6,dt);A[1].rotation.x+=((beat>=4?-.75:0)-A[1].rotation.x)*ease(6,dt)}
 walk(tourist,0,t);
 if(tourist.userData.char){tourist.updateMatrixWorld(true);var ch=tourist.userData.char,wv=tourist.userData.wv||0;wv+=(0-wv)*ease(6,dt);tourist.userData.wv=wv;
  if(wv>.02){var yw=tourist.rotation.y,swv=Math.sin(t*6)*.5;
   function LW(x,y,z){return new T.Vector3(x,y,z).applyAxisAngle(new T.Vector3(0,1,0),yw)}
   ch.aim('RightArm',LW(-.8,.55,.2),wv);ch.aim('RightForeArm',LW(-.3+swv,1,.15),wv)}}
 
 lightT.position.set(TX+.6,2.4,TZ+.6);lightS.position.set(sx+.6,2.4,sz+.6);
 /* 기기 상호작용 */
 if(dialMesh){var tgt=beat===5?Math.sin(bt*.9)*1.1:beat>5?.8:0;dialA+=(tgt-dialA)*ease(4,dt);dialMesh.rotation.z=dialA}
 if(beat===7&&callT<0&&bt>1.4){callT=bt;pingT=bt}
 callMats.forEach(function(m){if(m.emissive){m.emissiveIntensity=(beat===7&&callT>=0?2.4+Math.sin(t*14)*1.2:1)}});
 var onp=beat===7&&callT>=0;pingM.forEach(function(m,i){m.visible=onp;if(onp){var u=((bt-callT)*.55+i/3)%1;m.position.set(TX+.3,.08,TZ+.1);var s=.5+u*9;m.scale.set(s,s,1);m.material.opacity=.95*(1-u)}});
 /* 경로 */
 var pp=beat===5?clamp((bt-.8)/2.6,0,1):beat>5&&beat<7?1:beat>=7?0:0;
 tube.geometry.setDrawRange(0,Math.floor(pp*SEG)*RAD*6);tube.visible=beat>=5&&beat<=6||(beat===5);
 pathHead.visible=beat===5&&pp>0&&pp<1;if(pathHead.visible){var q=curve.getPointAt(pp),q2=curve.getPointAt(Math.min(1,pp+.01));pathHead.position.copy(q);pathHead.position.y=.3;vv.copy(q2).sub(q);pathHead.rotation.set(0,Math.atan2(vv.x,vv.z),0);pathHead.rotateX(Math.PI/2)}
 goal.material.opacity=(beat===5&&pp>=1||beat===6)?.6+.35*Math.sin(t*4):0;
 ringT.position.set(TX,.06,TZ);ringT.material.opacity=0;ringS.position.set(sx,.06,sz);ringS.material.opacity=0;
 /* 카메라 */
 shot();var k2=first?1:ease(beat===5||beat===4||beat===8||beat===6?2.2:2.6,dt);first=false;cp.lerp(tp,k2);cl.lerp(tl,k2);cf+=(SH[beat].f-cf)*k2;csh+=(SH[beat].sh-csh)*k2;
 crowd.forEach(function(c){if(beat<2){c.h.visible=true;return}var px=c.h.position.x-cp.x,pz=c.h.position.z-cp.z,d=Math.hypot(px,pz),dx=cl.x-cp.x,dz=cl.z-cp.z,dl=Math.hypot(dx,dz)||1,al=(px*dx+pz*dz)/dl,pe=Math.abs(px*dz-pz*dx)/dl;c.h.visible=!(al>-.5&&al<(beat>=4&&beat!==6&&beat!==7?4:3.2)&&pe<1.1&&d<4.5)});
 ceilG.visible=beat>1&&cp.y<5.8; cam.position.copy(cp);cam.lookAt(cl);cam.fov=cf*(W<Hh*.9?1.35:1);cam.updateProjectionMatrix();var por=W<Hh*.9;cam.setViewOffset(W,Hh,por?0:-csh*W,por?Hh*.2:0,W,Hh);cam.updateMatrixWorld();
 /* HUD */
 var pt=proj(TX,2.05,TZ),ps=proj(sx,2.2,sz),pm2=proj((TX+sx)/2,1.5,(TZ+sz)/2);
 place(H.dens,{x:W-150,y:120,ok:true},beat===1);
 place(H.tour,pt,beat===1||beat===3,-20,-18);place(H.staff,ps,beat===1||beat===3,0,-18);
 for(var qi=0;qi<3;qi++){var sp3=SIGN[qi],pq=proj(sp3[2],5.35,-8.7);var q0=H['q'+qi];place(q0,pq,beat===2||beat===6);if(q0)q0.textContent=beat===6?'✓':'?';if(q0)q0.classList.toggle('ok',beat===6)}
 var pxA=proj(TX,1.5,TZ),pxB=proj(sx,1.4,sz);
 if(H.line){var on3=beat===3&&pxA.ok&&pxB.ok;H.line.classList.toggle('on',on3);if(on3){var ln=H.line.firstChild;ln.setAttribute('x1',pxA.x);ln.setAttribute('y1',pxA.y);ln.setAttribute('x2',pxB.x);ln.setAttribute('y2',pxB.y)}}
 place(H.x,pm2,beat===3);place(H.cut,pm2,beat===3,0,52);
 var pd=proj.apply(null,(function(){basket.updateMatrixWorld(true);var v=new T.Vector3(.0,.2,.14);basket.localToWorld(v);return[v.x,v.y,v.z]})());
 if(H.dev){H.dev.textContent=beat===5?'다이얼 · 코너 선택':beat===6?'아이콘 + 화살표':beat===7?'호출 버튼':'';place(H.dev,pd,(beat===5||beat===6||beat===7),0,-110)}
 place(H.goal,proj(-9.6,.6,-6.2),beat===5&&pp>=1);
 place(H.exc,proj(TX+.3,2.25,TZ),beat===3,70,-30);
 place(H.say,proj(sx,2.3,sz),beat===7&&callT>=0&&Math.hypot(sx+1.6,sz-2.5)<.6,0,-24);
 comp.render()}
function resize(){var w=canvas.clientWidth||canvas.parentNode.clientWidth,h=canvas.clientHeight||canvas.parentNode.clientHeight;if(!w||!h)return;W=w;Hh=h;
 var pr=Math.min(window.devicePixelRatio||1,w<800?1:1.25);R.setPixelRatio(pr);R.setSize(w,h,false);comp.setPixelRatio(pr);comp.setSize(w,h);cam.aspect=w/h;
 var asp=w/h;bl.setSize(w*.5,h*.5);cam.updateProjectionMatrix()}
resize();frame();
return{_crowd:crowd,setBeat:setBeat,resize:resize,setVisible:function(v){vis=v;if(v)clk.getDelta()},ready:ready}
};
})();
