import * as THREE from 'https://esm.sh/three@0.160.0';
import { viewportProgress, centerOffset, damp, lerp } from './scroll.js';

const QUESTIONS = [
  {
    q:'What are you protecting first?',
    opts:[
      {t:'My kids\' future if I\'m gone', w:{term:3, mortgage:1, iul:1}},
      {t:'The mortgage on our house', w:{mortgage:3, term:2}},
      {t:'My own funeral costs', w:{final:3}},
      {t:'The money I already saved', w:{annuity:3, iul:2}},
    ]
  },
  {
    q:'How long do you need the coverage to last?',
    opts:[
      {t:'Until the kids finish college', w:{term:3, mortgage:1}},
      {t:'Until the loan is paid off', w:{mortgage:3}},
      {t:'Literally forever', w:{whole:3, iul:2, final:1}},
      {t:'I need income, not a payout', w:{annuity:3}},
    ]
  },
  {
    q:'What matters most in the premium?',
    opts:[
      {t:'Lowest possible monthly cost', w:{term:3, mortgage:2}},
      {t:'Fixed forever, never increases', w:{whole:3, final:2}},
      {t:'Building cash I can borrow', w:{iul:3, whole:2}},
      {t:'Guaranteed income later', w:{annuity:3}},
    ]
  },
  {
    q:'How do you feel about medical exams?',
    opts:[
      {t:'Fine — I\'m healthy, get me the best rate', w:{term:2, iul:2, whole:1}},
      {t:'Rather skip it entirely', w:{final:3, mortgage:1}},
      {t:'I have conditions to work around', w:{final:2, whole:2}},
      {t:'Not relevant — I\'m depositing a lump sum', w:{annuity:3}},
    ]
  }
];

const RESULTS = {
  term:    {angle:0,   title:'Level Term Life', body:'You need the biggest death benefit for the smallest premium over a defined window. A 20–30 year level term locks your rate while the kids and the mortgage still depend on you — with conversion rights if your plans change.', meta:['Up to $5M','10–30 yr','No-exam option'], prod:'term'},
  whole:   {angle:60,  title:'Whole Life', body:'You want certainty over cost efficiency. Premiums that never move, a benefit that never expires, and cash value quietly compounding in the background as a legacy asset.', meta:['Fixed premium','Cash value','Never expires'], prod:'whole'},
  final:   {angle:120, title:'Final Expense', body:'Your goal is dignity, not wealth transfer. A $10k–$25k simplified-issue policy covers the service, the burial and the travel — no exam, no health interrogation, approval in days.', meta:['$5k–$50k','No exam','Ages 45–85'], prod:'final'},
  annuity: {angle:180, title:'Fixed Indexed Annuity', body:'You\'ve already built the pile — now it needs to become a paycheck. A fixed indexed annuity protects principal, grows tax-deferred, and can pay you for life.', meta:['Principal protected','Tax-deferred','Lifetime income'], prod:'annuity'},
  mortgage:{angle:240, title:'Mortgage Protection', body:'The house is the asset you refuse to risk. Coverage sized to your exact loan balance, optionally with disability and return-of-premium, so the deed stays in the family free and clear.', meta:['Loan-matched','Disability rider','ROP option'], prod:'mortgage'},
  iul:     {angle:300, title:'Indexed Universal Life', body:'You want protection that also does work. Index-linked crediting with a 0% floor, flexible premiums, and tax-advantaged access to accumulated value later in life.', meta:['0% floor','Flexible premium','Policy loans'], prod:'iul'},
};

