import * as THREE from 'https://esm.sh/three@0.160.0';
import { scrollState, pointer, damp } from './scroll.js';

export function initBackground(){
  const canvas = document.getElementById('bg-canvas');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:false, alpha:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setSize(innerWidth, innerHeight, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 120);
  camera.position.set(0,0,26);

  /* --- gold particle field --- */
  const COUNT = 1500;
  const pos = new Float32Array(COUNT*3);
  const seed = new Float32Array(COUNT);
  const sz = new Float32Array(COUNT);
  for(let i=0;i<COUNT;i++){
    pos[i*3]   = (Math.random()-0.5)*70;
    pos[i*3+1] = (Math.random()-0.5)*120;
    pos[i*3+2] = (Math.random()-0.5)*34 - 6;
    seed[i] = Math.random()*Math.PI*2;
    sz[i] = 0.6 + Math.random()*2.2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed,1));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz,1));

  const mat = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{ uTime:{value:0}, uScroll:{value:0}, uBoost:{value:0} },
    vertexShader:`
      attribute float aSeed; attribute float aSize;
      uniform float uTime, uScroll, uBoost;
      varying float vA;
      void main(){
        vec3 p = position;
        p.y += sin(uTime*0.25 + aSeed)*1.4;
        p.x += cos(uTime*0.18 + aSeed*1.7)*1.1;
        p.y = mod(p.y + uScroll*0.012 + 60.0, 120.0) - 60.0;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        float d = -mv.z;
        vA = smoothstep(60.0, 6.0, d) * (0.35 + 0.65*abs(sin(uTime*0.7 + aSeed)));
        vA *= 1.0 + uBoost*1.6;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * (300.0/max(d,1.0)) * (1.0 + uBoost*0.8);
      }`,
    fragmentShader:`
      varying float vA;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c);
        if(r>0.5) discard;
        float a = smoothstep(0.5,0.0,r)*vA;
        vec3 col = mix(vec3(0.79,0.64,0.16), vec3(1.0,0.94,0.72), smoothstep(0.3,0.0,r));
        gl_FragColor = vec4(col, a*0.85);
      }`
  });
  const points = new THREE.Points(g, mat);
  scene.add(points);

  /* --- faint wire grid that tilts with scroll --- */
  const grid = new THREE.Group();
  const gm = new THREE.LineBasicMaterial({color:0x1f6f6b, transparent:true, opacity:0.13});
  for(let i=-10;i<=10;i++){
    const a = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i*4,-40,-16), new THREE.Vector3(i*4,40,-16)]);
    const b = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-40,i*4,-16), new THREE.Vector3(40,i*4,-16)]);
    grid.add(new THREE.Line(a,gm), new THREE.Line(b,gm));
  }
  scene.add(grid);

  let camX=0, camY=0;

  return {
    update(dt,t){
      mat.uniforms.uTime.value = t;
      mat.uniforms.uScroll.value = scrollState.smooth;
      /* scroll velocity gives a subtle "warp" pulse to the field */
      const boost = Math.min(1, Math.abs(scrollState.vel)/60);
      mat.uniforms.uBoost.value = damp(mat.uniforms.uBoost.value, boost, 6, dt);

      camX = damp(camX, pointer.nx*2.2, 2.4, dt);
      camY = damp(camY, pointer.ny*1.6, 2.4, dt);
      camera.position.x = camX;
      camera.position.y = camY;
      /* dolly out slightly as the page progresses */
      camera.position.z = 26 + scrollState.progress*7;
      camera.lookAt(0, camY*0.3, -6);

      grid.rotation.x = scrollState.progress*0.5 - 0.1;
      grid.rotation.z = Math.sin(t*0.05)*0.05 + scrollState.progress*0.25;
      points.rotation.z = scrollState.progress*0.2;

      renderer.render(scene,camera);
    },
    resize(){
      renderer.setSize(innerWidth, innerHeight, false);
      camera.aspect = innerWidth/innerHeight;
      camera.updateProjectionMatrix();
    }
  };
}