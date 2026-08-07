import * as THREE from 'https://esm.sh/three@0.160.0';
import { initBackground } from './bg.js';
import { initHero } from './hero.js';
import { initCards } from './cards.js';
import { initQuoter } from './quoter.js';
import { initQuiz } from './quiz.js';
import { initFormScene, initBrandMarks } from './misc.js';
import { initConcierge } from './concierge.js';
import { scrollState } from './scroll.js';

const clock = new THREE.Clock();
const systems = [];

function register(sys){ if(sys) systems.push(sys); }

register(initBackground());
register(initHero());
register(initCards());
register(initQuoter());
register(initQuiz());
register(initFormScene());
register(initBrandMarks());

initConcierge();

/* ---------- master loop ---------- */
function loop(){
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  scrollState.update();
  for(const s of systems) s.update(dt, t);
  requestAnimationFrame(loop);
}
loop();

window.addEventListener('resize', ()=>{ for(const s of systems) s.resize && s.resize(); });

/* ---------- nav ---------- */
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
burger.addEventListener('click', ()=> document.querySelector('.nav-links').classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.nav-links').classList.remove('open')));
window.addEventListener('scroll', ()=> nav.classList.toggle('solid', window.scrollY > 40), {passive:true});

/* ---------- reveal on scroll ---------- */
const rvTargets = document.querySelectorAll('.sec-head, .tcard, .quoter-panel, .quoter-viz, .quiz-panel, .quiz-viz, .proc, .contact-inner, .foot-top');
rvTargets.forEach(el=>el.classList.add('rv'));
const io = new IntersectionObserver((es)=>{
  es.forEach((e,i)=>{ if(e.isIntersecting){ setTimeout(()=>e.target.classList.add('in'), i*70); io.unobserve(e.target);} });
},{threshold:.12});
rvTargets.forEach(el=>io.observe(el));

/* ---------- stat counters ---------- */
const counters = document.querySelectorAll('[data-count]');
const cio = new IntersectionObserver(es=>{
  es.forEach(e=>{
    if(!e.isIntersecting) return;
    const el = e.target, target = +el.dataset.count; let v = 0;
    const step = ()=>{ v += target/48; if(v<target){ el.textContent = Math.floor(v).toLocaleString(); requestAnimationFrame(step);} else el.textContent = target.toLocaleString()+(target>1000?'+':''); };
    step(); cio.unobserve(el);
  });
},{threshold:.5});
counters.forEach(c=>cio.observe(c));

/* ---------- contact form ---------- */
const cform = document.getElementById('cform');
const fields = [
  ['f-name', v=>v.trim().length>1, 'Please enter your name'],
  ['f-email', v=>/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v), 'Enter a valid email'],
  ['f-phone', v=>v.replace(/\D/g,'').length>=10, 'Enter a 10-digit phone'],
  ['f-int', v=>!!v, 'Pick a coverage type'],
];
cform.addEventListener('submit', e=>{
  e.preventDefault();
  let ok = true;
  fields.forEach(([id,test,msg])=>{
    const el = document.getElementById(id), wrap = el.closest('.cf-field');
    const good = test(el.value);
    wrap.classList.toggle('bad', !good);
    wrap.querySelector('em').textContent = msg;
    if(!good) ok = false;
  });
  if(!ok) return;
  document.getElementById('cf-ok').classList.add('on');
  document.getElementById('cf-submit').textContent = 'Sent ✓';
  setTimeout(()=>{
    cform.reset();
    document.getElementById('cf-ok').classList.remove('on');
    document.getElementById('cf-submit').textContent = 'Send request';
  }, 4200);
});
fields.forEach(([id])=>{
  const el = document.getElementById(id);
  el.addEventListener('input', ()=> el.closest('.cf-field').classList.remove('bad'));
});