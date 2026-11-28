/* CHARS · 뼈대가 들어 있는 사람 GLB를 읽어 걷는 인물로 만든다 (three.js 만 사용)
   Chars.parse(arrayBuffer) → data      Chars.make(data, opt) → {root, update(speed,dt), aim(bone,dir,w), bone(name)}  */
(function(){
var T=window.THREE;
function b64ToBuf(b){var s=atob(b),n=s.length,u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=s.charCodeAt(i);return u.buffer}
var CT={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},NC={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function parse(buf){
 var dv=new DataView(buf),jl=dv.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,20,jl)));
 var bo=20+jl+8,bin=buf.slice(bo,bo+dv.getUint32(20+jl,true));
 function acc(i){var a=json.accessors[i],v=json.bufferViews[a.bufferView],C=CT[a.componentType],n=NC[a.type];
  var off=(v.byteOffset||0)+(a.byteOffset||0),len=a.count*n;
  var s=new C(bin.slice(off,off+len*C.BYTES_PER_ELEMENT));return{a:s,n:n,count:a.count}}
 var prim=json.meshes[0].primitives[0],at=prim.attributes;
 var d={json:json,pos:acc(at.POSITION),nor:acc(at.NORMAL),uv:acc(at.TEXCOORD_0),ji:acc(at.JOINTS_0),jw:acc(at.WEIGHTS_0),idx:acc(prim.indices),ibm:acc(json.skins[0].inverseBindMatrices)};
 var im=json.images[0],iv=json.bufferViews[im.bufferView];
 d.imgBlob=new Blob([bin.slice(iv.byteOffset||0,(iv.byteOffset||0)+iv.byteLength)],{type:im.mimeType||'image/jpeg'});
 d.clips={};
 (json.animations||[]).forEach(function(an){var tr=[];
  an.channels.forEach(function(c){var s=an.samplers[c.sampler],t=acc(s.input),o=acc(s.output),nm=json.nodes[c.target.node].name;
   if(c.target.path==='rotation')tr.push(new T.QuaternionKeyframeTrack(nm+'.quaternion',Array.from(t.a),Array.from(o.a)));
   else if(c.target.path==='translation')tr.push(new T.VectorKeyframeTrack(nm+'.position',Array.from(t.a),Array.from(o.a)))});
  d.clips[an.name]=new T.AnimationClip(an.name,-1,tr)});
 d.geo=new T.BufferGeometry();
 d.geo.setAttribute('position',new T.BufferAttribute(d.pos.a,3));d.geo.setAttribute('normal',new T.BufferAttribute(d.nor.a,3));d.geo.setAttribute('uv',new T.BufferAttribute(d.uv.a,2));
 d.geo.setAttribute('skinIndex',new T.BufferAttribute(new Uint16Array(d.ji.a),4));d.geo.setAttribute('skinWeight',new T.BufferAttribute(d.jw.a,4));
 d.geo.setIndex(new T.BufferAttribute(d.idx.a,1));d.geo.computeBoundingSphere();d.geo.boundingSphere.radius=3;
 d.tex=null;
 return d}
function loadTex(d){return new Promise(function(res){if(d.tex)return res(d.tex);var u=URL.createObjectURL(d.imgBlob),im=new Image();
 im.onload=function(){var t=new T.Texture(im);t.flipY=false;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;t.needsUpdate=true;d.tex=t;res(t)};im.onerror=function(){res(null)};im.src=u})}
