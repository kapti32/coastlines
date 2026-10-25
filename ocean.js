(function(){
/* shared GLSL: noise, caustics and the underwater light model used by the backdrop and every creature */
var COMMON=[
'uniform float uTime;uniform float uExp;uniform float uSat;uniform vec2 uRes;uniform vec3 uCamPos;uniform vec3 uAbsorb;uniform vec3 uHazeUp;uniform vec3 uHazeDn;uniform vec3 uSunW;uniform float uSunI;uniform float uAmb;',
'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
'float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);',
' return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}',
'float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<3;i++){s+=a*vnoise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}',
'float ridge(vec2 p,float t){',
' vec2 q=p+.75*vec2(vnoise(p*.9+vec2(t*.21,0.)),vnoise(p*.9+vec2(4.3,t*.19)));',
' float v=vnoise(q*1.8+vec2(t*.13,-t*.11));return 1.-abs(v*2.-1.);}',
/* light focused by the rippled surface; p in metres on a horizontal plane */
'float caus(vec2 p,float t){',
' mat2 R1=mat2(.82,.57,-.57,.82),R2=mat2(.55,-.83,.83,.55),R3=mat2(.94,-.34,.34,.94);',
' float a=ridge(R1*p*1.15,t*.9),b=ridge(R2*p*2.1+vec2(11.,3.),t*1.25+9.),d=ridge(R3*p*3.7+vec2(5.,17.),t*1.6+3.);',
' return pow(a,11.)*1.1+pow(b,12.)*.9+pow(d,14.)*.5;}',
'vec3 hazeFor(vec3 dir){return mix(uHazeDn,uHazeUp,smoothstep(-.45,.45,dir.y));}',
'vec3 fogApply(vec3 col,vec3 P){',
' vec3 d=P-uCamPos;float L=length(d);vec3 T=exp(-L*uAbsorb);',
' return col*T+hazeFor(d/max(L,1e-4))*(1.-T);}',
'vec3 uwLight(vec3 alb,vec3 N,vec3 P,float spec,float shin){',
' float depth=max(-P.y,.05);vec3 Ld=exp(-depth*uAbsorb*.85);',
' float sun=max(dot(N,uSunW),0.);',
' float c=caus(P.xz+uSunW.xz*depth*1.4,uTime);',
' vec3 direct=vec3(1.,.97,.9)*sun*(.5+1.9*c)*Ld*uSunI;',
' vec3 hemi=mix(vec3(.04,.16,.24),vec3(.30,.62,.78),N.y*.5+.5)*Ld*uAmb;',
' vec3 col=alb*(direct+hemi);',
' vec3 V=normalize(uCamPos-P);vec3 H=normalize(V+uSunW);',
' col+=vec3(.9,1.,1.)*pow(max(dot(N,H),0.),shin)*spec*Ld*(.5+1.4*c)*uSunI;',
' return col;}',
'vec3 grade(vec3 col){',
' col*=uExp;col=1.-exp(-col*1.35);col=pow(col,vec3(.4545));',
' float lu=dot(col,vec3(.299,.587,.114));return mix(vec3(lu),col,uSat);}',
'float vig(vec2 q){float v=length(q*vec2(.8,.9));float top=smoothstep(-.25,.95,q.y);return (1.-.28*smoothstep(.55,1.45,v))*(1.-.44*top);}'
].join('\n');

/* the water itself: surface seen from below, light shafts, sand floor with caustics, depth haze */
var BG_VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}';
var BG_FS=[
'precision highp float;',
'varying vec2 vUv;',
'uniform float uAspect;uniform float uTan;uniform float uFloorY;uniform mat3 uRot;uniform float uShaft;uniform float uWaveAmp;',
COMMON,
/* surface height field: a few travelling wave trains, analytic slope */
'vec3 wave(vec2 p,float t){',
' p+=.22*vec2(vnoise(p*.45+vec2(t*.07,0.)),vnoise(p*.45+vec2(9.,-t*.06)));',
' float h=0.;vec2 g=vec2(0.);',
' for(int i=0;i<6;i++){float fi=float(i);',
'  vec2 dir=vec2(cos(fi*2.399+.5),sin(fi*2.399+.5));',
'  float k=1.5+fi*1.55;float w=sqrt(9.81*k)*.8;float a=.05*uWaveAmp/(k*.7+.35);',
'  float ph=dot(dir,p)*k-w*t+fi*1.7;h+=a*sin(ph);g+=a*k*cos(ph)*dir;}',
' return vec3(h,g);}',
/* sunlight seen through the water: patchy shafts that converge toward the sun */
'float shafts(vec3 ro,vec3 rd,float tmax){',
' float s=0.;float dt=min(tmax,26.)/12.;',
' for(int i=0;i<12;i++){',
'  float tt=(float(i)+.5)*dt;vec3 P=ro+rd*tt;float dep=-P.y;',
'  if(dep>0.){',
'   vec2 sp=P.xz+uSunW.xz*dep*1.4;',
'   float r=ridge(sp*.42,uTime*.8);',
'   float beam=smoothstep(.62,1.,r);',
'   s+=beam*exp(-dep*.16-tt*.05)*(.35+.65*smoothstep(0.,2.,dep));}}',
' return s/12.*smoothstep(-.3,.4,rd.y);}',
'vec3 floorCol(vec3 F,float dist){',
' vec2 p=F.xz;float fade=exp(-dist*.085);',
' float m=vnoise(p*2.3)+.5*vnoise(p*7.1);',
' vec3 sand=mix(vec3(.66,.60,.47),vec3(.93,.89,.76),m*.66);',
' float rp=vnoise(vec2(p.x*.9+vnoise(p*.6)*2.,p.y*3.4));',
' sand*=(.80+.36*rp)*(.93+.14*vnoise(p*48.));',
' float pm=smoothstep(.60,.74,fbm(p*.3+vec2(3.,7.)));',
' sand=mix(sand,vec3(.07,.14,.11),pm*.55);',
' float c=caus(p,uTime);c=mix(.35,c,fade);',
' vec3 Ld=exp(-(-F.y)*uAbsorb*.8);',
' return sand*Ld*(.20+3.0*c)*uSunI;}',
'vec3 below(vec3 ro,vec3 rd){',
' float dn=-rd.y;float tf=dn>.0008?(ro.y-uFloorY)/dn:1e4;float tmax=min(tf,70.);',
' vec3 haze=hazeFor(rd);vec3 col=haze;',
' if(tf<70.)col=floorCol(ro+rd*tf,tf);',
' vec3 T=exp(-tmax*uAbsorb);col=col*T+haze*(1.-T);',
' col+=vec3(.55,.9,1.)*shafts(ro,rd,tmax)*uShaft;',
' return col;}',
'vec3 skyThrough(vec3 d){',
' float e=clamp(d.y,0.,1.);vec3 c=mix(vec3(.86,.95,1.),vec3(.40,.70,1.),pow(e,.45));',
' float s=max(dot(d,uSunW*vec3(1.,1.,1.)),0.);',
' return c*1.25+vec3(1.,.95,.8)*(pow(s,500.)*6.+pow(s,16.)*.35);}',
'vec3 surf(vec3 ro,vec3 rd){',
' float t=(0.-ro.y)/rd.y;vec3 P=ro+rd*t;',
' vec3 w=wave(P.xz,uTime);float k=exp(-t*.07);',
' vec3 N=normalize(vec3(-w.y*k,-1.,-w.z*k));',
' vec3 rf=refract(rd,N,1.33);',
' vec3 rr=reflect(rd,N);rr=vec3(rr.x,-abs(rr.y),rr.z);',
' vec3 col;',
' if(dot(rf,rf)<.001)col=below(P,rr)*.95;',
' else{float cosT=abs(dot(rf,N));float R=.02+.98*pow(1.-cosT,5.);',
'  vec3 sc=skyThrough(rf)*exp(-ro.y*-uAbsorb*.5);col=R>.03?mix(sc,below(P,rr),R):sc;}',
' return col;}',
'void main(){',
' vec2 q=vUv*2.-1.;',
' vec3 rd=normalize(uRot*vec3(q.x*uTan*uAspect,q.y*uTan,-1.));',
' vec3 ro=uCamPos;',
' vec3 col;',
' if(rd.y>.07)col=surf(ro,rd);',
' else if(rd.y>0.)col=mix(below(ro,rd),surf(ro,rd),smoothstep(.0,.07,rd.y));',
' else col=below(ro,rd);',
' col=grade(col)*vig(q);',
' gl_FragColor=vec4(col,1.);}'
].join('\n');

/* silver jack style fish: one lofted body, fins and eyes in a single geometry, animated in the vertex shader */
var FISH={};
(function(){
var THREE=window.THREE;
function lerpTable(t,s){for(var i=1;i<t.length;i++){if(s<=t[i][0]){var a=t[i-1],b=t[i],k=(s-a[0])/(b[0]-a[0]);k=k*k*(3-2*k);return a[1]+(b[1]-a[1])*k}}return t[t.length-1][1]}
var PROF=[[0,0],[.02,.032],[.06,.07],[.12,.103],[.22,.138],[.34,.152],[.48,.142],[.62,.112],[.76,.072],[.88,.042],[1,.03]];
function bodyX(s){return .5-.88*s}
function bodyTop(x){var s=(.5-x)/.88;return lerpTable(PROF,Math.max(0,Math.min(1,s)))}
FISH.geometry=function(){
  var P=[],T=[],PT=[],I=[];
  function v(x,y,z,tone,part){P.push(x,y,z);T.push(tone);PT.push(part);return P.length/3-1}
  var NS=30,NR=14,i,j;
  for(i=0;i<=NS;i++){var s=i/NS,hh=lerpTable(PROF,s),hw=hh*.46,x=bodyX(s);
    for(j=0;j<NR;j++){var a=j/NR*Math.PI*2,sy=Math.sin(a),cz=Math.cos(a);
      var yy=hh*(sy>0?sy:sy*.9);v(x,yy,hw*cz,sy,0)}}
  for(i=0;i<NS;i++)for(j=0;j<NR;j++){var a0=i*NR+j,a1=i*NR+(j+1)%NR,b0=(i+1)*NR+j,b1=(i+1)*NR+(j+1)%NR;I.push(a0,b0,a1,a1,b0,b1)}
  function poly(pts,part,tone){var b=P.length/3;pts.forEach(function(p){v(p[0],p[1],p[2],tone||0,part)});for(var k=1;k<pts.length-1;k++)I.push(b,b+k,b+k+1)}
  /* tail: forked */
  poly([[-.36,.03,0],[-.505,.14,0],[-.45,.0,0],[-.505,-.14,0],[-.36,-.03,0]],1,0);
  /* dorsal fins (spiny front one and a longer soft one) */
  poly([[.2,bodyTop(.2)*.97,0],[.13,.215,0],[.05,.2,0],[-.03,bodyTop(-.03)*.97,0]],1,1);
  poly([[-.02,bodyTop(-.02)*.97,0],[-.08,.185,0],[-.2,.165,0],[-.31,.09,0],[-.31,bodyTop(-.31)*.97,0]],1,1);
  /* anal fin and pelvic fin */
  poly([[-.08,-bodyTop(-.08)*.9,0],[-.13,-.165,0],[-.27,-.1,0],[-.3,-bodyTop(-.3)*.9,0]],1,-1);
  poly([[.1,-bodyTop(.1)*.9,0],[.04,-.15,0],[-.02,-bodyTop(-.02)*.9,0]],1,-1);
  /* pectoral fins */
  [-1,1].forEach(function(sd){poly([[.2,-.045,sd*.05],[.06,-.1,sd*.13],[.12,-.03,sd*.06]],1,0)});
  /* eyes */
  [-1,1].forEach(function(sd){var b=P.length/3,cx=.405,cy=.03,cz=sd*.05;v(cx,cy,cz,0,2);for(var k=0;k<8;k++){var a=k/8*6.283;v(cx+Math.cos(a)*.016,cy+Math.sin(a)*.016,cz+sd*.004,0,2)}
    for(k=0;k<8;k++){I.push(b,b+1+k,b+1+(k+1)%8)}});
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  g.setAttribute('aTone',new THREE.Float32BufferAttribute(T,1));
  g.setAttribute('aPart',new THREE.Float32BufferAttribute(PT,1));
  g.setIndex(I);g.computeVertexNormals();
  return g;
};
var FVS=[
'attribute vec4 aSeed;attribute float aTone;attribute float aPart;',
'uniform float uTime;uniform vec3 uCen;uniform vec3 uVel;uniform float uSize;uniform float uSpread;uniform float uBeat;',
'varying vec3 vN;varying vec3 vW;varying float vTone;varying float vPart;varying float vFl;',
'vec3 localOff(vec4 s,float t){',
' vec3 b=s.xyz*vec3(2.3,.8,1.0)*uSpread;float w=s.w*40.;',
' b+=vec3(sin(t*.8+w)*.55,sin(t*1.1+w*1.7)*.2,cos(t*.7+w*2.3)*.5)*uSpread*.4;return b;}',
'void main(){',
' float sp=max(length(uVel),.15);vec3 f0=uVel/sp;vec3 r0=normalize(cross(f0,vec3(0.,1.,0.)));vec3 u0=cross(r0,f0);',
' float t=uTime;vec3 b0=localOff(aSeed,t),b1=localOff(aSeed,t+.1);vec3 lv=(b1-b0)/.1;',
' vec3 v=uVel+f0*lv.x+u0*lv.y+r0*lv.z;',
' vec3 P=uCen+f0*b0.x+u0*b0.y+r0*b0.z;',
' vec3 fwd=normalize(v);vec3 right=normalize(cross(fwd,vec3(0.,1.,0.)));vec3 up=cross(right,fwd);',
' float roll=sin(t*.9+aSeed.w*31.)*.45+dot(lv,r0)*.3;float cr=cos(roll),sr=sin(roll);',
' vec3 up2=up*cr+right*sr;vec3 right2=right*cr-up*sr;',
' float sz=uSize*(.8+.4*fract(aSeed.w*7.3));',
' vec3 lp=position*sz;float sT=clamp(.5-position.x,0.,1.2);',
' float ph=t*uBeat*(1.+length(v)*.6)+aSeed.w*50.;',
' lp.z+=sin(ph-sT*5.5)*pow(sT,1.5)*.17*sz;',
' vec3 W=P+fwd*lp.x+up2*lp.y+right2*lp.z;',
' vN=normalize(fwd*normal.x+up2*normal.y+right2*normal.z);vW=W;vTone=aTone;vPart=aPart;vFl=roll;',
' gl_Position=projectionMatrix*viewMatrix*vec4(W,1.);}'
].join('\n');
var FFS=[
'precision highp float;',
'varying vec3 vN;varying vec3 vW;varying float vTone;varying float vPart;varying float vFl;',
'uniform vec3 uBack;uniform vec3 uFlank;uniform vec3 uBelly;uniform float uSilver;',
COMMON,
'void main(){',
' vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;vec3 V=normalize(uCamPos-vW);float v=vTone;',
' vec3 alb=mix(uFlank,uBack,smoothstep(.15,.9,v));alb=mix(alb,uBelly,smoothstep(-.05,-.85,v));',
' alb=mix(alb,vec3(.72,.6,.22),.2*smoothstep(.25,.0,abs(v-.02)));',
' float fin=step(.5,vPart)*step(vPart,1.5);float eye=step(1.5,vPart);',
' alb=mix(alb,mix(uFlank*.7,uBack*1.5,.5),fin);alb=mix(alb,vec3(.01,.015,.02),eye);',
' vec3 col=uwLight(alb,N,vW,mix(.25,.9,eye),mix(36.,90.,eye));',
' vec3 R=reflect(-V,N);float fr=pow(1.-max(dot(N,V),0.),3.);',
' vec3 env=mix(uHazeDn,uHazeUp,smoothstep(-.3,.6,R.y))*1.7+vec3(.8,1.,1.)*pow(max(R.y,0.),3.)*.35;',
' float metal=(1.-smoothstep(.1,.75,abs(v+.12)))*uSilver*(1.-fin)*(1.-eye);',
' col=mix(col,env*(.55+.6*alb),metal*(.4+.6*fr));',
' col=fogApply(col,vW);',
' gl_FragColor=vec4(grade(col)*vig(gl_FragCoord.xy/uRes*2.-1.),1.);}'
].join('\n');
FISH.material=function(U,opt){
  var u=Object.assign({},U,{uCen:{value:new THREE.Vector3()},uVel:{value:new THREE.Vector3(1,0,0)},uSize:{value:opt.size},uSpread:{value:opt.spread},uBeat:{value:opt.beat||9},
    uBack:{value:new THREE.Vector3().fromArray(opt.back||[.06,.16,.2])},uFlank:{value:new THREE.Vector3().fromArray(opt.flank||[.55,.63,.63])},uBelly:{value:new THREE.Vector3().fromArray(opt.belly||[.86,.9,.88])},uSilver:{value:opt.silver==null?.6:opt.silver}});
  return new THREE.ShaderMaterial({uniforms:u,vertexShader:FVS,fragmentShader:FFS,side:THREE.DoubleSide});
};
FISH.mesh=function(U,count,opt){
  var g=FISH.geometry(),ig=new THREE.InstancedBufferGeometry();
  ig.index=g.index;Object.keys(g.attributes).forEach(function(k){ig.setAttribute(k,g.attributes[k])});
  var seed=new Float32Array(count*4);
  for(var i=0;i<count;i++){var x,y,z;do{x=Math.random()*2-1;y=Math.random()*2-1;z=Math.random()*2-1}while(x*x+y*y+z*z>1);seed[i*4]=x;seed[i*4+1]=y;seed[i*4+2]=z;seed[i*4+3]=Math.random()}
  ig.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seed,4));ig.instanceCount=count;
  var m=new THREE.Mesh(ig,FISH.material(U,opt));m.frustumCulled=false;return m;
};
})();

