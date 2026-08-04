import * as THREE from 'https://esm.sh/three@0.160.0';
import { viewportProgress, damp, clamp } from './scroll.js';

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime, uHover, uScroll, uVariant;
uniform vec2 uMouse;

mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
}
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5;} return v; }

void main(){
  vec2 uv = vUv;
  vec2 p = (uv-0.5)*vec2(1.6,1.0);
  float t = uTime*(0.35+uHover*0.5) + uScroll*0.6;
  float v = uVariant;
  float f = 0.0;

  if(v<0.5){
    /* 01 term: sweeping scanlines */
    float g = sin((p.y*22.0) + t*2.0 + fbm(p*3.0+t*0.2)*3.0);
    f = smoothstep(0.75,1.0,g)*0.9 + fbm(p*2.0 - t*0.1)*0.25;
  } else if(v<1.5){
    /* 02 whole: concentric growth rings */
    float r = length(p*rot(t*0.15));
    f = smoothstep(0.04,0.0,abs(sin(r*13.0 - t*1.2))*0.06) + (1.0-r)*0.18;
  } else if(v<2.5){
    /* 03 final expense: soft drifting nebula */
    f = fbm(p*2.2 + vec2(t*0.12, -t*0.07));
    f = pow(f,1.7)*1.5;
  } else if(v<3.5){
    /* 04 annuity: rising income bars */
    float col = floor((uv.x)*14.0);
    float h = 0.25+0.6*fract(sin(col*12.9898)*43758.5453);
    h *= 0.65+0.35*sin(t*1.4+col*0.8);
    f = step(uv.y, h)*(0.35+0.5*fract(sin(col)*99.0));
    f *= smoothstep(0.0,0.25,uv.y);
  } else if(v<4.5){
    /* 05 mortgage: shelter lattice */
    vec2 q = p*rot(0.5)*7.0;
    vec2 gv = abs(fract(q)-0.5);
    f = smoothstep(0.46,0.5,max(gv.x,gv.y));
    f *= 0.55+0.45*sin(length(p)*6.0 - t*1.6);
  } else {
    /* 06 IUL: index curve field */
    float y = sin(p.x*4.0 + t)*0.18 + fbm(vec2(p.x*2.0, t*0.25))*0.35;
    f = smoothstep(0.05,0.0,abs(p.y - y));
    f += smoothstep(0.09,0.0,abs(p.y - y*0.5))*0.4;
  }

  /* mouse light */
  float ml = smoothstep(0.7,0.0,length(uv-uMouse))*uHover;
  vec3 gold = vec3(0.79,0.64,0.16);
  vec3 warm = vec3(1.0,0.90,0.62);
  vec3 teal = vec3(0.10,0.42,0.40);
  vec3 col = mix(teal*0.35, gold, clamp(f,0.0,1.0));
  col = mix(col, warm, clamp(f*f*0.8 + ml*0.6, 0.0, 1.0));
  col += ml*0.22;

  float vig = smoothstep(1.25,0.25,length((uv-0.5)*2.0));
  float a = clamp(f*0.85 + ml*0.35, 0.0, 1.0)*vig*(0.55+uHover*0.45);
  gl_FragColor = vec4(col, a);
}`;

const VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);} `;

export function initCards(){
  const cards = [...document.querySelectorAll('.tcard')];
  const items = cards.map((card,idx)=>{
    const canvas = card.querySelector('.tcard-gl');
    const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:false});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const uniforms = {
      uTime:{value:Math.random()*10}, uHover:{value:0}, uScroll:{value:0},
      uVariant:{value: +card.dataset.shader}, uMouse:{value:new THREE.Vector2(0.5,0.5)}
    };
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2,2),
      new THREE.ShaderMaterial({vertexShader:VERT, fragmentShader:FRAG, uniforms, transparent:true}));
    scene.add(mesh);

    const st = {hover:0, tx:0, ty:0, rx:0, ry:0, mz:0, visible:false, idx};

    card.addEventListener('pointerenter', ()=> st.hover = 1);
    card.addEventListener('pointerleave', ()=>{
      st.hover = 0; st.tx = 0; st.ty = 0;
      card.style.setProperty('--gx','50%'); card.style.setProperty('--gy','50%');
    });
    card.addEventListener('pointermove', e=>{
      const r = card.getBoundingClientRect();
      const nx = (e.clientX - r.left)/r.width;
      const ny = (e.clientY - r.top)/r.height;
      st.tx = (ny-0.5)*-13;   /* rotateX */
      st.ty = (nx-0.5)*15;    /* rotateY */
      uniforms.uMouse.value.set(nx, 1-ny);
      card.style.setProperty('--gx', nx*100+'%');
      card.style.setProperty('--gy', ny*100+'%');
    });

    /* only render visible cards */
    new IntersectionObserver(es=>es.forEach(e=>st.visible=e.isIntersecting),{threshold:0}).observe(card);

    function resize(){
      const w = card.clientWidth, h = card.clientHeight;
      renderer.setSize(w,h,false);
    }
    resize();
    return {card, renderer, scene, camera, uniforms, st, resize};
  });

  const grid = document.getElementById('card-grid');

  return {
    update(dt,t){
      /* scroll drives a shared 3D "flip-in" on the whole grid */
      const vp = viewportProgress(grid);
      const enter = clamp((vp-0.05)/0.4, 0, 1);
      const leave = clamp((vp-0.75)/0.25, 0, 1);

      items.forEach(({card,renderer,scene,camera,uniforms,st})=>{
        uniforms.uHover.value = damp(uniforms.uHover.value, st.hover, 5, dt);
        uniforms.uScroll.value = vp;
        uniforms.uTime.value += dt;

        /* stagger per column for a cascading scroll reveal */
        const stagger = clamp(enter*1.5 - (st.idx%3)*0.16, 0, 1);
        const baseRotX = (1-stagger)*16 - leave*10;
        const baseY = (1-stagger)*38 + leave*-14;

        st.rx = damp(st.rx, st.tx, 9, dt);
        st.ry = damp(st.ry, st.ty, 9, dt);
        st.mz = damp(st.mz, st.hover*26, 7, dt);

        card.style.transform =
          `translateY(${baseY.toFixed(2)}px) rotateX(${(st.rx+baseRotX).toFixed(2)}deg) `+
          `rotateY(${st.ry.toFixed(2)}deg) translateZ(${st.mz.toFixed(2)}px) scale(${(0.96+stagger*0.04).toFixed(3)})`;
        card.style.opacity = (0.15 + stagger*0.85 - leave*0.35).toFixed(3);

        if(st.visible) renderer.render(scene,camera);
      });
    },
    resize(){ items.forEach(i=>i.resize()); }
  };
}