var _q=new T.Quaternion(),_q2=new T.Quaternion(),_v=new T.Vector3(),_v2=new T.Vector3(),UP=new T.Vector3(0,1,0);
function make(d,o){
 o=o||{};var J=d.json,nodes=J.nodes,objs=nodes.map(function(n,i){return null}),joints=J.skins[0].joints,isJ={};joints.forEach(function(j){isJ[j]=1});
 var meshNode=-1;
 nodes.forEach(function(n,i){var ob=isJ[i]?new T.Bone():new T.Group();ob.name=n.name||('n'+i);
  if(n.translation)ob.position.fromArray(n.translation);if(n.rotation)ob.quaternion.fromArray(n.rotation);if(n.scale)ob.scale.fromArray(n.scale);objs[i]=ob;if(n.mesh!=null)meshNode=i});
 nodes.forEach(function(n,i){(n.children||[]).forEach(function(c){objs[i].add(objs[c])})});
 var rootI=J.scenes[0].nodes[0],root=objs[rootI];
 var bones=joints.map(function(j){return objs[j]}),ibm=[];
 for(var i=0;i<joints.length;i++){var m=new T.Matrix4();m.fromArray(d.ibm.a,i*16);ibm.push(m)}
 var mat=new T.MeshStandardMaterial(o.tint?{color:o.tint,roughness:.85,metalness:0,emissive:o.tint,emissiveIntensity:o.emis==null?.18:o.emis}:{map:d.tex,roughness:.8,metalness:0,emissive:0xffffff,emissiveMap:d.tex,emissiveIntensity:o.emis==null?.22:o.emis});
 var mesh=new T.SkinnedMesh(d.geo,mat);mesh.frustumCulled=false;mesh.name='body';
 var holder=objs[meshNode];
 holder.parent&&holder.parent.remove(holder);
 var wrap=new T.Group();wrap.add(root);wrap.add(mesh);if(o.scale)wrap.scale.setScalar(o.scale);
 if(o.sx)wrap.scale.x*=o.sx;
 wrap.updateMatrixWorld(true);
 mesh.bind(new T.Skeleton(bones,ibm),new T.Matrix4());
 var skel=mesh.skeleton,mixer=new T.AnimationMixer(root),act=mixer.clipAction(d.clips[o.clip||'walk']);act.play();
 var byName={};bones.forEach(function(b){byName[b.name]=b});
 var state={mode:'walk',t:Math.random()*1.0};
 var rest=bones.map(function(b){return{p:b.position.clone(),q:b.quaternion.clone()}});
 function pose(){bones.forEach(function(b,i){b.position.copy(rest[i].p);b.quaternion.copy(rest[i].q)})}
 var _wq=new T.Quaternion(),_d=new T.Vector3(),_hp=new T.Vector3(),_ap=new T.Vector3();
 function armSwing(t){wrap.getWorldQuaternion(_wq);byName.Hips.getWorldPosition(_hp);
  [['Left','LeftArm','LeftForeArm',1],['Right','RightArm','RightForeArm',-1]].forEach(function(a){var ab=byName[a[1]];if(!ab)return;
   ab.getWorldPosition(_ap);wrap.worldToLocal(_ap);var hl=_hp.clone();wrap.worldToLocal(hl);var out=_ap.x>hl.x?1:-1;
   var sw=Math.sin(t*6.2832)*a[3]*.28;
   api.aim(a[1],_d.set(out*.14,-1,sw).applyQuaternion(_wq),1);
   api.aim(a[2],_d.set(out*.06,-1,sw*1.2+.35).applyQuaternion(_wq),1)})}
 var api={root:wrap,bones:byName,mesh:mesh,
  /* sp>0: 걷는 속도(1≈보통), sp=0: 서 있기 */
  update:function(sp,dt){
   if(sp>.05){if(state.mode!=='walk'){state.mode='walk'}state.t+=dt*sp*1.0;mixer.setTime(state.t%1.0);wrap.updateMatrixWorld(true);armSwing(state.t)}
   else{if(state.mode!=='stand'){state.mode='stand'}pose()}
   wrap.updateMatrixWorld(true)},
  /* 뼈의 방향(가는 방향 +Y)을 월드 방향 dir 쪽으로 w 만큼 돌린다 */
  aim:function(name,dir,w){var b=byName[name];if(!b||!b.parent)return;b.updateWorldMatrix(true,false);
   b.getWorldQuaternion(_q);_v.set(0,1,0).applyQuaternion(_q).normalize();_v2.copy(dir).normalize();
   _q2.setFromUnitVectors(_v,_v2);_q2.multiply(_q);b.parent.getWorldQuaternion(_q);_q.invert().multiply(_q2);
   b.quaternion.slerp(_q,w==null?1:w);b.updateMatrixWorld(true)},
  stand:function(){return state.mode==='stand'}};
 return api}
window.Chars={parse:parse,make:make,loadTex:loadTex,b64ToBuf:b64ToBuf};
})();
