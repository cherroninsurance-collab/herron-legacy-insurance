const KB = [
  {k:['final expense','burial','funeral'], a:'Final expense is simplified-issue whole life, usually $5k–$50k, built to cover the funeral, burial, travel and small debts. No medical exam, ages 45–85, and the rate is locked at issue. Try the quoter with "Final Exp." selected.'},
  {k:['how much','coverage do i need','face amount'], a:'A solid rule of thumb: 10–12× your annual income, plus the mortgage balance, plus ~$100k per child for education. The quoter tool above lets you dial the number and see the premium move live.'},
  {k:['medical','exam','underwriting','labs'], a:'Not always. Many term and final expense products are accelerated-underwriting or no-exam — approval in 24–72 hours off your prescription and MIB history. Fully underwritten (with labs) usually gets you the lowest rate if you\'re healthy.'},
  {k:['term','how long','20 year','30 year'], a:'Term gives you the largest death benefit per dollar for a fixed window — usually matched to when your kids finish school or the mortgage ends. Most of our clients take 20 or 30 years with a conversion rider.'},
  {k:['whole life','permanent','cash value'], a:'Whole life never expires, the premium never changes, and it builds guaranteed cash value you can borrow against. It costs more per dollar of coverage than term, but it\'s an asset, not a rental.'},
  {k:['annuity','income','retirement','lump sum'], a:'An annuity converts a lump sum into guaranteed income. Fixed indexed annuities credit interest tied to an index with a 0% floor, so a down market doesn\'t cost you principal. Pick "Annuity" in the quoter to model income.'},
  {k:['iul','indexed universal'], a:'Indexed UL links crediting to an index with a 0% floor and a cap, offers flexible premiums, and allows tax-advantaged policy loans later. It\'s a strategy product — best when funded properly.'},
  {k:['mortgage'], a:'Mortgage protection is life insurance sized to your loan balance, so the house is paid off if you die. It can be level or decreasing, and we often add disability or return-of-premium.'},
  {k:['quote','price','cost','premium','how much does'], a:'Use the quoter above — pick a product, drag coverage and age, toggle health and riders, and the tower plus the monthly premium update in real time. Then hit "Lock this rate" to send it to an agent.'},
  {k:['quiz','which policy','what should i get','fit'], a:'Take the 60-second Fit Quiz — four questions and the 3D compass points at your best-matched product with a full explanation.'},
  {k:['agent','human','call','phone','talk'], a:'You can reach a licensed agent at (704) 555-0142, Mon–Sat 8a–8p ET, or drop your details in the callback form and someone responds within one business day.'},
  {k:['states','licensed','where'], a:'Herron Legacy is an independent brokerage licensed in 12 states with 38 appointed carriers, which means we shop your profile rather than sell one company\'s product.'},
  {k:['tobacco','smoke','vape','nicotine'], a:'Nicotine roughly doubles the rate on most products. Some carriers price occasional cigars or nicotine-replacement at non-tobacco rates — worth checking case by case.'},
];

const FALLBACK = 'I can help with term, whole life, final expense, annuities, mortgage protection and IUL — plus pricing, underwriting and how much coverage you actually need. Try the quoter or the fit quiz above, or ask me something more specific.';

export function initConcierge(){
  const fab = document.getElementById('cc-fab');
  const panel = document.getElementById('cc-panel');
  const log = document.getElementById('cc-log');
  const form = document.getElementById('cc-form');
  const input = document.getElementById('cc-in');
  let opened = false;

  function push(text, who){
    const d = document.createElement('div');
    d.className = 'cc-msg '+who;
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    d.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:320,easing:'ease-out'});
  }

  function answer(q){
    const s = q.toLowerCase();
    let best = null, bestScore = 0;
    for(const e of KB){
      let sc = 0;
      for(const k of e.k) if(s.includes(k)) sc += k.length;
      if(sc > bestScore){ bestScore = sc; best = e; }
    }
    return best ? best.a : FALLBACK;
  }

  function ask(q){
    push(q,'me');
    const typing = document.createElement('div');
    typing.className='cc-msg bot'; typing.textContent='…';
    log.appendChild(typing); log.scrollTop = log.scrollHeight;
    setTimeout(()=>{ typing.remove(); push(answer(q),'bot'); }, 480 + Math.random()*400);
  }

  function open(){
    panel.classList.add('on');
    if(!opened){
      opened = true;
      setTimeout(()=>push('Hi — I\'m the Legacy Concierge. Ask me about coverage types, pricing, or what fits your situation.','bot'), 260);
    }
  }
  fab.addEventListener('click', ()=> panel.classList.contains('on') ? panel.classList.remove('on') : open());
  document.getElementById('cc-close').addEventListener('click', ()=> panel.classList.remove('on'));
  document.querySelectorAll('.cc-chips button').forEach(b=>
    b.addEventListener('click', ()=>{ if(!panel.classList.contains('on')) open(); ask(b.dataset.q); }));
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const v = input.value.trim(); if(!v) return;
    input.value=''; ask(v);
  });
}