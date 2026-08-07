/* ============================================================================
   HX ICONS — the brand line set
   ----------------------------------------------------------------------------
   WHY THIS EXISTS
   The tool pages used emoji as iconography: 💧 for a bucket, 🛡️ for the floor,
   🚨 for the overloan rider. Emoji are somebody else's artwork, they render as
   a different drawing on every operating system, they carry a cartoon register
   that fights everything else on a page about six-figure financial products,
   and at body-copy size they read as clutter rather than as signal. They were
   the single loudest thing making these pages look unfinished.

   These are drawn in the mark's own language: ONE stroke weight, no fills,
   round caps and joins, built on a 24-unit grid with a 2-unit margin so every
   glyph optically matches its neighbours. They inherit currentColor, so an icon
   in a gold heading is gold and the same icon in body copy is ink — one asset,
   every context.

   HOW IT WORKS
   A single <svg> sprite of <symbol>s is injected once at the top of <body>;
   every icon on the page is an 18-byte <use href="#i-name">. That means one
   copy of each path for the whole document no matter how many times it appears,
   and no network request at all.

   ADDING ONE
   Add a symbol below and reference it. Keep the 24 grid, keep the stroke on the
   group (never on the path), and draw it as a LINE — a filled glyph next to
   these reads as a different family and breaks the set.
   ========================================================================== */
