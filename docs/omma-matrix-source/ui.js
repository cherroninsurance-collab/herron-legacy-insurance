/* Shared pointer state, tabs, steps, buckets, parallax, cursor cards */

export const ptr = { x: 0, y: 0 };

window.addEventListener('pointermove', e => {
  ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
  ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

const STEPS = [
  {
    title: 'The Bucket &amp; the Shield',
    items: [
      ['\uD83D\uDCA7', 'Your money fills a bucket.'],
      ['\uD83D\uDCC8', 'The bucket grows with the market index.'],
      ['\uD83D\uDEE1\uFE0F', 'A shield covers the bucket.'],
      ['\uD83C\uDF0A', 'Market storms cannot drain it.'],
      ['\uD83D\uDD12', 'Worst year? You earn 0%. Never negative.']
    ]
  },
  {
    title: 'The Premium Pipeline',
    items: [
      ['\uD83D\uDEB0', 'Premium flows in on a schedule you set.'],
      ['\u2699\uFE0F', 'Costs are stripped out at the intake.'],
      ['\uD83C\uDFE6', 'The remainder lands in the cash value.'],
      ['\uD83D\uDCD0', 'Max-funded means minimum death benefit, maximum cash.'],
      ['\uD83E\uDDED', 'The pipeline is tuned to stay inside the MEC limit.']
    ]
  },
  {
    title: 'The Emergency Brake',
    items: [
      ['\uD83D\uDED1', 'Life happens. The policy has a brake.'],
      ['\uD83D\uDCB5', 'Policy loans access cash without a taxable event.'],
      ['\uD83D\uDD01', 'Repay on your schedule, or not at all.'],
      ['\u2696\uFE0F', 'Loans and withdrawals reduce cash value and death benefit.'],
      ['\uD83E\uDE7A', 'Living benefit riders release funds for qualifying events.']
    ]
  }
];

export function initUI() {
  const tabs = Array.from(document.querySelectorAll('#mainTabs .tab'));
  const panels = {
    iul: document.getElementById('panel-iul'),
    annuity: document.getElementById('panel-annuity'),
    numbers: document.getElementById('panel-numbers')
  };
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(x => x.classList.toggle('is-active', x === tab));
    Object.keys(panels).forEach(k => {
      const p = panels[k];
      if (p) p.classList.toggle('is-active', k === tab.dataset.panel);
    });
    window.dispatchEvent(new CustomEvent('panelchange', { detail: tab.dataset.panel }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));

  const segs = Array.from(document.querySelectorAll('#iulSteps .seg'));
  const title = document.getElementById('stepTitle');
  const list = document.getElementById('stepList');
  segs.forEach(s => s.addEventListener('click', () => {
    segs.forEach(x => x.classList.toggle('is-active', x === s));
    const step = STEPS[Number(s.dataset.step)];
    if (!step) return;
    if (title) title.innerHTML = step.title;
    if (list) {
      list.innerHTML = step.items
        .map(pair => '<li><span class="ico">' + pair[0] + '</span> ' + pair[1] + '</li>')
        .join('');
    }
  }));

  const fillB = document.getElementById('fillB');
  const vnote = document.getElementById('vnote');
  const btn = document.getElementById('downturnBtn');
  let down = false;
  if (btn) {
    btn.addEventListener('click', () => {
      down = !down;
      if (down) {
        if (fillB) fillB.style.height = '62%';
        if (vnote) vnote.textContent = 'Index fell 38%. Your bucket credited 0% \u2014 nothing drained out.';
        btn.textContent = 'Reset the market';
      } else {
        if (fillB) fillB.style.height = '100%';
        if (vnote) vnote.textContent = 'Both buckets are full. Run the downturn to compare.';
        btn.textContent = 'Simulate a market downturn';
      }
      window.dispatchEvent(new CustomEvent('downturn', { detail: down }));
    });
  }

  /* scroll parallax */
  const pxEls = Array.from(document.querySelectorAll('[data-parallax]'));
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const sy = window.scrollY;
      pxEls.forEach(el => {
        if (!el.classList.contains('is-active')) return;
        const amt = parseFloat(el.dataset.parallax) || 0;
        const inner = el.querySelector('.card, .cards, .chartframe');
        if (inner) inner.style.transform = 'translate3d(0,' + (-sy * amt * 0.12) + 'px,0)';
      });
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* cursor-reactive product cards */
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', (px * 100) + '%');
      card.style.setProperty('--my', (py * 100) + '%');
      card.style.transform = 'perspective(1000px) rotateY(' + ((px - 0.5) * 9) +
        'deg) rotateX(' + ((0.5 - py) * 9) + 'deg) translateZ(10px)';
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}