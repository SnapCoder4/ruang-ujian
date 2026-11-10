// Ikon SVG inline (gaya garis, stroke 1.75). Bukan emoji.
const P = 'stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS = {
  logo: `<svg viewBox="0 0 24 24" class="icon"><circle cx="7" cy="8" r="2.4" ${P}/><circle cx="7" cy="16" r="2.4" fill="currentColor" stroke="none"/><path d="M13 8h6M13 16h6" ${P}/></svg>`,
  sun: `<svg viewBox="0 0 24 24" class="icon"><circle cx="12" cy="12" r="4" ${P}/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" ${P}/></svg>`,
  moon: `<svg viewBox="0 0 24 24" class="icon"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" ${P}/></svg>`,
  logout: `<svg viewBox="0 0 24 24" class="icon"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" ${P}/></svg>`,
  clock: `<svg viewBox="0 0 24 24" class="icon"><circle cx="12" cy="12" r="9" ${P}/><path d="M12 7v5l3 2" ${P}/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" class="icon"><rect x="3" y="4" width="18" height="17" rx="2" ${P}/><path d="M3 9h18M8 2v4M16 2v4" ${P}/></svg>`,
  check: `<svg viewBox="0 0 24 24" class="icon"><path d="M20 6 9 17l-5-5" ${P}/></svg>`,
  x: `<svg viewBox="0 0 24 24" class="icon"><path d="M18 6 6 18M6 6l12 12" ${P}/></svg>`,
  alert: `<svg viewBox="0 0 24 24" class="icon"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" ${P}/></svg>`,
  info: `<svg viewBox="0 0 24 24" class="icon"><circle cx="12" cy="12" r="9" ${P}/><path d="M12 11v5M12 8h.01" ${P}/></svg>`,
  edit: `<svg viewBox="0 0 24 24" class="icon"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" ${P}/></svg>`,
  trash: `<svg viewBox="0 0 24 24" class="icon"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" ${P}/></svg>`,
  plus: `<svg viewBox="0 0 24 24" class="icon"><path d="M12 5v14M5 12h14" ${P}/></svg>`,
  users: `<svg viewBox="0 0 24 24" class="icon"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" ${P}/><circle cx="9" cy="7" r="4" ${P}/><path d="M22 21v-2a4 4 0 0 0-3-3.9" ${P}/></svg>`,
  file: `<svg viewBox="0 0 24 24" class="icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" ${P}/><path d="M14 2v6h6" ${P}/></svg>`,
  shield: `<svg viewBox="0 0 24 24" class="icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" ${P}/></svg>`,
  award: `<svg viewBox="0 0 24 24" class="icon"><circle cx="12" cy="8" r="6" ${P}/><path d="M8.2 13.9 7 22l5-3 5 3-1.2-8.1" ${P}/></svg>`,
  send: `<svg viewBox="0 0 24 24" class="icon"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" ${P}/></svg>`,
  key: `<svg viewBox="0 0 24 24" class="icon"><circle cx="7.5" cy="15.5" r="4.5" ${P}/><path d="M10.5 12.5 21 2M16 7l3 3M18 5l2 2" ${P}/></svg>`,
  eye: `<svg viewBox="0 0 24 24" class="icon"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" ${P}/><circle cx="12" cy="12" r="3" ${P}/></svg>`,
  back: `<svg viewBox="0 0 24 24" class="icon"><path d="M19 12H5M12 19l-7-7 7-7" ${P}/></svg>`,
  list: `<svg viewBox="0 0 24 24" class="icon"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" ${P}/></svg>`,
  spin: `<svg viewBox="0 0 24 24" class="icon spin"><path d="M21 12a9 9 0 1 1-6.2-8.5" ${P}/></svg>`,
};

export function mountIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    const name = el.getAttribute('data-icon');
    if (ICONS[name]) el.innerHTML = ICONS[name];
  });
}
