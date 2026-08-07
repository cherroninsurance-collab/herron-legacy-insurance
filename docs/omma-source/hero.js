import * as THREE from 'https://esm.sh/three@0.160.0';
import { viewportProgress, centerOffset, damp, lerp, clamp, scrollState } from './scroll.js';

export function initHero(){
  const canvas = document.getElementById('hero-canvas');
  const stage = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const size = ()=>({w:stage.clientWidth, h:stage.clientHeight});
  let s = size();
  renderer.setSize(s.w, s.h, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, s.w/s.h, 0.1, 100);
  camera.position.set(0,0,9);

  const root = new THREE.Group();
  scene.add(root);

  /* --- crystal core --- */
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.35, 1),
    new THREE.MeshPhysicalMaterial({
      color:0x0f1620, roughness:0.18, metalness:0.35, transparent:true, opacity:0.92,
      emissive:0xc9a227, emissiveIntensity:0.16, flatShading:true, clearcoat:1
    })
  );
  root.add(core);

  const coreWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.37,1)),
    new THREE.LineBasicMaterial({color:0xe8cf72, transparent:true, opacity:0.55})
  );
  root.add(coreWire);

  /* --- concentric rings --- */
  const rings = [];
  const ringSpecs = [
    {r:2.2, tube:0.022, col:0xc9a227, op:0.85, tilt:[0.4,0,0.2]},
    {r:2.9, tube:0.014, col:0x1f6f6b, op:0.9,  tilt:[-0.9,0.4,0]},
    {r:3.5, tube:0.01,  col:0xe8cf72, op:0.5,  tilt:[1.2,0.2,0.5]},
  ];
  ringSpecs.forEach((sp,i)=>{
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(sp.r, sp.tube, 8, 160),
      new THREE.MeshBasicMaterial({color:sp.col, transparent:true, opacity:sp.op})
    );
    m.rotation.set(...sp.tilt);
    m.userData.spd = 0.12 + i*0.07;
    rings.push(m); root.add(m);
  });

  /* --- orbiting nodes (each = a product) --- */
  const nodes = new THREE.Group();
  const NODE_N = 7;
  for(let i=0;i<NODE_N;i++){
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.13,0),
      new THREE.MeshStandardMaterial({color:0xe8cf72, emissive:0xc9a227, emissiveIntensity:0.9, roughness:0.3, metalness:0.6})
    );
    const a = (i/NODE_N)*Math.PI*2;
    m.userData = {a, rad:2.2 + (i%3)*0.65, yamp:0.5 + (i%4)*0.28, spd:0.35 + (i%3)*0.16};
    nodes.add(m);
  }
  root.add(nodes);

  /* --- shield halo (shader) --- */
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(4.1, 48, 48),
    new THREE.ShaderMaterial({
      transparent:true, side:THREE.BackSide, depthWrite:false, blending:THREE.AdditiveBlending,
      uniforms:{uTime:{value:0}, uPulse:{value:0}},
      vertexShader:`varying vec3 vN; varying vec3 vP;
        void main(){ vN=normalize(normalMatrix*normal); vP=position;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`varying vec3 vN; varying vec3 vP; uniform float uTime, uPulse;
        void main(){
          float fres = pow(1.0-abs(dot(vN, vec3(0.0,0.0,1.0))), 2.4);
          float bands = sin(vP.y*3.0 - uTime*1.2)*0.5+0.5;
          float a = fres*(0.10 + bands*0.10) + uPulse*fres*0.35;
          gl_FragColor = vec4(mix(vec3(0.12,0.44,0.42), vec3(0.91,0.81,0.45), bands), a);
        }`
    })
  );
  root.add(halo);

  /* --- base plate rings on the floor --- */
  const plate = new THREE.Group();
  for(let i=0;i<3;i++){
    const r = new THREE.Mesh(
      new THREE.RingGeometry(1.6+i*0.55, 1.63+i*0.55, 96),
      new THREE.MeshBasicMaterial({color:0xc9a227, transparent:true, opacity:0.16-i*0.04, side:THREE.DoubleSide})
    );
    r.rotation.x = -Math.PI/2;
    plate.add(r);
  }
  plate.position.y = -2.5;
  root.add(plate);

  /* --- lights --- */
  scene.add(new THREE.AmbientLight(0x557088, 0.7));
  const key = new THREE.DirectionalLight(0xffe9b0, 2.0); key.position.set(4,5,6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x2fa39c, 1.4); rim.position.set(-5,-2,-4); scene.add(rim);
  const pt = new THREE.PointLight(0xc9a227, 2.2, 14); scene.add(pt);

  /* --- drag interaction --- */
  let drag=false, px=0, py=0, velX=0, velY=0, rotX=0, rotY=0;
  canvas.addEventListener('pointerdown', e=>{drag=true; px=e.clientX; py=e.clientY; canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointerup', ()=>drag=false);
  canvas.addEventListener('pointercancel', ()=>drag=false);
  canvas.addEventListener('pointermove', e=>{
    if(!drag) return;
    velY += (e.clientX-px)*0.006;
    velX += (e.clientY-py)*0.006;
    px=e.clientX; py=e.clientY;
  });
  let hover=0;
  canvas.addEventListener('pointerenter',()=>hover=1);
  canvas.addEventListener('pointerleave',()=>hover=0);

  /* --- scroll-driven camera rig --- */
  let camDist=9, camYOff=0, camTilt=0, hoverAmt=0;

  return {
    update(dt,t){
      /* ---- scroll cinematics ---- */
      const vp = viewportProgress(stage);          /* 0..1 through viewport */
      const co = centerOffset(stage);              /* -1..1, 0 = centered */
      const exiting = clamp((vp-0.5)*2, 0, 1);     /* 0 while entering, 1 once past centre */

      /* camera orbits + pulls back as the hero scrolls away */
      const tgtDist = lerp(8.2, 13.5, exiting);
      const tgtY    = lerp(0, 1.5, exiting) + co*0.6;
      const tgtTilt = co*0.32;
      camDist = damp(camDist, tgtDist, 3.2, dt);
      camYOff = damp(camYOff, tgtY, 3.0, dt);
      camTilt = damp(camTilt, tgtTilt, 3.0, dt);

      const orbit = vp*1.15 - 0.35;                /* the actual scroll "orbit" */
      camera.position.x = Math.sin(orbit)*camDist*0.42;
      camera.position.z = Math.cos(orbit)*camDist;
      camera.position.y = camYOff + Math.sin(t*0.5)*0.12;
      camera.lookAt(0, camTilt*1.6, 0);
      camera.rotation.z = camTilt*0.18;

      /* ---- inertia rotation from dragging ---- */
      rotY += velY; rotX += velX;
      velY *= 0.92; velX *= 0.92;
      rotY += dt*0.16;
      rotX = clamp(rotX, -0.9, 0.9);
      root.rotation.y = rotY;
      root.rotation.x = rotX + Math.sin(t*0.35)*0.05;

      /* ---- element animation ---- */
      hoverAmt = damp(hoverAmt, hover, 5, dt);
      const scrollPulse = Math.min(1, Math.abs(scrollState.vel)/50);
      halo.material.uniforms.uTime.value = t;
      halo.material.uniforms.uPulse.value = damp(halo.material.uniforms.uPulse.value, Math.max(hoverAmt*0.5, scrollPulse), 5, dt);

      const bounce = 1 + Math.sin(t*1.6)*0.02 + hoverAmt*0.06;
      core.scale.setScalar(bounce);
      coreWire.scale.setScalar(bounce*1.001);
      core.rotation.y = -t*0.25; core.rotation.x = t*0.13;
      coreWire.rotation.copy(core.rotation);
      core.material.emissiveIntensity = 0.14 + hoverAmt*0.3 + scrollPulse*0.25;

      rings.forEach((r,i)=>{
        r.rotation.z += dt*r.userData.spd*(1+hoverAmt);
        r.rotation.x += dt*r.userData.spd*0.32;
        r.scale.setScalar(1 + Math.sin(t*0.9 + i)*0.02 + exiting*0.06);
      });

      nodes.children.forEach((m,i)=>{
        const d = m.userData;
        d.a += dt*d.spd*(1+hoverAmt*0.8);
        m.position.set(Math.cos(d.a)*d.rad, Math.sin(d.a*1.4+i)*d.yamp, Math.sin(d.a)*d.rad);
        m.rotation.x += dt*1.7; m.rotation.y += dt*1.2;
        m.scale.setScalar(0.85 + Math.sin(t*2.4+i)*0.15 + hoverAmt*0.25);
      });

      plate.rotation.y += dt*0.1;
      plate.children.forEach((r,i)=>{ r.material.opacity = (0.16-i*0.04)*(0.5+0.5*Math.sin(t*1.1-i)) + hoverAmt*0.05; });

      pt.position.set(Math.sin(t*0.8)*3.4, Math.cos(t*0.6)*2.2, 3);
      pt.intensity = 2.0 + hoverAmt*1.6;

      /* fade the whole rig out slightly once fully scrolled past */
      root.visible = vp < 0.995;

      renderer.render(scene,camera);
    },
    resize(){
      s = size();
      renderer.setSize(s.w, s.h, false);
      camera.aspect = s.w/s.h;
      camera.updateProjectionMatrix();
    }
  };
}