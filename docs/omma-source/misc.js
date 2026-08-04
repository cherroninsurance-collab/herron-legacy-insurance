import * as THREE from 'https://esm.sh/three@0.160.0';
import { viewportProgress, centerOffset, damp, lerp, pointer } from './scroll.js';

/* ---------------- contact form 3D strip ---------------- */
export function initFormScene(){
  const wrap = document.querySelector('.contact-left');
  const canvas = document.getElementById('form-canvas');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  let W = wrap.clientWidth, H = wrap.clientHeight;
  renderer.setSize(W,H,false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, W/H, 0.1, 60);
  camera.position.set(0,0,10);

  scene.add(new THREE.AmbientLight(0x4d6b85,0.9));
  const d1 = new THREE.DirectionalLight(0xffe4a8,1.8); d1.position.set(4,6,5); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0x2aa39c,1.0); d2.position.set(-5,-3,-3); scene.add(d2);

  const rig = new THREE.Group(); scene.add(rig);

  /* floating shapes */
  const geos = [
    new THREE.TorusKnotGeometry(0.6,0.19,90,14),
    new THREE.IcosahedronGeometry(0.72,0),
    new THREE.OctahedronGeometry(0.8,0),
    new THREE.TorusGeometry(0.62,0.16,14,60),
    new THREE.DodecahedronGeometry(0.7,0),
  ];
  const shapes = [];
  for(let i=0;i<9;i++){
    const g = geos[i%geos.length];
    const gold = i%3===0;
    const m = new THREE.MeshPhysicalMaterial({
      color: gold?0x1a1508:0x0c1a1a, metalness:0.75, roughness:0.28, clearcoat:1,
      emissive: gold?0xc9a227:0x1f6f6b, emissiveIntensity: gold?0.42:0.28
    });
    const mesh = new THREE.Mesh(g,m);
    mesh.userData = {
      bx:(Math.random()-0.5)*7.4, by:(Math.random()-0.5)*8.2, bz:(Math.random()-0.5)*4-1,
      sp:0.25+Math.random()*0.6, ph:Math.random()*6.28, sc:0.5+Math.random()*0.75
    };
    mesh.scale.setScalar(mesh.userData.sc);
    shapes.push(mesh); rig.add(mesh);
  }

  /* connecting wire lines */
  const lg = new THREE.BufferGeometry();
  const lpos = new Float32Array(shapes.length*2*3);
  lg.setAttribute('position', new THREE.BufferAttribute(lpos,3));
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({color:0xc9a227, transparent:true, opacity:0.18}));
  rig.add(lines);

  let visible=false, camAng=0, camY=0;
  new IntersectionObserver(es=>es.forEach(e=>visible=e.isIntersecting),{threshold:0}).observe(wrap);

  /* focus on a form field → shapes converge */
  let focusPull = 0, focusTarget = 0;
  document.querySelectorAll('.cform input, .cform select, .cform textarea').forEach(f=>{
    f.addEventListener('focus', ()=>focusTarget=1);
    f.addEventListener('blur', ()=>focusTarget=0);
  });
  document.getElementById('cform').addEventListener('submit', ()=>{ focusTarget = 1.6; setTimeout(()=>focusTarget=0, 1400); });

  return {
    update(dt,t){
      const vp = viewportProgress(wrap);
      const co = centerOffset(wrap);
      camAng = damp(camAng, lerp(-0.35,0.35,vp) + pointer.nx*0.12, 2.4, dt);
      camY   = damp(camY, lerp(-2.0, 2.0, vp)*0.5 + pointer.ny*0.5, 2.4, dt);
      const dist = lerp(12.5, 9.2, Math.min(1,vp*1.5)) + Math.abs(co)*1.4;
      camera.position.set(Math.sin(camAng)*dist, camY, Math.cos(camAng)*dist);
      camera.lookAt(0,0,0);

      focusPull = damp(focusPull, focusTarget, 3.5, dt);

      const arr = lines.geometry.attributes.position.array;
      shapes.forEach((m,i)=>{
        const u = m.userData;
        const pull = focusPull;
        const px = u.bx*(1-pull*0.65) + Math.sin(t*u.sp+u.ph)*0.5;
        const py = u.by*(1-pull*0.65) + Math.cos(t*u.sp*0.8+u.ph)*0.5 - vp*0.6;
        const pz = u.bz*(1-pull*0.5) + Math.sin(t*u.sp*0.6+u.ph)*0.35;
        m.position.set(px,py,pz);
        m.rotation.x += dt*u.sp*0.9; m.rotation.y += dt*u.sp*1.2;
        m.scale.setScalar(u.sc*(1 + pull*0.25 + Math.sin(t*1.6+u.ph)*0.04));
        m.material.emissiveIntensity = (i%3===0?0.42:0.28)*(1+pull*1.4);

        arr[i*6]=px; arr[i*6+1]=py; arr[i*6+2]=pz;
        arr[i*6+3]=0; arr[i*6+4]=0; arr[i*6+5]=0;
      });
      lines.geometry.attributes.position.needsUpdate = true;
      lines.material.opacity = 0.08 + focusPull*0.3;
      rig.rotation.z = Math.sin(t*0.09)*0.06 + co*0.08;

      if(visible) renderer.render(scene,camera);
    },
    resize(){
      W = wrap.clientWidth; H = wrap.clientHeight;
      renderer.setSize(W,H,false);
      camera.aspect = W/H; camera.updateProjectionMatrix();
    }
  };
}

/* ---------------- tiny spinning brand marks (nav + footer) ---------------- */
export function initBrandMarks(){
  const setups = ['brand-canvas','foot-canvas'].map(id=>{
    const canvas = document.getElementById(id);
    if(!canvas) return null;
    const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(44,44,false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45,1,0.1,10);
    camera.position.z = 3.1;
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.95,0),
      new THREE.MeshStandardMaterial({color:0x1a1508, emissive:0xc9a227, emissiveIntensity:0.55, metalness:0.8, roughness:0.25, flatShading:true})
    );
    scene.add(m);
    scene.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.97,0)),
      new THREE.LineBasicMaterial({color:0xe8cf72, transparent:true, opacity:0.85})
    ));
    scene.add(new THREE.AmbientLight(0xffffff,0.7));
    const dl = new THREE.DirectionalLight(0xffe4a8,2.2); dl.position.set(2,3,4); scene.add(dl);
    return {renderer, scene, camera, m};
  }).filter(Boolean);

  return {
    update(dt,t){
      setups.forEach((s,i)=>{
        s.m.rotation.y = t*(0.6+i*0.2);
        s.m.rotation.x = Math.sin(t*0.5)*0.35;
        s.scene.rotation.y = s.m.rotation.y*0;
        s.scene.children[1].rotation.copy(s.m.rotation);
        s.renderer.render(s.scene, s.camera);
      });
    },
    resize(){}
  };
}