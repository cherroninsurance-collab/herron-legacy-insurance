export const PALETTE = {
  ivory:      '#F7F4EC',
  ivoryDeep:  '#EFE9DC',
  white:      '#FFFFFF',
  navy:       '#122544',
  navyMid:    '#1E3A66',
  navySoft:   '#3D5C8C',
  slate:      '#5A6A82',
  gold:       '#C8A24A',
  goldBright: '#E3C476',
  goldDeep:   '#9C7A2E',
  line:       '#DCD5C4',
  risk:       '#B4553C',
  riskSoft:   '#D08A72'
};

export const SECTION_TINTS = [
  { key: 'care',     accent: PALETTE.gold,       support: PALETTE.navyMid  },
  { key: 'paycheck', accent: PALETTE.goldDeep,   support: PALETTE.navySoft },
  { key: 'home',     accent: PALETTE.goldBright, support: PALETTE.navy     },
  { key: 'legacy',   accent: PALETTE.gold,       support: PALETTE.navyMid  }
];

export function hexToLinearArray(hex) {
  const v = hex.replace('#', '');
  return [
    parseInt(v.slice(0, 2), 16) / 255,
    parseInt(v.slice(2, 4), 16) / 255,
    parseInt(v.slice(4, 6), 16) / 255
  ];
}

export function mixHex(hexA, hexB, amount) {
  const a = hexToLinearArray(hexA);
  const b = hexToLinearArray(hexB);
  return '#' + a.map((ch, i) => {
    const c = Math.max(0, Math.min(1, ch + (b[i] - ch) * amount));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  }).join('');
}

export function withAlpha(hex, alpha) {
  const [r, g, b] = hexToLinearArray(hex).map(ch => Math.round(ch * 255));
  return `rgba(${r},${g},${b},${alpha})`;
}

export const SURFACE_FOG = { color: PALETTE.ivory, near: 12, far: 34 };