export function initQuiz(){
  const wrap = document.querySelector('.quiz-viz');
  const canvas = document.getElementById('compass-canvas');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  let W = wrap.clientWidth, H = wrap.clientHeight;
  renderer.setSize(W,H,false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 60);
  camera.position.set(0,2.6,7.6);

  scene.add(new THREE.AmbientLight(0x53718c,0.85));
  const dl = new THREE.DirectionalLight(0xffe6ae,1.9); dl.position.set(4,7,5); scene.add(dl);
  const dl2 = new THREE.DirectionalLight(0x2aa39c,0.9); dl2.position.set(-5,-1,-4); scene.add(dl2);

  const rig = new THREE.Group();
  scene.add(rig);

  /* --- dial disc --- */
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5,2.5,0.16,72),
    new THREE.MeshPhysicalMaterial({color:0x0e151d, metalness:0.55, roughness:0.35, clearcoat:1})
  );
  rig.add(disc);
  rig.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.CylinderGeometry(2.52,2.52,0.17,72)),
    new THREE.LineBasicMaterial({color:0xc9a227, transparent:true, opacity:0.35})
  ));

  /* --- six sector markers --- */
  const markers = [];
  Object.keys(RESULTS).forEach((k,i)=>{
    const a = (RESULTS[k].angle*Math.PI)/180;
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.9,8),
      new THREE.MeshBasicMaterial({color:0x2aa39c, transparent:true, opacity:0.5}));
    post.position.y = 0.45; g.add(post);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16,0),
      new THREE.MeshStandardMaterial({color:0x1f6f6b, emissive:0x1f6f6b, emissiveIntensity:0.3, roughness:0.4}));
    orb.position.y = 1.0; g.add(orb);
    g.position.set(Math.sin(a)*2.05, 0.08, Math.cos(a)*2.05);
    g.userData = {key:k, orb, post, lit:0};
    markers.push(g); rig.add(g);
  });

  /* --- needle --- */
  const needle = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.ConeGeometry(0.17,2.0,4),
    new THREE.MeshStandardMaterial({color:0xe8cf72, emissive:0xc9a227, emissiveIntensity:0.75, metalness:0.75, roughness:0.2}));
  shaft.rotation.x = -Math.PI/2; shaft.position.z = 1.0; needle.add(shaft);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11,0.8,4),
    new THREE.MeshStandardMaterial({color:0x1f6f6b, emissive:0x0d3a38, emissiveIntensity:0.5, metalness:0.6, roughness:0.4}));
  tail.rotation.x = Math.PI/2; tail.position.z = -0.4; needle.add(tail);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.24,24,24),
    new THREE.MeshPhysicalMaterial({color:0x111a24, metalness:0.9, roughness:0.15, clearcoat:1}));
  needle.add(hub);
  needle.position.y = 0.3;
  rig.add(needle);

  /* --- halo shader ring --- */
  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.75,0.06,8,140),
    new THREE.ShaderMaterial({
      transparent:true, blending:THREE.AdditiveBlending, depthWrite:false,
      uniforms:{uTime:{value:0}, uProg:{value:0}},
      vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`varying vec2 vUv; uniform float uTime,uProg;
        void main(){
          float a = smoothstep(uProg, uProg-0.02, vUv.x);
          float pulse = 0.5+0.5*sin(vUv.x*40.0 - uTime*3.0);
          vec3 c = mix(vec3(0.12,0.44,0.42), vec3(0.95,0.85,0.5), pulse);
          gl_FragColor = vec4(c, a*(0.35+pulse*0.5));
        }`
    }));
  halo.rotation.x = -Math.PI/2; halo.position.y = 0.1; rig.add(halo);

  /* --- particles rising from the disc --- */
  const PN = 260;
  const pp = new Float32Array(PN*3), ps = new Float32Array(PN);
  for(let i=0;i<PN;i++){
    const a = Math.random()*Math.PI*2, r = Math.random()*2.4;
    pp[i*3]=Math.cos(a)*r; pp[i*3+1]=Math.random()*3.4; pp[i*3+2]=Math.sin(a)*r;
    ps[i]=Math.random()*6.28;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pp,3));
  pg.setAttribute('aSeed', new THREE.BufferAttribute(ps,1));
  const pmat = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{uTime:{value:0}},
    vertexShader:`attribute float aSeed; uniform float uTime; varying float vA;
      void main(){ vec3 p=position; p.y = mod(p.y + uTime*0.35 + aSeed, 3.4);
        vA = (1.0 - p.y/3.4)*0.9;
        vec4 mv = modelViewMatrix*vec4(p,1.0);
        gl_Position = projectionMatrix*mv;
        gl_PointSize = 2.6*(120.0/max(-mv.z,1.0)); }`,
    fragmentShader:`varying float vA; void main(){ vec2 c=gl_PointCoord-0.5; if(length(c)>0.5) discard;
      gl_FragColor = vec4(0.86,0.74,0.35, vA*smoothstep(0.5,0.0,length(c))); }`
  });
  rig.add(new THREE.Points(pg,pmat));

  /* --- quiz logic --- */
  const scores = {term:0,whole:0,final:0,annuity:0,mortgage:0,iul:0};
  let step = 0, targetAngle = 0, finished = false;
  const elStep = document.getElementById('quiz-step');
  const elRes = document.getElementById('quiz-result');
  const elNum = document.getElementById('qs-num');
  const elQ = document.getElementById('qs-q');
  const elOpts = document.getElementById('qs-opts');
  const elBar = document.getElementById('quiz-bar');
  const elLabel = document.getElementById('compass-label');
  let winner = 'term';

  function render(){
    const Q = QUESTIONS[step];
    elNum.textContent = `Question ${step+1} of ${QUESTIONS.length}`;
    elQ.textContent = Q.q;
    elBar.style.width = ((step)/QUESTIONS.length*100)+'%';
    elOpts.innerHTML = '';
    Q.opts.forEach((o,i)=>{
      const b = document.createElement('button');
      b.className='qopt'; b.type='button';
      b.innerHTML = `<i>${String.fromCharCode(65+i)}</i><span>${o.t}</span>`;
      b.addEventListener('click', ()=>answer(o));
      elOpts.appendChild(b);
    });
    elStep.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:450,easing:'cubic-bezier(.22,1,.36,1)'});
  }

  function answer(o){
    Object.entries(o.w).forEach(([k,v])=>scores[k]+=v);
    const lead = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
    targetAngle = (RESULTS[lead].angle*Math.PI)/180;
    elLabel.textContent = 'LEANING · '+RESULTS[lead].title.toUpperCase();
    markers.forEach(m=> m.userData.lit = m.userData.key===lead ? 1 : 0);
    step++;
    elBar.style.width = (step/QUESTIONS.length*100)+'%';
    if(step >= QUESTIONS.length) finish(lead);
    else render();
  }

  function finish(lead){
    winner = lead; finished = true;
    const R = RESULTS[lead];
    elStep.classList.add('off');
    elRes.classList.add('on');
    document.getElementById('qr-title').textContent = R.title;
    document.getElementById('qr-body').textContent = R.body;
    document.getElementById('qr-meta').innerHTML = R.meta.map(m=>`<span>${m}</span>`).join('');
    elLabel.textContent = 'MATCH · '+R.title.toUpperCase();
  }

  document.getElementById('qr-restart').addEventListener('click', ()=>{
    Object.keys(scores).forEach(k=>scores[k]=0);
    step=0; finished=false; targetAngle=0;
    markers.forEach(m=>m.userData.lit=0);
    elLabel.textContent='CALIBRATING';
    elRes.classList.remove('on'); elStep.classList.remove('off');
    render();
  });
  document.getElementById('qr-quote').addEventListener('click', ()=>{
    window.HL_setProduct && window.HL_setProduct(RESULTS[winner].prod);
  });

  render();

  let needleAng = 0, camY = 2.6, camAng = 0, camDist = 7.6, visible=false;
  new IntersectionObserver(es=>es.forEach(e=>visible=e.isIntersecting),{threshold:0}).observe(wrap);

  return {
    update(dt,t){
      /* ---- scroll cinematics: camera swings from a low raking angle to top-down ---- */
      const vp = viewportProgress(wrap);
      const co = centerOffset(wrap);
      camY    = damp(camY, lerp(1.0, 5.2, vp), 2.6, dt);
      camAng  = damp(camAng, lerp(-0.5, 0.5, vp) + co*0.18, 2.6, dt);
      camDist = damp(camDist, lerp(9.0, 6.6, Math.min(1,vp*1.4)) + Math.abs(co)*1.6, 2.6, dt);
      camera.position.set(Math.sin(camAng)*camDist, camY, Math.cos(camAng)*camDist);
      camera.lookAt(0,0.4,0);

      rig.rotation.y = Math.sin(t*0.1)*0.07 + co*0.12;

      /* needle seeks the leading answer */
      let d = targetAngle - needleAng;
      while(d > Math.PI) d -= Math.PI*2;
      while(d < -Math.PI) d += Math.PI*2;
      needleAng += d * (1 - Math.exp(-(finished?4.5:6.5)*dt));
      needle.rotation.y = needleAng + (finished ? 0 : Math.sin(t*7)*0.035);
      needle.position.y = 0.3 + Math.sin(t*1.4)*0.03;

      halo.material.uniforms.uTime.value = t;
      halo.material.uniforms.uProg.value = damp(halo.material.uniforms.uProg.value, step/QUESTIONS.length, 4, dt);
      pmat.uniforms.uTime.value = t;

      markers.forEach(m=>{
        const u = m.userData;
        u.cur = damp(u.cur ?? 0, u.lit, 5, dt);
        u.orb.material.emissiveIntensity = 0.25 + u.cur*(1.5 + Math.sin(t*3)*0.4);
        u.orb.material.color.setHex(u.cur>0.5 ? 0xe8cf72 : 0x1f6f6b);
        u.orb.scale.setScalar(1 + u.cur*0.7);
        u.post.material.opacity = 0.35 + u.cur*0.5;
        u.orb.rotation.y += dt*(0.6+u.cur*2.2);
      });

      disc.rotation.y -= dt*0.06;

      if(visible) renderer.render(scene,camera);
    },
    resize(){
      W = wrap.clientWidth; H = wrap.clientHeight;
      renderer.setSize(W,H,false);
      camera.aspect = W/H; camera.updateProjectionMatrix();
    }
  };
}