/* green sea turtle: lofted shell with a generated scute texture, head, neck, tail and four flexing flippers */
var TURTLE={};
(function(){
var THREE=window.THREE;
/* ---- scute texture (colour + height), drawn once ---- */
function h1(n){var s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s)}
function vn(x,y){var ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
  var a=h1(ix+iy*57.3),b=h1(ix+1+iy*57.3),c=h1(ix+(iy+1)*57.3),d=h1(ix+1+(iy+1)*57.3);return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy}
var AX_F=.325,AX_B=.305,BZ=.255;
function bzAt(c){return BZ*(1-.18*Math.pow(Math.max(0,-c),1.3))}
TURTLE.textures=function(W,H){
  var seeds=[];
  [[.215,.075],[.095,.09],[-.025,.09],[-.145,.085],[-.255,.07]].forEach(function(a){seeds.push({x:a[0],z:0,w:a[1]})});
  [-1,1].forEach(function(sd){[[.17,.1],[.055,.105],[-.065,.105],[-.185,.095]].forEach(function(a){seeds.push({x:a[0],z:sd*.145,w:a[1]})})});
  seeds.push({x:.295,z:0,w:.05});seeds.push({x:-.31,z:0,w:.04});
  var NM=26;
  var c1=document.createElement('canvas'),c2=document.createElement('canvas');c1.width=c2.width=W;c1.height=c2.height=H;
  var x1=c1.getContext('2d'),x2=c2.getContext('2d'),i1=x1.createImageData(W,H),i2=x2.createImageData(W,H);
  var pal=[[118,88,46],[104,86,46],[92,80,44],[128,96,52],[98,76,40],[110,96,52]];
  for(var py=0;py<H;py++)for(var px=0;px<W;px++){
    var u=px/W,v=py/H,x=-.31+u*.64,z=-.26+v*.52;
    var c=x>=0?x/AX_F:x/AX_B;var bz=bzAt(c);var rho=Math.sqrt((x/(x>=0?AX_F:AX_B))*(x/(x>=0?AX_F:AX_B))+(z/bz)*(z/bz));
    var id,d1=1e9,d2=1e9,cx=0,cz=0,ang;
    if(rho>.86){var a=Math.atan2(z,x);id=100+Math.floor((a/Math.PI*.5+.5)*NM);var fr=((a/Math.PI*.5+.5)*NM)%1;d1=Math.min(fr,1-fr)*.5;d2=0;cx=0;cz=0;
      var seam=(1-Math.min(1,d1/.05))*.6}
    else{
      for(var k=0;k<seeds.length;k++){var s=seeds[k],d=Math.sqrt((x-s.x)*(x-s.x)+(z-s.z)*(z-s.z))/s.w;if(d<d1){d2=d1;d1=d;id=k;cx=s.x;cz=s.z}else if(d<d2)d2=d}
      var seam=1-Math.min(1,(d2-d1)/.07)}
    seam=Math.max(0,seam);
    var rr=(rho>.86)?.5:(Math.atan2(z-cz,x-cx));
    var pc=pal[Math.floor(h1(id*3.7)*pal.length)];
    var streak=vn(Math.atan2(z-cz,x-cx)*5+id*9,id*3.1)*.7+.45;
    var rings=.94+.06*Math.sin(d1*46+id);
    var mot=.82+.3*vn(u*70,v*70)+.12*vn(u*190,v*190);
    var k2=streak*rings*mot;
    var R=pc[0]*k2,G=pc[1]*k2,B=pc[2]*k2;
    var edge=rho>.86?(.78+.3*Math.max(0,(rho-.93)/.07)):1;R*=edge;G*=edge;B*=edge*(.92);
    if(rho>.965){R=R*.5+120*.5;G=G*.5+108*.5;B=B*.5+60*.5}
    var dk=1-seam*.55;R*=dk;G*=dk;B*=dk;
    var o=(py*W+px)*4;i1.data[o]=R;i1.data[o+1]=G;i1.data[o+2]=B;i1.data[o+3]=255;
    var hgt=Math.pow(1-seam,1.5)*(.8+.2*Math.sin(d1*46+id))*(rho>.98?.4:1);var hv=Math.max(0,Math.min(255,hgt*255));
    i2.data[o]=i2.data[o+1]=i2.data[o+2]=hv;i2.data[o+3]=255;
  }
  x1.putImageData(i1,0,0);x2.putImageData(i2,0,0);
  var t1=new THREE.CanvasTexture(c1),t2=new THREE.CanvasTexture(c2);
  [t1,t2].forEach(function(t){t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.anisotropy=4;t.needsUpdate=true});
  return {tex:t1,bump:t2};
};
/* ---- geometry ---- */
function finish(P,UV,PT,TN,FX,I){
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));
  g.setAttribute('aPart',new THREE.Float32BufferAttribute(PT,1));
  g.setAttribute('aTone',new THREE.Float32BufferAttribute(TN,1));
  g.setAttribute('aFlex',new THREE.Float32BufferAttribute(FX,1));
  g.setIndex(I);g.computeVertexNormals();return g;
}
function shellGeo(){
  var NT=48,NR=18,P=[],UV=[],PT=[],TN=[],FX=[],I=[];
  function add(x,y,z,part){P.push(x,y,z);UV.push((x+.31)/.64,(z+.26)/.52);PT.push(part);TN.push(0);FX.push(0);return P.length/3-1}
  var top=[],bot=[];
  function outl(th){var c=Math.cos(th),s=Math.sin(th);return [(c>=0?AX_F:AX_B)*c,bzAt(c)*s]}
  var j,k;
  for(k=0;k<NT;k++){top[k]=[];bot[k]=[]}
  for(k=0;k<NT;k++){var th=k/NT*Math.PI*2,o=outl(th);
    for(j=0;j<=NR;j++){var r=j/NR;
      if(j===0&&k>0){top[k][0]=top[0][0];bot[k][0]=bot[0][0];continue}
      var x=o[0]*r,z=o[1]*r;
      var y=.112*Math.pow(1-Math.pow(r,2.3),.58)*(1+.1*x/.3)+.014*Math.exp(-Math.pow(z/.04,2))*(1-r*r*r);
      top[k][j]=add(x,y+(j===NR?.002:0),z,0);
      if(j===NR)bot[k][j]=top[k][j];
      else{var yb=-.045*Math.pow(1-Math.pow(r,2.4),.5)-.002;bot[k][j]=add(x,yb,z,1)}
    }}
  for(k=0;k<NT;k++){var k1=(k+1)%NT;for(j=0;j<NR;j++){
    I.push(top[k][j],top[k][j+1],top[k1][j],top[k1][j],top[k][j+1],top[k1][j+1]);
    I.push(bot[k][j],bot[k1][j],bot[k][j+1],bot[k1][j],bot[k1][j+1],bot[k][j+1])}}
  return finish(P,UV,PT,TN,FX,I);
}
function lathe(prof,NR,x0,tone){ /* prof: [[x,r],...] along +x, returns skin geometry */
  var P=[],UV=[],PT=[],TN=[],FX=[],I=[],i,j;
  for(i=0;i<prof.length;i++)for(j=0;j<NR;j++){var a=j/NR*Math.PI*2,sy=Math.sin(a),cz=Math.cos(a);
    P.push(prof[i][0],prof[i][1]*sy*(sy>0?.9:.78),prof[i][1]*cz);UV.push(0,0);PT.push(2);TN.push(sy);FX.push(0)}
  for(i=0;i<prof.length-1;i++)for(j=0;j<NR;j++){var a0=i*NR+j,a1=i*NR+(j+1)%NR,b0=(i+1)*NR+j,b1=(i+1)*NR+(j+1)%NR;I.push(a0,b0,a1,a1,b0,b1)}
  return finish(P,UV,PT,TN,FX,I);
}
function headGeo(){
  return lathe([[.22,.05],[.29,.058],[.33,.056],[.37,.058],[.405,.052],[.43,.04],[.445,.025],[.452,.008],[.4535,0]],14);
}
function tailGeo(){return lathe([[-.26,.03],[-.31,.026],[-.37,.016],[-.42,.006],[-.43,0]],10)}
function eyeGeo(sd){
  var P=[],UV=[],PT=[],TN=[],FX=[],I=[],cx=.41,cy=.026,cz=sd*.049;
  P.push(cx,cy,cz);UV.push(0,0);PT.push(3);TN.push(0);FX.push(0);
  for(var k=0;k<10;k++){var a=k/10*6.283;P.push(cx+Math.cos(a)*.013,cy+Math.sin(a)*.012,cz+sd*.003);UV.push(0,0);PT.push(3);TN.push(0);FX.push(0)}
  for(k=0;k<10;k++)I.push(0,1+k,1+(k+1)%10);
  return finish(P,UV,PT,TN,FX,I);
}
function paddleGeo(L,chord,sweep,sd,droop){
  var NS=14,NU=9,P=[],UV=[],PT=[],TN=[],FX=[],I=[],i,j;
  function row(side){var base=P.length/3;
    for(i=0;i<=NS;i++){var s=i/NS,c=chord*Math.pow(1-Math.pow(s,1.7),.72)+.006,xc=-sweep*Math.pow(s,1.7)+.02*(1-s),yc=-droop*s*s,t=(.02*(1-s)+.005);
      for(j=0;j<=NU;j++){var u=j/NU,sh=Math.sin(Math.PI*u),lead=1-.5*u;
        P.push(xc+(u-.5)*2*c,yc+side*t*sh*(1+.4*(1-u)),sd*L*s);UV.push(0,0);PT.push(2);TN.push(side*(1-.9*Math.max(0,Math.min(1,(Math.abs(u-.5)*2-.7)/.3))));FX.push(s)}}
    return base}
  var bt=row(1),bb=row(-1);
  for(i=0;i<NS;i++)for(j=0;j<NU;j++){var a0=bt+i*(NU+1)+j,a1=a0+1,b0=a0+NU+1,b1=b0+1;
    if(sd>0){I.push(a0,b0,a1,a1,b0,b1)}else{I.push(a0,a1,b0,a1,b1,b0)}
    var c0=bb+i*(NU+1)+j,c1=c0+1,d0=c0+NU+1,d1=d0+1;
    if(sd>0){I.push(c0,c1,d0,c1,d1,d0)}else{I.push(c0,d0,c1,c1,d0,d1)}}
  return finish(P,UV,PT,TN,FX,I);
}
/* ---- material ---- */
var TVS=[
'attribute float aPart;attribute float aTone;attribute float aFlex;',
'uniform float uTime;uniform float uBend;uniform float uPhase;',
'varying vec3 vN;varying vec3 vW;varying vec3 vL;varying vec2 vUv;varying float vPart;varying float vTone;',
'void main(){',
' vec3 p=position;p.y+=uBend*aFlex*aFlex*sin(uPhase-aFlex*1.7-.6);',
' vec4 w=modelMatrix*vec4(p,1.);vW=w.xyz;vL=p;vN=normalize(mat3(modelMatrix)*normal);',
' vUv=uv;vPart=aPart;vTone=aTone;gl_Position=projectionMatrix*viewMatrix*w;}'
].join('\n');
var TFS=[
'precision highp float;',
'varying vec3 vN;varying vec3 vW;varying vec3 vL;varying vec2 vUv;varying float vPart;varying float vTone;',
'uniform sampler2D uTex;uniform sampler2D uBump;',
COMMON,
'vec3 perturb(vec3 N,vec3 P,float h,float k){',
' vec3 dpx=dFdx(P),dpy=dFdy(P);float dhx=dFdx(h),dhy=dFdy(h);',
' vec3 r1=cross(dpy,N),r2=cross(N,dpx);float det=dot(dpx,r1);',
' vec3 g=sign(det)*(dhx*r1+dhy*r2);return normalize(abs(det)*N-k*g);}',
'void main(){',
' vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;',
' vec3 alb;float spec=.35,shin=40.;',
' float shell=1.-smoothstep(.3,.7,vPart);float plast=smoothstep(.3,.7,vPart)*(1.-smoothstep(1.3,1.7,vPart));',
' float skin=smoothstep(1.3,1.7,vPart)*(1.-smoothstep(2.3,2.7,vPart));float eye=smoothstep(2.3,2.7,vPart);',
' vec3 tex=pow(texture2D(uTex,vUv).rgb,vec3(2.2));',
' float hh=texture2D(uBump,vUv).r;',
' vec3 Ns=perturb(N,vW,hh*.0045,1.0);',
' float scale=vnoise(vL.xz*34.+vL.y*21.)*.6+vnoise(vL.xz*90.)*.4;',
' vec3 dorsal=mix(vec3(.05,.045,.022),vec3(.14,.115,.05),scale);',
' vec3 ventral=mix(vec3(.62,.52,.3),vec3(.74,.66,.42),scale);',
' vec3 sk=mix(ventral,dorsal,smoothstep(-.25,.35,vTone));',
' sk=mix(sk,sk*.55,smoothstep(.62,.72,abs(fract(scale*5.)-.5)*2.)*.6);',
' alb=tex*shell+vec3(.78,.66,.4)*(.85+.3*scale)*plast+sk*skin+vec3(.01,.012,.01)*eye;',
' vec3 NN=normalize(mix(N,Ns,shell));',
' spec=mix(mix(.08,.16,skin),.9,eye);shin=mix(36.,110.,eye);',
' vec3 col=uwLight(alb,NN,vW,spec,shin);',
' col=fogApply(col,vW);',
' gl_FragColor=vec4(grade(col)*vig(gl_FragCoord.xy/uRes*2.-1.),1.);}'
].join('\n');
function mat(U,tx,extra){
  var u=Object.assign({},U,{uTex:{value:tx.tex},uBump:{value:tx.bump},uBend:{value:0},uPhase:{value:0}},extra||{});
  var m=new THREE.ShaderMaterial({uniforms:u,vertexShader:TVS,fragmentShader:TFS,side:THREE.DoubleSide});
  m.extensions={derivatives:true};return m;
}
TURTLE.build=function(U,texSize){
  var tx=TURTLE.textures(texSize||512,Math.round((texSize||512)*.8125));
  var body=mat(U,tx),front=mat(U,tx,{uBend:{value:.075}}),rear=mat(U,tx,{uBend:{value:.03}});
  var root=new THREE.Group(),core=new THREE.Group();root.add(core);
  core.add(new THREE.Mesh(shellGeo(),body));
  core.add(new THREE.Mesh(tailGeo(),body));
  var head=new THREE.Group();head.position.set(.0,.0,0);core.add(head);
  head.add(new THREE.Mesh(headGeo(),body));head.add(new THREE.Mesh(eyeGeo(1),body));head.add(new THREE.Mesh(eyeGeo(-1),body));
  var fg=[paddleGeo(.46,.085,.14,1,.04),paddleGeo(.46,.085,.14,-1,.04)];
  var rg=[paddleGeo(.17,.05,.07,1,.01),paddleGeo(.17,.05,.07,-1,.01)];
  var FL=new THREE.Group(),FR=new THREE.Group(),RL=new THREE.Group(),RR=new THREE.Group();
  FR.position.set(.15,-.012,.2);FL.position.set(.15,-.012,-.2);RR.position.set(-.235,-.012,.13);RL.position.set(-.235,-.012,-.13);
  FR.add(new THREE.Mesh(fg[0],front));FL.add(new THREE.Mesh(fg[1],front));RR.add(new THREE.Mesh(rg[0],rear));RL.add(new THREE.Mesh(rg[1],rear));
  core.add(FR,FL,RR,RL);
  root.userData={core:core,head:head,FR:FR,FL:FL,RR:RR,RL:RL,front:front,rear:rear};
  root.traverse(function(o){o.frustumCulled=false});
  return root;
};
TURTLE.pose=function(root,ph){
  var d=root.userData,a=.52*Math.sin(ph)-.06,b=-(.42+.2*Math.sin(ph+.5)),c=.28*Math.cos(ph);
  d.FR.rotation.set(a,b,c);d.FL.rotation.set(-a,-b,c);
  var a2=.22*Math.sin(ph+1.3),b2=-(.95+.12*Math.sin(ph+.4));
  d.RR.rotation.set(a2,b2,0);d.RL.rotation.set(-a2,-b2,0);
  d.front.uniforms.uPhase.value=ph;d.rear.uniforms.uPhase.value=ph+1.3;
  d.head.rotation.set(0,Math.sin(ph*.5)*.05,Math.sin(ph-.4)*.03);
};
})();

