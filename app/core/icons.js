// SVG Icon library — consistent 20x20 viewBox, 1.8px stroke, round caps/joins
// Usage: icons.dashboard, icons.plus, etc. Returns SVG markup strings.

const s = 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const s15 = 'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
const svg = (inner, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

export const icons = {

  // ── Navigation ──────────────────────────────────────────────────────────

  dashboard: svg(`<rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="11" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity=".5"/><rect x="2" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity=".5"/><rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity=".3"/>`),

  procurement: svg(`<path d="M4 5h12M4 10h9M4 15h10" ${s}/>`),

  schedule: svg(`<rect x="3" y="4" width="14" height="13" rx="2" ${s}/><path d="M3 8h14" ${s}/><path d="M7 2v4M13 2v4" ${s}/>`),

  invoicing: svg(`<path d="M4 2h9l4 4v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" ${s}/><path d="M13 2v4h4" ${s}/><path d="M7 10h6M7 13h4" ${s}/>`),

  suppliers: svg(`<circle cx="10" cy="7" r="3" ${s}/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" ${s}/>`),

  moodboard: svg(`<rect x="2" y="2" width="16" height="16" rx="2" ${s}/><path d="M2 13l5-5 3 3 2-2 6 6" ${s}/><circle cx="14" cy="6" r="2" fill="currentColor" opacity=".4"/>`),

  floorplan: svg(`<rect x="2" y="2" width="16" height="16" rx="1" ${s}/><path d="M10 2v16M2 10h8" ${s}/>`),

  clientPortal: svg(`<rect x="3" y="4" width="14" height="12" rx="2" ${s}/><path d="M7 8h6M7 11h4" ${s}/>`),

  ai: svg(`<path d="M10 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" ${s}/>`),

  presentations: svg(`<rect x="2" y="3" width="16" height="11" rx="2" ${s}/><path d="M10 14v4M7 18h6" ${s}/>`),

  settings: svg(`<circle cx="10" cy="10" r="3" ${s}/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4" ${s}/>`),

  // ── Actions ─────────────────────────────────────────────────────────────

  plus: svg(`<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),

  search: svg(`<circle cx="9" cy="9" r="5" ${s}/><path d="M13 13l4 4" ${s}/>`),

  bell: svg(`<path d="M10 2a5 5 0 0 0-5 5c0 4-2 5-2 5h14s-2-1-2-5a5 5 0 0 0-5-5z" ${s}/><path d="M8.5 15a2 2 0 0 0 3 0" ${s}/>`),

  close: svg(`<path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),

  edit: svg(`<path d="M12 3l3 3L7 14H4v-3z" ${s}/><path d="M10 5l3 3" ${s}/>`),

  trash: svg(`<path d="M4 5h12M6 5V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" ${s}/><path d="M5 5l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" ${s}/><path d="M8 8v6M12 8v6" ${s}/>`),

  check: svg(`<path d="M4 10l4 4 8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`),

  upload: svg(`<path d="M10 14V4M6 8l4-4 4 4" ${s}/><path d="M3 14v3h14v-3" ${s}/>`),

  send: svg(`<path d="M18 2L9 11M18 2l-5 16-4-7-7-4z" ${s}/>`),

  printer: svg(`<path d="M5 7V2h10v5" ${s}/><rect x="3" y="7" width="14" height="7" rx="1" ${s}/><path d="M5 11v6h10v-6" ${s}/><path d="M7 14h6" ${s}/>`),

  reset: svg(`<path d="M4 10a6 6 0 1 1 1.8 4.2" ${s}/><path d="M4 14V10h4" ${s}/>`),

  save: svg(`<path d="M5 2h8l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" ${s}/><path d="M7 2v5h6V2" ${s}/><rect x="6" y="12" width="8" height="4" rx="1" ${s}/>`),

  download: svg(`<path d="M10 3v10M6 9l4 4 4-4" ${s}/><path d="M3 14v3h14v-3" ${s}/>`),

  copy: svg(`<rect x="6" y="6" width="11" height="11" rx="1.5" ${s}/><path d="M6 14H4.5A1.5 1.5 0 0 1 3 12.5v-9A1.5 1.5 0 0 1 4.5 2h9A1.5 1.5 0 0 1 15 3.5V6" ${s}/>`),

  export: svg(`<path d="M12 3h5v14H3V3h5" ${s}/><path d="M10 2v9M7 8l3 3 3-3" ${s}/>`),

  import: svg(`<path d="M12 3h5v14H3V3h5" ${s}/><path d="M10 11V2M7 5l3-3 3 3" ${s}/>`),

  duplicate: svg(`<rect x="2" y="5" width="11" height="13" rx="1.5" ${s}/><path d="M7 5V3.5A1.5 1.5 0 0 1 8.5 2h8A1.5 1.5 0 0 1 18 3.5v10a1.5 1.5 0 0 1-1.5 1.5H13" ${s}/>`),

  filter: svg(`<path d="M2 3h16l-6 7v5l-4 2v-7z" ${s}/>`),

  sort: svg(`<path d="M6 4v12M3 13l3 3 3-3M14 16V4M11 7l3-3 3 3" ${s}/>`),

  refresh: svg(`<path d="M16 10a6 6 0 1 1-1.8-4.2" ${s}/><path d="M16 2v4h-4" ${s}/>`),

  undo: svg(`<path d="M4 8h9a4 4 0 0 1 0 8H9" ${s}/><path d="M7 5L4 8l3 3" ${s}/>`),

  redo: svg(`<path d="M16 8H7a4 4 0 0 0 0 8h4" ${s}/><path d="M13 5l3 3-3 3" ${s}/>`),

  expand: svg(`<path d="M3 11v6h6M17 9V3h-6" ${s}/><path d="M3 17L9 11M17 3l-6 6" ${s}/>`),

  collapse: svg(`<path d="M9 17v-6H3M11 3v6h6" ${s}/><path d="M3 17l6-6M17 3l-6 6" ${s}/>`),

  fullscreen: svg(`<path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" ${s}/>`),

  exitFullscreen: svg(`<path d="M7 3v4H3M13 7h4V3M17 13h-4v4M3 13h4v4" ${s}/>`),

  // ── UI Elements ─────────────────────────────────────────────────────────

  chevronDown: svg(`<path d="M5 8l5 5 5-5" ${s}/>`),

  chevronRight: svg(`<path d="M8 5l5 5-5 5" ${s}/>`),

  chevronLeft: svg(`<path d="M12 5l-5 5 5 5" ${s}/>`),

  chevronUp: svg(`<path d="M5 12l5-5 5 5" ${s}/>`),

  grip: svg(`<circle cx="7" cy="5" r="1.3" fill="currentColor"/><circle cx="13" cy="5" r="1.3" fill="currentColor"/><circle cx="7" cy="10" r="1.3" fill="currentColor"/><circle cx="13" cy="10" r="1.3" fill="currentColor"/><circle cx="7" cy="15" r="1.3" fill="currentColor"/><circle cx="13" cy="15" r="1.3" fill="currentColor"/>`),

  eye: svg(`<path d="M2 10s3.5-6 8-6 8 6 8 6-3.5 6-8 6-8-6-8-6z" ${s}/><circle cx="10" cy="10" r="3" ${s}/>`),

  eyeOff: svg(`<path d="M2 2l16 16" ${s}/><path d="M6.7 6.7C4.8 8 3 10 3 10s3.5 6 7 6c1.5 0 2.9-.6 4-1.5" ${s}/><path d="M10 4c4.5 0 8 6 8 6s-1.2 2.1-3.3 3.7" ${s}/>`),

  link: svg(`<path d="M8 12l4-4" ${s}/><path d="M6 9L4 11a3.5 3.5 0 0 0 5 5l2-2" ${s}/><path d="M14 11l2-2a3.5 3.5 0 0 0-5-5l-2 2" ${s}/>`),

  unlink: svg(`<path d="M6 9L4 11a3.5 3.5 0 0 0 5 5l2-2" ${s}/><path d="M14 11l2-2a3.5 3.5 0 0 0-5-5l-2 2" ${s}/><path d="M3 3l3 3M14 14l3 3" ${s}/>`),

  lock: svg(`<rect x="5" y="9" width="10" height="9" rx="2" ${s}/><path d="M7 9V6a3 3 0 0 1 6 0v3" ${s}/><circle cx="10" cy="14" r="1" fill="currentColor"/>`),

  unlock: svg(`<rect x="5" y="9" width="10" height="9" rx="2" ${s}/><path d="M7 9V6a3 3 0 0 1 6 0" ${s}/><circle cx="10" cy="14" r="1" fill="currentColor"/>`),

  info: svg(`<circle cx="10" cy="10" r="8" ${s}/><path d="M10 9v5" ${s}/><circle cx="10" cy="6.5" r="0.8" fill="currentColor"/>`),

  warning: svg(`<path d="M10 3L2 17h16z" ${s}/><path d="M10 8v4" ${s}/><circle cx="10" cy="14.5" r="0.8" fill="currentColor"/>`),

  errorIcon: svg(`<circle cx="10" cy="10" r="8" ${s}/><path d="M7 7l6 6M13 7l-6 6" ${s}/>`),

  success: svg(`<circle cx="10" cy="10" r="8" ${s}/><path d="M6 10l3 3 5-6" ${s}/>`),

  help: svg(`<circle cx="10" cy="10" r="8" ${s}/><path d="M7.5 7.5a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2.5 2-2.5 3" ${s}/><circle cx="10" cy="15" r="0.8" fill="currentColor"/>`),

  menu: svg(`<path d="M3 5h14M3 10h14M3 15h14" ${s}/>`),

  moreHorizontal: svg(`<circle cx="5" cy="10" r="1.5" fill="currentColor"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/>`),

  moreVertical: svg(`<circle cx="10" cy="5" r="1.5" fill="currentColor"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/><circle cx="10" cy="15" r="1.5" fill="currentColor"/>`),

  // ── Objects ─────────────────────────────────────────────────────────────

  star: svg(`<path d="M10 2l2.5 5h5.5l-4 3.5 1.5 5.5-5.5-3-5.5 3 1.5-5.5L2 7h5.5z" fill="currentColor"/>`),

  starEmpty: svg(`<path d="M10 2l2.5 5h5.5l-4 3.5 1.5 5.5-5.5-3-5.5 3 1.5-5.5L2 7h5.5z" ${s}/>`),

  starHalf: svg(`<path d="M10 2l2.5 5h5.5l-4 3.5 1.5 5.5-5.5-3-5.5 3 1.5-5.5L2 7h5.5z" ${s}/><path d="M10 2v11.5l-5.5 3 1.5-5.5L2 7h5.5z" fill="currentColor"/>`),

  palette: svg(`<path d="M10 2a8 8 0 0 0 0 16c1 0 2-.8 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1 .8-1.5 1.5-1.5H14a4 4 0 0 0 4-4c0-4-3.6-8-8-8z" ${s}/><circle cx="7" cy="8" r="1.3" fill="currentColor"/><circle cx="10" cy="6" r="1.3" fill="currentColor"/><circle cx="13" cy="8" r="1.3" fill="currentColor"/><circle cx="7.5" cy="12" r="1.3" fill="currentColor"/>`),

  text: svg(`<path d="M4 4h12M10 4v12M7 16h6" ${s}/>`),

  grid: svg(`<rect x="2" y="2" width="16" height="16" rx="1" ${s}/><path d="M2 7.3h16M2 12.7h16M7.3 2v16M12.7 2v16" stroke="currentColor" stroke-width="1" opacity=".4"/>`),

  wall: svg(`<rect x="2" y="3" width="16" height="14" ${s}/><path d="M2 10h16M10 3v7M6 10v7M14 10v7" stroke="currentColor" stroke-width="1.5"/>`),

  door: svg(`<rect x="5" y="2" width="10" height="16" rx="1" ${s}/><circle cx="13" cy="10" r="1" fill="currentColor"/>`),

  windowIcon: svg(`<rect x="3" y="4" width="14" height="12" rx="1" ${s}/><path d="M10 4v12M3 10h14" stroke="currentColor" stroke-width="1.5"/>`),
  // Alias — "window" shadows the global but is valid as a property key
  window: svg(`<rect x="3" y="4" width="14" height="12" rx="1" ${s}/><path d="M10 4v12M3 10h14" stroke="currentColor" stroke-width="1.5"/>`),

  cursor: svg(`<path d="M5 3l2 14 3-5 6-2z" fill="currentColor"/>`),

  image: svg(`<rect x="2" y="3" width="16" height="14" rx="2" ${s}/><circle cx="7" cy="8" r="2" ${s}/><path d="M18 13l-4-4-3 3-2-2L2 17" ${s}/>`),

  color: svg(`<circle cx="10" cy="10" r="7" ${s}/><circle cx="10" cy="10" r="3" fill="currentColor" opacity=".3"/>`),

  shape: svg(`<rect x="3" y="3" width="14" height="14" rx="2" ${s}/>`),

  ruler: svg(`<path d="M3 10l7-7 7 7-7 7z" ${s}/><path d="M7.5 7.5l2 2M10 5l2 2M5 10l2 2" ${s}/>`),

  zoomIn: svg(`<circle cx="9" cy="9" r="6" ${s}/><path d="M14 14l4 4" ${s}/><path d="M7 9h4M9 7v4" ${s}/>`),

  zoomOut: svg(`<circle cx="9" cy="9" r="6" ${s}/><path d="M14 14l4 4" ${s}/><path d="M7 9h4" ${s}/>`),

  // ── People ──────────────────────────────────────────────────────────────

  user: svg(`<circle cx="10" cy="7" r="4" ${s}/><path d="M3 18c0-3.9 3.1-7 7-7s7 3.1 7 7" ${s}/>`),

  users: svg(`<circle cx="8" cy="7" r="3" ${s}/><path d="M2 17c0-3 2.5-5.5 6-5.5s6 2.5 6 5.5" ${s}/><circle cx="15" cy="7" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M18 17c0-2.2-1.5-4-3.5-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),

  client: svg(`<circle cx="10" cy="6" r="3" ${s}/><path d="M4 18v-1c0-3.3 2.7-6 6-6s6 2.7 6 6v1" ${s}/><path d="M4 18h12" ${s}/>`),

  contractor: svg(`<circle cx="10" cy="7" r="3" ${s}/><path d="M4 18c0-3.3 2.7-6 6-6s6 2.7 6 6" ${s}/><path d="M6 3l4 2 4-2" ${s}/>`),

  // ── Finance ─────────────────────────────────────────────────────────────

  pound: svg(`<path d="M14 17H6c0-3 2-4 2-7a3.5 3.5 0 0 1 6.5-1.5" ${s}/><path d="M5 11h7" ${s}/>`),

  invoice: svg(`<path d="M4 2h9l4 4v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" ${s}/><path d="M13 2v4h4" ${s}/><path d="M7 10h6M7 13h4" ${s}/>`),

  receipt: svg(`<path d="M5 2h10a1 1 0 0 1 1 1v15l-2.5-1.5L11 18l-2.5-1.5L6 18l-2-1.5V3a1 1 0 0 1 1-1z" ${s}/><path d="M7 7h6M7 10h4" ${s}/>`),

  creditNote: svg(`<path d="M4 2h9l4 4v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" ${s}/><path d="M13 2v4h4" ${s}/><path d="M7 11h6" ${s}/>`),

  bank: svg(`<path d="M3 17h14M3 8h14M10 3l7 5H3z" ${s}/><path d="M5 8v9M9 8v9M11 8v9M15 8v9" ${s}/>`),

  payment: svg(`<rect x="2" y="5" width="16" height="11" rx="2" ${s}/><path d="M2 9h16" ${s}/><path d="M6 13h3" ${s}/>`),

  // ── Status ──────────────────────────────────────────────────────────────

  clock: svg(`<circle cx="10" cy="10" r="8" ${s}/><path d="M10 5v5l3 3" ${s}/>`),

  calendar: svg(`<rect x="3" y="4" width="14" height="13" rx="2" ${s}/><path d="M3 8h14" ${s}/><path d="M7 2v4M13 2v4" ${s}/>`),

  milestone: svg(`<path d="M5 2v16" ${s}/><path d="M5 5h8l3 3-3 3H5" ${s}/>`),

  flag: svg(`<path d="M4 2v16" ${s}/><path d="M4 3h11l-3 4 3 4H4" ${s}/>`),

  pin: svg(`<path d="M10 18v-5" ${s}/><circle cx="10" cy="8" r="5" ${s}/><circle cx="10" cy="8" r="1.5" fill="currentColor"/>`),

  tag: svg(`<path d="M3 10.5V4a1 1 0 0 1 1-1h6.5l7 7-7 7z" ${s}/><circle cx="7" cy="7" r="1.3" fill="currentColor"/>`),

  archive: svg(`<rect x="2" y="3" width="16" height="4" rx="1" ${s}/><path d="M3 7v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7" ${s}/><path d="M8 11h4" ${s}/>`),

  // ── Arrows ──────────────────────────────────────────────────────────────

  arrowUp: svg(`<path d="M10 17V3M5 8l5-5 5 5" ${s}/>`),

  arrowDown: svg(`<path d="M10 3v14M5 12l5 5 5-5" ${s}/>`),

  arrowLeft: svg(`<path d="M17 10H3M8 5L3 10l5 5" ${s}/>`),

  arrowRight: svg(`<path d="M3 10h14M12 5l5 5-5 5" ${s}/>`),

  externalLink: svg(`<path d="M11 3h6v6" ${s}/><path d="M17 3L9 11" ${s}/><path d="M14 10v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" ${s}/>`),

  back: svg(`<path d="M15 10H5M9 6l-4 4 4 4" ${s}/>`),

  forward: svg(`<path d="M5 10h10M11 6l4 4-4 4" ${s}/>`),
};