(function () {
  'use strict';

  /* Each entry is just the inner geometry; stroke, caps and joins are set once
     on the parent group so every glyph is guaranteed to match. */
  var I = {
    /* --- value, money, flow ------------------------------------------- */
    droplet:   '<path d="M12 3.2c3.2 3.7 5.2 6.3 5.2 8.8a5.2 5.2 0 0 1-10.4 0c0-2.5 2-5.1 5.2-8.8Z"/>',
    bucket:    '<path d="M4.6 7h14.8l-1.6 12.2a1.6 1.6 0 0 1-1.6 1.4H7.8a1.6 1.6 0 0 1-1.6-1.4Z"/><path d="M3.4 7h17.2"/><path d="M8.4 7V5.2A1.8 1.8 0 0 1 10.2 3.4h3.6a1.8 1.8 0 0 1 1.8 1.8V7"/>',
    tap:      '<path d="M4 8.6h6.4v3.2H4z"/><path d="M10.4 10.2h4.2a2.4 2.4 0 0 1 2.4 2.4V14"/><path d="M7.2 8.6V6.2h3.2"/><path d="M17 16.4c0 1.5-.9 2.4-2 2.4s-2-.9-2-2.4 2-3.6 2-3.6 2 2.1 2 3.6Z"/>',
    barrel:    '<ellipse cx="12" cy="6.2" rx="6.4" ry="2.4"/><path d="M5.6 6.2v11.6c0 1.3 2.9 2.4 6.4 2.4s6.4-1.1 6.4-2.4V6.2"/><path d="M5.8 12.2c1.5.9 3.8 1.4 6.2 1.4s4.7-.5 6.2-1.4"/>',
    banknote:  '<rect x="2.8" y="6.4" width="18.4" height="11.2" rx="1.8"/><circle cx="12" cy="12" r="2.6"/><path d="M6.2 10v4M17.8 10v4"/>',
    card:      '<rect x="2.6" y="5.4" width="18.8" height="13.2" rx="2"/><path d="M2.6 9.8h18.8"/><path d="M6 14.6h3.6"/>',
    moneyOut:  '<rect x="2.8" y="7" width="13.4" height="9.6" rx="1.6"/><circle cx="9.5" cy="11.8" r="2"/><path d="M18.6 12h3.2M20.2 9.8 22.4 12l-2.2 2.2"/>',
    tag:       '<path d="M11.2 3.4H20a.6.6 0 0 1 .6.6v8.8a1.2 1.2 0 0 1-.35.85l-7.15 7.15a1.2 1.2 0 0 1-1.7 0l-8-8a1.2 1.2 0 0 1 0-1.7l7.15-7.15a1.2 1.2 0 0 1 .85-.35Z"/><circle cx="16.4" cy="7.6" r="1.5"/>',
    ticket:    '<path d="M3 8.2A1.6 1.6 0 0 1 4.6 6.6h14.8A1.6 1.6 0 0 1 21 8.2v2a2.2 2.2 0 0 0 0 3.6v2a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 15.8v-2a2.2 2.2 0 0 0 0-3.6Z"/><path d="M13.6 6.6v10.8"/>',

    /* --- market, direction -------------------------------------------- */
    trendUp:   '<path d="M3.4 16.8 9 11.2l3.6 3.6L20.6 6.8"/><path d="M15.6 6.8h5v5"/>',
    trendDown: '<path d="M3.4 7.2 9 12.8l3.6-3.6 8 8"/><path d="M15.6 17.2h5v-5"/>',
    bars:      '<path d="M3.4 20.6h17.2"/><rect x="5" y="12.4" width="3.4" height="5.6"/><rect x="10.3" y="8" width="3.4" height="10"/><rect x="15.6" y="14.6" width="3.4" height="3.4"/>',
    ladder:    '<path d="M7.4 3.4v17.2M16.6 3.4v17.2"/><path d="M7.4 7.6h9.2M7.4 12h9.2M7.4 16.4h9.2"/>',
    storm:     '<path d="M7.2 14.6a3.8 3.8 0 0 1 .5-7.56 5.2 5.2 0 0 1 9.9 1.34 3.4 3.4 0 0 1-.4 6.22"/><path d="m12.6 12.6-2.4 4h3.2l-2.2 3.8"/>',
    rocket:    '<path d="M12 3.2c2.9 2.2 4.6 5.4 4.6 9.1l-2 3.9h-5.2l-2-3.9c0-3.7 1.7-6.9 4.6-9.1Z"/><circle cx="12" cy="10.2" r="1.7"/><path d="M9.4 16.2 7.6 20.6l3-1.6M14.6 16.2l1.8 4.4-3-1.6"/>',
    infinity:  '<path d="M8.4 9.2a3.4 3.4 0 1 0 0 5.6c1.5-1.1 2-2.2 3.6-2.8 1.6.6 2.1 1.7 3.6 2.8a3.4 3.4 0 1 0 0-5.6C14.1 10.3 13.6 11.4 12 12c-1.6-.6-2.1-1.7-3.6-2.8Z"/>',

    /* --- protection, safety ------------------------------------------- */
    shield:    '<path d="M12 3.2 19.4 6v6c0 4.3-3 7.6-7.4 9-4.4-1.4-7.4-4.7-7.4-9V6Z"/>',
    shieldOk:  '<path d="M12 3.2 19.4 6v6c0 4.3-3 7.6-7.4 9-4.4-1.4-7.4-4.7-7.4-9V6Z"/><path d="m8.9 11.9 2.2 2.2 4-4.4"/>',
    lock:      '<rect x="4.8" y="10.4" width="14.4" height="10" rx="2"/><path d="M8.2 10.4V7.6a3.8 3.8 0 0 1 7.6 0v2.8"/><path d="M12 14.4v2.2"/>',
    key:       '<circle cx="7.6" cy="9.4" r="3.8"/><path d="m10.3 12.1 8.1 8.1M16.2 17.6l1.8-1.8M18.4 15.4l1.8-1.8"/>',
    ban:       '<circle cx="12" cy="12" r="8.6"/><path d="m6 6 12 12"/>',
    brake:     '<path d="M8.6 3.6h6.8l4.8 4.8v6.8l-4.8 4.8H8.6l-4.8-4.8V8.4Z"/><path d="M12 8.2v4.6M12 15.6v.2"/>',
    siren:     '<path d="M6.6 18.4a5.4 5.4 0 0 1 10.8 0Z"/><path d="M4.4 20.6h15.2"/><path d="M12 4.4v2.4M6.2 6.8l1.6 1.6M17.8 6.8l-1.6 1.6"/>',
    warning:   '<path d="M12 4.2 21 19.4H3Z"/><path d="M12 10.2v3.6M12 16.8v.2"/>',

    /* --- institutions, paper ------------------------------------------ */
    bank:      '<path d="M3.4 9.4 12 4.2l8.6 5.2"/><path d="M5.6 9.4v8.4M10 9.4v8.4M14 9.4v8.4M18.4 9.4v8.4"/><path d="M3.4 20.6h17.2"/>',
    scroll:    '<path d="M6.4 3.6h11.2a1.8 1.8 0 0 1 1.8 1.8v13.2a1.8 1.8 0 0 1-1.8 1.8H6.4a1.8 1.8 0 0 1-1.8-1.8V5.4a1.8 1.8 0 0 1 1.8-1.8Z"/><path d="M8.4 8h7.2M8.4 12h7.2M8.4 16h4.4"/>',
    receipt:   '<path d="M5.6 3.6h12.8v17.2l-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6-3.2-1.6Z"/><path d="M8.6 8.2h6.8M8.6 12h6.8"/>',
    clipboard: '<rect x="5.2" y="4.8" width="13.6" height="15.8" rx="1.8"/><path d="M9 4.8V3.6h6v1.2"/><path d="M8.6 10h6.8M8.6 13.8h6.8M8.6 17.2h4"/>',
    calendar:  '<rect x="3.6" y="5.6" width="16.8" height="15" rx="1.8"/><path d="M3.6 10h16.8"/><path d="M8.2 3.4v3.4M15.8 3.4v3.4"/>',
    abacus:    '<rect x="3.6" y="4.4" width="16.8" height="15.2" rx="1.6"/><path d="M3.6 9.4h16.8M3.6 14.6h16.8"/><path d="M8.4 4.4v5M14.6 9.4v5.2M10.4 14.6v5"/>',

    /* --- concepts ------------------------------------------------------ */
    bulb:      '<path d="M9 16.6a5.6 5.6 0 1 1 6 0v1.8H9Z"/><path d="M9.8 20.8h4.4"/>',
    gear:      '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M4.5 12H1.9M22.1 12h-2.6M6.7 6.7 4.9 4.9M19.1 19.1l-1.8-1.8M17.3 6.7l1.8-1.8M4.9 19.1l1.8-1.8"/>',
    swap:      '<path d="M4.2 8.4h13.2M14.2 5.2l3.2 3.2-3.2 3.2"/><path d="M19.8 15.6H6.6M9.8 12.4l-3.2 3.2 3.2 3.2"/>',
    cap:       '<path d="M3.6 8.6h16.8"/><path d="M6.2 8.6c0-3.2 2.6-5.2 5.8-5.2s5.8 2 5.8 5.2"/><path d="M4.6 12.4h14.8M6.4 16.2h11.2"/>',
    pie:       '<circle cx="12" cy="12" r="8.6"/><path d="M12 3.4V12l7.4 4.3"/>',
    target:    '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r=".9"/>',
    door:      '<path d="M6.4 3.6h11.2v17H6.4Z"/><path d="M3.6 20.6h16.8"/><circle cx="14.4" cy="12.2" r=".9"/>',
    question:  '<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.4"/><path d="M12 17.2v.2"/>',
    check:     '<path d="m4.8 12.6 4.6 4.6L19.2 7.2"/>',
    checkRing: '<circle cx="12" cy="12" r="8.6"/><path d="m8.2 12.2 2.6 2.6 5-5.4"/>',
    cross:     '<path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6"/>',
    speech:    '<path d="M20.4 12.6a7.4 7.4 0 0 1-7.4 7.4H8l-4.4 2.2 1.2-4a7.4 7.4 0 0 1 3.6-13.8h4.2a7.4 7.4 0 0 1 7.8 8.2Z"/>',
    house:     '<path d="M3.6 10.6 12 3.8l8.4 6.8"/><path d="M5.8 9v11.6h12.4V9"/><path d="M10 20.6v-6h4v6"/>',
    truck:     '<path d="M2.8 6.6h10.6v9.6H2.8Z"/><path d="M13.4 10h3.8l3 3.2v3H13.4Z"/><circle cx="7" cy="18.4" r="1.9"/><circle cx="17.2" cy="18.4" r="1.9"/>',
    node:      '<circle cx="12" cy="12" r="2.6"/><circle cx="5.2" cy="6.6" r="1.8"/><circle cx="18.8" cy="6.6" r="1.8"/><circle cx="5.2" cy="17.4" r="1.8"/><circle cx="18.8" cy="17.4" r="1.8"/><path d="m6.6 7.9 3.6 2.6M17.4 7.9l-3.6 2.6M6.6 16.1l3.6-2.6M17.4 16.1l-3.6-2.6"/>',
    mic:       '<rect x="9.2" y="3" width="5.6" height="10.4" rx="2.8"/><path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0"/><path d="M12 17.8v3.2"/>',
    speaker:   '<path d="M4.2 9.4h3.2L12 5.6v12.8L7.4 14.6H4.2Z"/><path d="M15.4 9.8a3.2 3.2 0 0 1 0 4.4"/>',
    pinch:     '<path d="M8.6 14.2 6.2 11.8M15.4 14.2l2.4-2.4"/><path d="M9.8 17.4h4.4"/><path d="M12 3.6v8"/>',
    hand:      '<path d="M8.4 11V6.4a1.6 1.6 0 0 1 3.2 0V11"/><path d="M11.6 10.6V5.2a1.6 1.6 0 0 1 3.2 0v5.4"/><path d="M14.8 11.4V7.8a1.6 1.6 0 0 1 3.2 0v6.6a6.2 6.2 0 0 1-6.2 6.2h-.8a5.4 5.4 0 0 1-5.4-5.4v-4a1.6 1.6 0 0 1 3.2 0"/>',
    bird:      '<path d="M4.2 15.4c3.4 1.8 7.6 1.4 10.2-1.2 2-2 2.6-4.8 1.6-7.2"/><path d="M16 7a2.4 2.4 0 1 1 3.4 2.2l1.8 1.4-2.6.4"/><path d="M8.6 20.4c1.6-2 2-3.6 1.8-5.4"/>'
  };

  /* every emoji that appeared in the tools, mapped to its replacement */
  var MAP = {
    '💧': 'droplet',  '🪣': 'bucket',    '🚰': 'tap',        '🛢️': 'barrel', '🛢': 'barrel',
    '💵': 'banknote', '💳': 'card',      '💸': 'moneyOut',   '🏷️': 'tag',   '🏷': 'tag',
    '🎟️': 'ticket',  '🎟': 'ticket',    '📈': 'trendUp',    '📉': 'trendDown',
    '📊': 'bars',     '🪜': 'ladder',    '⛈️': 'storm',      '⛈': 'storm',
    '🚀': 'rocket',   '♾️': 'infinity',  '♾': 'infinity',
    '🛡️': 'shield',  '🛡': 'shield',    '✅': 'shieldOk',
    '🔒': 'lock',     '🔐': 'lock',      '🔑': 'key',        '🚫': 'ban',
    '🛑': 'brake',    '🚨': 'siren',     '⚠️': 'warning',    '⚠': 'warning',
    '🏦': 'bank',     '📜': 'scroll',    '🧾': 'receipt',    '📋': 'clipboard',
    '📅': 'calendar', '🧮': 'abacus',    '💡': 'bulb',       '⚙️': 'gear', '⚙': 'gear',
    '🔁': 'swap',     '🧢': 'cap',       '🍰': 'pie',        '🎯': 'target',
    '🚪': 'door',     '❓': 'question',  '🗣️': 'speech',     '🗣': 'speech',
    '🏠': 'house',    '🚛': 'truck',     '🧠': 'node',
    '🎙': 'mic',      '🎙️': 'mic',      '🔈': 'speaker',    '🔊': 'speaker',
    '🤏': 'pinch',    '👋': 'hand',      '🕊️': 'bird',      '🕊': 'bird',
    '💪': 'trendUp',  '🙂': 'speech'
  };

  function sprite() {
    if (document.getElementById('hx-icon-sprite')) return;
    /* Stroke styling must be CSS on the INSTANCE, not attributes on the hidden
       sprite root: attributes there style the sprite (display:none), while the
       <use> shadow content inherits from the <svg class="hxi"> it lives in —
       whose UA defaults are fill:black, stroke:none. That is exactly how every
       icon renders as a solid black blob if this block is missing. */
    if (!document.getElementById('hx-icon-style')) {
      var st = document.createElement('style');
      st.id = 'hx-icon-style';
      st.textContent =
        '.hxi{fill:none;stroke:currentColor;stroke-width:1.6;' +
        'stroke-linecap:round;stroke-linejoin:round}';
      document.head.appendChild(st);
    }
    var syms = '';
    for (var k in I) {
      syms += '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + I[k] + '</symbol>';
    }
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'hx-icon-sprite';
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    /* stroke lives on the sprite root so no symbol can drift off the set */
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    svg.innerHTML = syms;
    document.body.insertBefore(svg, document.body.firstChild);
  }

  /* exposed so page code can build an icon inside a template string */
  window.hxIcon = function (name, cls) {
    return '<svg class="hxi ' + (cls || '') + '" aria-hidden="true"><use href="#i-' +
           name + '"></use></svg>';
  };
  window.hxIconFor = function (emoji) {
    var n = MAP[emoji];
    return n ? window.hxIcon(n) : '';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sprite, { once: true });
  } else {
    sprite();
  }
})();
