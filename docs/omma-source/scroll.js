/* shared scroll state used by every 3D scene for scroll-driven camera moves */
export const scrollState = {
  y: 0,
  smooth: 0,
  vel: 0,
  progress: 0,
  dir: 1,
  _last: 0,
  update(){
    const y = window.scrollY || 0;
    const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
    this.dir = y > this._last ? 1 : (y < this._last ? -1 : this.dir);
    this.vel += ((y - this._last) - this.vel) * 0.18;
    this._last = y;
    this.y = y;
    this.progress = Math.min(1, y / max);
    this.smooth += (y - this.smooth) * 0.09;
  }
};

/* 0 → 1 as element travels through the viewport (0 = entering bottom, 1 = exiting top) */
export function viewportProgress(el){
  if(!el) return 0;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  return clamp((vh - r.top) / (vh + r.height), 0, 1);
}

/* -1 → 1, 0 when element is centered in viewport */
export function centerOffset(el){
  if(!el) return 0;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const c = r.top + r.height/2;
  return clamp((c - vh/2) / (vh/2 + r.height/2), -1, 1);
}

export function clamp(v,a,b){ return Math.min(b, Math.max(a, v)); }
export function lerp(a,b,t){ return a + (b-a)*t; }
export function damp(cur,tgt,lambda,dt){ return lerp(cur,tgt,1-Math.exp(-lambda*dt)); }

export const pointer = { x:0, y:0, nx:0, ny:0 };
window.addEventListener('pointermove', e=>{
  pointer.x = e.clientX; pointer.y = e.clientY;
  pointer.nx = (e.clientX/window.innerWidth)*2-1;
  pointer.ny = -((e.clientY/window.innerHeight)*2-1);
}, {passive:true});