/* drifting sediment that lights up inside the sun shafts */
var SNOW={};
(function(){
var THREE=window.THREE;
var VS=[
'attribute vec4 aP;uniform float uTime;uniform vec3 uBoxMin;uniform vec3 uBoxSize;uniform float uFocal;',
'varying vec3 vW;varying float vA;',
'void main(){',
' float t=uTime;vec3 b=aP.xyz*uBoxSize;',
' vec3 drift=vec3(sin(t*.07+aP.w*20.)*.5+.03*t,-.03*t*(.4+aP.w),cos(t*.05+aP.w*30.)*.5+.02*t);',
' vec3 p=uBoxMin+mod(b+drift,uBoxSize);vW=p;',
' vec4 mv=viewMatrix*vec4(p,1.);float d=max(-mv.z,.2);',
' gl_PointSize=clamp((.006+.016*aP.w)*uFocal/d,1.,7.);',
' vA=.35+.65*fract(aP.w*91.7);',
' gl_Position=projectionMatrix*mv;}'
].join('\n');
var FS=[
'precision highp float;varying vec3 vW;varying float vA;',
COMMON,
'void main(){',
' float d=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,.15,d);',
' float dep=-vW.y;float r=ridge((vW.xz+uSunW.xz*dep*1.4)*.42,uTime*.8);',
' float lit=.25+.75*smoothstep(.5,1.,r);',
' vec3 col=fogApply(vec3(.9,1.,1.)*lit*exp(-dep*.1),vW);',
' float dist=length(vW-uCamPos);float fade=exp(-dist*.06);',
' gl_FragColor=vec4(grade(col),a*vA*(.25+.6*lit)*fade);}'
].join('\n');
SNOW.make=function(U,count){
  var P=new Float32Array(count*4);for(var i=0;i<count*4;i++)P[i]=Math.random();
  var g=new THREE.BufferGeometry();g.setAttribute('aP',new THREE.BufferAttribute(P,4));
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));
  var u=Object.assign({},U,{uBoxMin:{value:new THREE.Vector3(-14,-6,-20)},uBoxSize:{value:new THREE.Vector3(28,5.6,19)},uFocal:{value:800}});
  var m=new THREE.Points(g,new THREE.ShaderMaterial({uniforms:u,vertexShader:VS,fragmentShader:FS,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  m.frustumCulled=false;m.renderOrder=5;return m;
};
})();

/* the live scene: camera drift, creature paths, day and deep moods, motion control */
(function(){
"use strict";
var canvas=document.getElementById('water'),root=document.documentElement;
var THREE=window.THREE;
var mq0=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
var savedStill=false;try{savedStill=localStorage.getItem('cl.still')==='1'}catch(e){}
root.setAttribute('data-still',(mq0.matches||savedStill)?'1':'0');
setTimeout(function(){
function fallback(){if(canvas)canvas.style.display='none';root.setAttribute('data-sea','off')}
if(!canvas||!THREE){fallback();return}
var mq=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
var darkMq=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):{matches:false};
var still=!!mq.matches||savedStill;root.setAttribute('data-still',still?'1':'0');
var renderer;
try{renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:false,powerPreference:'low-power'})}catch(e){fallback();return}
renderer.setClearColor(0x05406a,1);
var cam=new THREE.PerspectiveCamera(52,1,.1,200),scene=new THREE.Scene();
var V3=function(a,b,c){return new THREE.Vector3(a,b,c)};
var U={
 uTime:{value:0},uExp:{value:1},uSat:{value:1.35},uRes:{value:new THREE.Vector2(1,1)},uCamPos:{value:V3(0,-1.7,0)},
 uAbsorb:{value:V3(.26,.075,.04)},uHazeUp:{value:V3(.01,.22,.46)},uHazeDn:{value:V3(.005,.09,.24)},
 uSunW:{value:V3(.18,.96,.2).normalize()},uSunI:{value:1},uAmb:{value:1},
 uAspect:{value:1},uTan:{value:Math.tan(26*Math.PI/180)},uFloorY:{value:-5.2},uRot:{value:new THREE.Matrix3()},uShaft:{value:.8},uWaveAmp:{value:2.4}
};
var MOODS={
 day:{uAbsorb:[.26,.075,.04],uHazeUp:[.01,.22,.46],uHazeDn:[.005,.09,.24],uFloorY:-5.2,uShaft:.8,uExp:1,uSunI:1,uAmb:1},
 deep:{uAbsorb:[.36,.1,.055],uHazeUp:[.005,.14,.34],uHazeDn:[.003,.05,.15],uFloorY:-7.5,uShaft:.75,uExp:.92,uSunI:.85,uAmb:.9}
};
var moodNow=0,moodTarget=0;
function applyMood(m){
  var a=MOODS.day,b=MOODS.deep,k=m;
  ['uAbsorb','uHazeUp','uHazeDn'].forEach(function(n){U[n].value.set(a[n][0]+(b[n][0]-a[n][0])*k,a[n][1]+(b[n][1]-a[n][1])*k,a[n][2]+(b[n][2]-a[n][2])*k)});
  ['uFloorY','uShaft','uExp','uSunI','uAmb'].forEach(function(n){U[n].value=a[n]+(b[n]-a[n])*k});
}
function wantDark(){var t=root.getAttribute('data-theme');return t==='dark'||(t!=='light'&&!!darkMq.matches)}

var bg=new THREE.Mesh(new THREE.PlaneBufferGeometry(2,2),new THREE.ShaderMaterial({uniforms:U,vertexShader:BG_VS,fragmentShader:BG_FS,depthTest:false,depthWrite:false}));
bg.frustumCulled=false;bg.renderOrder=-10;scene.add(bg);

var small=Math.min(window.innerWidth,window.innerHeight)<700;
var schoolA=FISH.mesh(U,small?70:110,{size:.42,spread:1.15,beat:9});
var schoolC=FISH.mesh(U,small?120:260,{size:.12,spread:1.8,beat:15,silver:.85,back:[.05,.14,.19]});
scene.add(schoolA);scene.add(schoolC);
var turtle=TURTLE.build(U,small?384:512);turtle.rotation.order='YZX';turtle.scale.setScalar(1.3);scene.add(turtle);
var snow=SNOW.make(U,small?260:620);scene.add(snow);

/* ---- paths: ellipses in front of the camera (the camera looks down -z) ---- */
var P={t:{phi:Math.random()*6.28,c:4.6,rz:1.5,y:-2.35,speed:.5,dir:1},a:{phi:Math.random()*6.28,c:9.5,rz:2.6,y:-2.6,speed:.7,dir:-1},c:{phi:Math.random()*6.28,c:16,rz:3.2,y:-3.1,speed:1.0,dir:1}};
var W=1,H=1,aspect=1,qScale=1,slow=0,frames=0,accum=0;
function halfW(z){return Math.tan(26*Math.PI/180)*aspect*z}
function ell(p,dt,key,ry){
  var rx=Math.max(halfW(p.c)+ry,key==='t'?2.6:4),omega=p.dir*p.speed/rx;p.phi+=omega*dt;
  var x=rx*Math.cos(p.phi),z=-(p.c+p.rz*Math.sin(p.phi));
  var vx=-rx*Math.sin(p.phi)*omega,vz=-p.rz*Math.cos(p.phi)*omega;
  return {x:x,z:z,vx:vx,vz:vz};
}
var tmpV=V3(0,0,0);
var state={t:0,beat:0};
function stepScene(dt,t){
  /* camera drifts like a free diver */
  cam.position.set(Math.sin(t*.05)*.5+Math.sin(t*.13)*.15,-1.7+Math.sin(t*.09)*.1,0);
  cam.rotation.set(-.1+Math.sin(t*.07)*.012,Math.sin(t*.04)*.05,Math.sin(t*.06)*.01);
  cam.updateMatrixWorld(true);
  U.uCamPos.value.copy(cam.position);U.uRot.value.setFromMatrix4(cam.matrixWorld);U.uTime.value=t;
  /* turtle */
  var q=ell(P.t,dt,'t',1.6),sp=Math.sqrt(q.vx*q.vx+q.vz*q.vz)+1e-6;
  var ph=state.beat;state.beat+=dt*1.8;
  var yy=P.t.y+.16*Math.sin(t*.17)+.035*Math.sin(ph-.8);
  turtle.position.set(q.x,yy,q.z);
  var yaw=Math.atan2(-q.vz,q.vx),pitch=.05*Math.cos(t*.17)+.05*Math.sin(ph-.8);
  turtle.rotation.set(Math.sin(ph)*.05,yaw,pitch);
  TURTLE.pose(turtle,ph);
  /* schools */
  var a=ell(P.a,dt,'a',2.2);
  schoolA.material.uniforms.uCen.value.set(a.x,P.a.y+.45*Math.sin(t*.11),a.z);
  schoolA.material.uniforms.uVel.value.set(a.vx,0,a.vz);
  var c=ell(P.c,dt,'c',3.5);
  schoolC.material.uniforms.uCen.value.set(c.x,P.c.y+.5*Math.sin(t*.09+1),c.z);
  schoolC.material.uniforms.uVel.value.set(c.vx,0,c.vz);
  snow.material.uniforms.uBoxMin.value.set(cam.position.x-14,-6,-20);
}
function resize(){
  W=Math.max(1,window.innerWidth);H=Math.max(1,window.innerHeight);aspect=W/H;
  var q=Math.min(1,1000/Math.max(W,H))*qScale,w=Math.max(2,Math.round(W*q)),h=Math.max(2,Math.round(H*q));
  renderer.setPixelRatio(1);renderer.setSize(w,h,false);
  cam.aspect=aspect;cam.updateProjectionMatrix();
  U.uAspect.value=aspect;U.uRes.value.set(w,h);snow.material.uniforms.uFocal.value=h/(2*Math.tan(26*Math.PI/180));
}
var raf=0,last=0,tick=0,t0=performance.now(),tSim=14;
var shown=false;
function draw(){renderer.render(scene,cam);if(!shown){shown=true;canvas.style.opacity='1'}}
function frame(now){
  raf=requestAnimationFrame(frame);
  if(now-last<30)return;
  var gap=now-last;accum+=gap;
  if(++frames===30){var avg=accum/30;frames=0;accum=0;if(avg>62&&qScale>.45){qScale*=.8;resize()}}
  var dt=Math.min(.1,gap/1000);last=now;tSim+=dt;
  if(++tick%20===0){moodTarget=wantDark()?1:0}
  if(Math.abs(moodNow-moodTarget)>.002){moodNow+=(moodTarget-moodNow)*.06;applyMood(moodNow)}
  stepScene(dt,tSim);draw();
}
function run(){if(raf||still||document.hidden)return;last=performance.now();raf=requestAnimationFrame(frame)}
function halt(){if(raf){cancelAnimationFrame(raf);raf=0}}
function still1(){moodTarget=wantDark()?1:0;moodNow=moodTarget;applyMood(moodNow);stepScene(.0001,tSim);draw()}
function setStill(v){still=!!v;root.setAttribute('data-still',still?'1':'0');if(still){halt();still1()}else run()}
canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();halt();fallback()},false);
resize();still1();if(!still)run();
var rt=0;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){resize();if(still)still1()},150)});
document.addEventListener('visibilitychange',function(){document.hidden?halt():run()});
document.addEventListener('cl-motion',function(e){setStill(e.detail&&e.detail.still)});
if(mq.addEventListener)mq.addEventListener('change',function(e){setStill(e.matches)});
},40);
})();

})();