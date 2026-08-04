import * as THREE from 'https://esm.sh/three@0.160.0';
import { viewportProgress, centerOffset, damp, lerp, clamp } from './scroll.js';

const RATE = {
  term:     {base:0.36, label:'Level term', term:true},
  whole:    {base:1.55, label:'Whole life', term:false},
  final:    {base:2.10, label:'Final expense', term:false, maxCov:50000},
  mortgage: {base:0.52, label:'Mortgage protection', term:true},
  iul:      {base:1.28, label:'Indexed UL', term:false},
  annuity:  {base:0.0,  label:'Annuity', term:false, annuity:true}
};

export function initQuoter(){
  const wrap = document.querySelector('.quoter-viz');
  const canvas = document.getElementById('tower-canvas');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  let W = wrap.clientWidth, H = wrap.clientHeight;
  renderer.setSize(W,H,false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 100);
  camera.position.set(0,3,13);

  scene.add(new THREE.AmbientLight(0x50708a,0.75));
  const l1 = new THREE.DirectionalLight(0xffe6ae,2.1); l1.position.set(5,8,6); scene.add(l1);
  const l2 = new THREE.DirectionalLight(0x2aa39c,1.1); l2.position.set(-6,2,-5); scene.add(l2);

  const tower = new THREE.Group();
  scene.add(tower);

  /* --- 16 stacked blocks --- */
  const N = 16;
  const blocks = [];
  for(let i=0;i<N;i++){
    const g = new THREE.BoxGeometry(2.2, 0.34, 2.2);
    const m = new THREE.MeshPhysicalMaterial({
      color:0x101821, roughness:0.35, metalness:0.5, transparent:true, opacity:0.9,
      emissive:0xc9a227, emissiveIntensity:0
    });
    const mesh = new THREE.Mesh(g,m);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({color:0xc9a227, transparent:true, opacity:0.5}));
    mesh.add(edge);
    mesh.userData = {i, edge, target:0, cur:0};
    tower.add(mesh);
    blocks.push(mesh);
  }

  /* --- floating beacon --- */
  const beacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42,0),
    new THREE.MeshStandardMaterial({color:0xe8cf72, emissive:0xc9a227, emissiveIntensity:1.1, metalness:0.7, roughness:0.2})
  );
  tower.add(beacon);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06,0.28,3.4,16,1,true),
    new THREE.MeshBasicMaterial({color:0xc9a227, transparent:true, opacity:0.16, side:THREE.DoubleSide})
  );
  tower.add(beam);

  /* --- ground rings + orbiting rider satellites --- */
  const base = new THREE.Group();
  for(let i=0;i<3;i++){
    const r = new THREE.Mesh(new THREE.RingGeometry(1.9+i*0.6, 1.94+i*0.6, 96),
      new THREE.MeshBasicMaterial({color:0x1f6f6b, transparent:true, opacity:0.3-i*0.08, side:THREE.DoubleSide}));
    r.rotation.x = -Math.PI/2; base.add(r);
  }
  base.position.y = -0.4; tower.add(base);

  const sats = new THREE.Group();
  for(let i=0;i<4;i++){
    const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.16,0),
      new THREE.MeshStandardMaterial({color:0x2aa39c, emissive:0x1f6f6b, emissiveIntensity:0.7, roughness:0.3}));
    m.userData = {a:(i/4)*Math.PI*2, on:0};
    m.visible = false;
    sats.add(m);
  }
  tower.add(sats);

  /* --- state --- */
  const S = {product:'term', cov:500000, age:42, term:20, health:1, tob:1, riders:[]};

  const el = {
    cov:document.getElementById('in-cov'), age:document.getElementById('in-age'), term:document.getElementById('in-term'),
    oCov:document.getElementById('out-cov'), oAge:document.getElementById('out-age'), oTerm:document.getElementById('out-term'),
    prem:document.getElementById('ro-premium'), ann:document.getElementById('ro-annual'), note:document.getElementById('ro-note'),
    bBase:document.getElementById('bar-base'), bAge:document.getElementById('bar-age'), bRider:document.getElementById('bar-rider'),
    termRow:document.getElementById('in-term').closest('.q-row')
  };

  function pillGroup(id, cb, multi){
    const box = document.getElementById(id);
    box.addEventListener('click', e=>{
      const b = e.target.closest('.pill'); if(!b) return;
      if(multi) b.classList.toggle('active');
      else { [...box.children].forEach(c=>c.classList.remove('active')); b.classList.add('active'); }
      cb(box);
    });
  }
  pillGroup('pill-product', box=>{ S.product = box.querySelector('.active').dataset.v; sync(); });
  pillGroup('pill-health',  box=>{ S.health = +box.querySelector('.active').dataset.v; sync(); });
  pillGroup('pill-tob',     box=>{ S.tob = +box.querySelector('.active').dataset.v; sync(); });
  pillGroup('pill-riders',  box=>{ S.riders = [...box.querySelectorAll('.active')].map(b=>+b.dataset.v); sync(); }, true);

  ['cov','age','term'].forEach(k=>el[k].addEventListener('input', ()=>{ S[k] = +el[k].value; sync(); }));

  let premShown = 31, targetPrem = 31, fillTarget = 0.5;

  function calc(){
    const cfg = RATE[S.product];
    if(cfg.annuity){
      const yrs = Math.max(1, 90 - S.age);
      const monthly = (S.cov * 0.049) / 12 * (1 + (S.age-60)*0.004);
      return {annuity:true, val:Math.max(60, monthly), yrs};
    }
    const cov = Math.min(S.cov, cfg.maxCov || 3000000);
    const ageLoad = Math.pow(1.079, Math.max(0, S.age-30));
    const termFactor = cfg.term ? (1 + (S.term-10)*0.032) : 1;
    let p = (cov/1000) * cfg.base * 0.055 * ageLoad * termFactor * S.health * S.tob;
    const riderLoad = S.riders.reduce((a,b)=>a+b,0);
    p *= (1 + riderLoad);
    return {annuity:false, val:Math.max(9, p), base:cfg.base, ageLoad, riderLoad, cov};
  }

  function sync(){
    const cfg = RATE[S.product];
    el.termRow.style.display = cfg.term ? '' : 'none';
    if(cfg.maxCov){ el.cov.max = cfg.maxCov; if(S.cov>cfg.maxCov){S.cov=cfg.maxCov; el.cov.value=cfg.maxCov;} }
    else el.cov.max = 3000000;

    el.oCov.textContent = '$'+S.cov.toLocaleString();
    el.oAge.textContent = S.age;
    el.oTerm.textContent = S.term+' years';

    const r = calc();
    targetPrem = r.val;
    if(r.annuity){
      el.note.textContent = `Estimated lifetime income from a $${S.cov.toLocaleString()} premium`;
      el.ann.textContent = `≈ $${Math.round(r.val*12).toLocaleString()} paid to you each year`;
      el.bBase.style.width = '78%';
      el.bAge.style.width = clamp((S.age-40)/45,0.12,1)*100+'%';
      el.bRider.style.width = '8%';
    } else {
      el.note.textContent = `${cfg.label} · illustrative only · final rate set by underwriting`;
      el.ann.textContent = `$${Math.round(r.val*12).toLocaleString()} billed annually`;
      el.bBase.style.width = clamp(r.cov/3000000,0.08,1)*100+'%';
      el.bAge.style.width = clamp((r.ageLoad-1)/7,0.05,1)*100+'%';
      el.bRider.style.width = clamp(r.riderLoad/0.4,0.03,1)*100+'%';
    }

    /* how much of the tower lights up */
    fillTarget = cfg.annuity ? clamp(S.cov/1000000,0.15,1) : clamp(Math.min(S.cov,cfg.maxCov||3e6)/ (cfg.maxCov||1500000), 0.1, 1);
    blocks.forEach((b,i)=>{ b.userData.target = (i/N) < fillTarget ? 1 : 0; });

    sats.children.forEach((m,i)=>{ m.userData.on = S.riders.length>i ? 1 : 0; });
  }

  /* lock rate button */
  document.getElementById('lock-rate').addEventListener('click', ()=>{
    const b = document.getElementById('lock-rate');
    b.textContent = 'Rate held for 14 days ✓';
    document.getElementById('f-int').value = ({term:'Term Life',whole:'Whole Life',final:'Final Expense',annuity:'Annuities',mortgage:'Mortgage Protection',iul:'Indexed UL'})[S.product] || '';
    setTimeout(()=>{ b.textContent='Lock this rate'; }, 3500);
    document.getElementById('contact').scrollIntoView({behavior:'smooth'});
  });

  /* deep-link from cards + quiz */
  window.HL_setProduct = (p)=>{
    const box = document.getElementById('pill-product');
    const b = box.querySelector(`[data-v="${p}"]`);
    if(!b) return;
    [...box.children].forEach(c=>c.classList.remove('active'));
    b.classList.add('active'); S.product = p; sync();
    document.getElementById('quoter').scrollIntoView({behavior:'smooth'});
    b.animate([{transform:'scale(1)'},{transform:'scale(1.18)'},{transform:'scale(1)'}],{duration:600});
  };
  document.querySelectorAll('[data-quote]').forEach(btn=>
    btn.addEventListener('click', ()=> window.HL_setProduct(btn.dataset.quote)));

  sync();

  let camAng=0, camY=3, camDist=13, visible=false;
  new IntersectionObserver(es=>es.forEach(e=>visible=e.isIntersecting),{threshold:0}).observe(wrap);

  return {
    update(dt,t){
      /* ---- scroll-driven camera: rises up the tower & orbits as you scroll ---- */
      const vp = viewportProgress(wrap);
      const co = centerOffset(wrap);
      const tgtAng  = lerp(-0.55, 0.75, vp);
      const tgtY    = lerp(-1.2, 6.4, vp) + co*0.4;
      const tgtDist = lerp(15.5, 11.0, clamp(vp*1.6,0,1)) + Math.abs(co)*2.2;
      camAng  = damp(camAng, tgtAng, 3.0, dt);
      camY    = damp(camY, tgtY, 2.6, dt);
      camDist = damp(camDist, tgtDist, 2.6, dt);

      camera.position.set(Math.sin(camAng)*camDist, camY, Math.cos(camAng)*camDist);
      camera.lookAt(0, lerp(1.0, 3.2, vp), 0);

      /* ---- tower build ---- */
      let top = 0;
      blocks.forEach((b,i)=>{
        const d = b.userData;
        d.cur = damp(d.cur, d.target, 6 + i*0.25, dt);
        const y = i*0.42 + Math.sin(t*1.2 + i*0.4)*0.02*d.cur;
        b.position.y = y - 0.2;
        b.scale.set(0.35 + d.cur*0.65, 0.25 + d.cur*0.75, 0.35 + d.cur*0.65);
        b.rotation.y = (1-d.cur)*1.1 + t*0.04 + i*0.03;
        b.material.opacity = 0.18 + d.cur*0.76;
        b.material.emissiveIntensity = d.cur*(0.18 + 0.14*Math.sin(t*2 - i*0.5));
        d.edge.material.opacity = 0.12 + d.cur*0.6;
        if(d.cur > 0.5) top = y;
      });

      beacon.position.y = top + 1.05 + Math.sin(t*1.5)*0.12;
      beacon.rotation.y += dt*1.1; beacon.rotation.x += dt*0.7;
      beam.position.y = beacon.position.y - 1.9;
      beam.material.opacity = 0.10 + 0.07*Math.sin(t*2.2);
      base.rotation.y += dt*0.15;
      tower.rotation.y = Math.sin(t*0.12)*0.09;

      sats.children.forEach((m,i)=>{
        const d = m.userData;
        d.a += dt*(0.5+i*0.12);
        const lit = d.on;
        m.visible = lit > 0;
        m.position.set(Math.cos(d.a)*(2.9+i*0.22), 1.6+i*0.9+Math.sin(t+i)*0.18, Math.sin(d.a)*(2.9+i*0.22));
        m.rotation.x += dt*2; m.rotation.z += dt*1.4;
      });

      /* ---- premium counter easing ---- */
      premShown = damp(premShown, targetPrem, 7, dt);
      el.prem.textContent = Math.round(premShown).toLocaleString();

      if(visible) renderer.render(scene,camera);
    },
    resize(){
      W = wrap.clientWidth; H = wrap.clientHeight;
      renderer.setSize(W,H,false);
      camera.aspect = W/H; camera.updateProjectionMatrix();
    }
  };
}