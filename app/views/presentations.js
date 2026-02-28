// Presentations — production slide builder with 8 templates, drag-to-reorder, fullscreen mode

import { getState, getActiveProject } from '../store.js';
import { formatCurrency, formatDateShort, formatDate } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showToast } from '../components/toast.js';

let slides = [];
let activeSlide = 0;
let isPresenting = false;
let showTemplatePicker = false;
let editingText = null; // { slideIdx, field }
let dragFrom = null;

// ── Slide Template Builders ─────────────────────────────────────────────

function buildDefaultSlides(project, items, boards, tasks, state) {
  const s = [];

  // 1. Cover slide
  s.push({
    type: 'cover',
    title: 'Cover',
    data: { projectName: project.name, client: project.client, address: project.address, date: formatDate(new Date().toISOString()) },
    bg: '#1e293b'
  });

  // 2. Mood boards
  boards.forEach(b => {
    s.push({
      type: 'moodboard',
      title: `Mood: ${b.name}`,
      data: { board: b },
      bg: '#ffffff'
    });
  });

  // 3. Room spec sheets
  const rooms = [...new Set(items.map(i => i.room))];
  rooms.forEach(room => {
    const roomItems = items.filter(i => i.room === room);
    s.push({
      type: 'roomspec',
      title: `Spec: ${room}`,
      data: { room, items: roomItems },
      bg: '#ffffff'
    });
  });

  // 4. Budget summary
  const totalClient = items.reduce((sum, i) => sum + i.trade * (1 + i.markup / 100), 0);
  s.push({
    type: 'budget',
    title: 'Budget Summary',
    data: { items, totalClient, budget: project.budget },
    bg: '#ffffff'
  });

  // 5. Schedule overview
  s.push({
    type: 'schedule',
    title: 'Schedule',
    data: { tasks, startDate: project.startDate, endDate: project.endDate },
    bg: '#ffffff'
  });

  // 6. Before/After placeholder
  s.push({
    type: 'beforeafter',
    title: 'Before / After',
    data: { room: rooms[0] || 'Main Room' },
    bg: '#f8fafc'
  });

  // 7. Material palette
  const allColors = boards.flatMap(b => b.items.filter(i => i.type === 'color'));
  const allTexts = boards.flatMap(b => b.items.filter(i => i.type === 'text'));
  s.push({
    type: 'palette',
    title: 'Materials',
    data: { colors: allColors, descriptions: allTexts },
    bg: '#ffffff'
  });

  // 8. Thank you
  s.push({
    type: 'thankyou',
    title: 'Thank You',
    data: { companyName: state.settings.companyName || 'DesignDesk Studio', client: project.client },
    bg: '#1e293b'
  });

  return s;
}

// ── Slide Renderers ─────────────────────────────────────────────────────

function renderSlide(slide, idx, editable = true) {
  if (!slide) return '';
  const style = `background:${slide.bg || '#ffffff'}`;
  const dark = slide.bg === '#1e293b';
  const textCls = dark ? 'slide-dark' : 'slide-light';

  let inner = '';

  switch (slide.type) {
    case 'cover':
      inner = `
        <div class="slide slide-cover ${textCls}" style="${style}">
          <div class="slide-brand-row">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="url(#sg${idx})"/><path d="M8 12h16M8 16h12M8 20h8" stroke="white" stroke-width="2" stroke-linecap="round"/><defs><linearGradient id="sg${idx}" x1="0" y1="0" x2="32" y2="32"><stop stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs></svg>
            <span class="slide-brand-name">${slide.data.companyName || 'DesignDesk Studio'}</span>
          </div>
          <h1 class="slide-cover-title ${editable ? 'slide-editable' : ''}" data-slide="${idx}" data-field="projectName">${slide.data.projectName}</h1>
          <p class="slide-cover-subtitle">Prepared for <strong>${slide.data.client}</strong></p>
          <p class="slide-cover-address">${slide.data.address}</p>
          <p class="slide-cover-date">${slide.data.date}</p>
        </div>`;
      break;

    case 'moodboard': {
      const b = slide.data.board;
      const colorItems = b.items.filter(i => i.type === 'color');
      const textItems = b.items.filter(i => i.type === 'text');
      const imageItems = b.items.filter(i => i.type === 'image');
      inner = `
        <div class="slide slide-moodboard ${textCls}" style="${style}">
          <h2 class="slide-heading">${b.name} &mdash; ${b.room}</h2>
          <div class="slide-mood-grid">
            ${colorItems.map(c => `<div class="slide-mood-color"><div class="slide-mood-swatch" style="background:${c.value}"></div><span>${c.label}</span></div>`).join('')}
            ${imageItems.map(img => `<div class="slide-mood-image"><img src="${img.value}" alt="" /></div>`).join('')}
          </div>
          ${textItems.length > 0 ? `<div class="slide-mood-notes">${textItems.map(t => `<p>${t.value}</p>`).join('')}</div>` : ''}
        </div>`;
      break;
    }

    case 'roomspec': {
      const { room, items: roomItems } = slide.data;
      inner = `
        <div class="slide slide-roomspec ${textCls}" style="${style}">
          <h2 class="slide-heading">${room}</h2>
          <table class="slide-spec-table">
            <thead><tr><th class="slide-th-image"></th><th>Item</th><th>Supplier</th><th class="text-right">Price</th><th>Status</th></tr></thead>
            <tbody>
              ${roomItems.map(i => `<tr>
                <td><div class="slide-item-thumb"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#cbd5e1" stroke-width="1.5"/><circle cx="15" cy="9" r="2" stroke="#cbd5e1" stroke-width="1.5"/><path d="M3 16l5-5 3 3 2-2 8 8" stroke="#cbd5e1" stroke-width="1.5"/></svg></div></td>
                <td><strong>${i.name}</strong></td>
                <td>${i.supplier}</td>
                <td class="text-right">${formatCurrency(i.trade * (1 + i.markup / 100))}</td>
                <td><span class="status-badge status-${i.status}">${i.status}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
      break;
    }

    case 'budget': {
      const byRoom = {};
      slide.data.items.forEach(i => {
        const price = i.trade * (1 + i.markup / 100);
        byRoom[i.room] = (byRoom[i.room] || 0) + price;
      });
      const entries = Object.entries(byRoom).sort((a, b) => b[1] - a[1]);
      const max = entries.length > 0 ? entries[0][1] : 1;

      inner = `
        <div class="slide slide-budget ${textCls}" style="${style}">
          <h2 class="slide-heading">Budget Summary</h2>
          <div class="slide-budget-chart">
            ${entries.map(([room, total]) => {
              const pct = Math.round((total / max) * 100);
              return `<div class="slide-budget-row">
                <span class="slide-budget-label">${room}</span>
                <div class="slide-budget-bar-track"><div class="slide-budget-bar-fill" style="width:${pct}%"></div></div>
                <span class="slide-budget-val">${formatCurrency(total)}</span>
              </div>`;
            }).join('')}
          </div>
          <div class="slide-budget-totals">
            <div class="slide-budget-total-item"><span>Total Spend</span><strong>${formatCurrency(slide.data.totalClient)}</strong></div>
            <div class="slide-budget-total-item"><span>Budget</span><strong>${formatCurrency(slide.data.budget)}</strong></div>
            <div class="slide-budget-total-item ${slide.data.budget - slide.data.totalClient < 0 ? 'over-budget' : ''}">
              <span>Remaining</span><strong>${formatCurrency(slide.data.budget - slide.data.totalClient)}</strong>
            </div>
          </div>
        </div>`;
      break;
    }

    case 'schedule': {
      const { tasks, startDate, endDate } = slide.data;
      const milestones = tasks.filter(t => t.progress === 100 || t.progress > 50 || t.progress === 0).slice(0, 8);
      inner = `
        <div class="slide slide-schedule ${textCls}" style="${style}">
          <h2 class="slide-heading">Project Schedule</h2>
          <div class="slide-schedule-timeline">
            <div class="slide-schedule-bar">
              <span class="slide-schedule-date">${formatDateShort(startDate)}</span>
              <div class="slide-schedule-track">
                ${milestones.map(t => {
                  const s = new Date(startDate);
                  const e = new Date(endDate);
                  const ts = new Date(t.start);
                  const pos = Math.min(100, Math.max(2, ((ts - s) / (e - s)) * 100));
                  const color = t.progress === 100 ? '#10b981' : t.progress > 0 ? '#6366f1' : '#94a3b8';
                  return `<div class="slide-schedule-marker" style="left:${pos}%" title="${t.name}">
                    <div class="slide-schedule-dot" style="background:${color}"></div>
                    <span class="slide-schedule-label">${t.name.length > 18 ? t.name.substring(0, 18) + '...' : t.name}</span>
                  </div>`;
                }).join('')}
              </div>
              <span class="slide-schedule-date">${formatDateShort(endDate)}</span>
            </div>
          </div>
          <div class="slide-schedule-legend">
            <span><span class="slide-legend-dot" style="background:#10b981"></span> Complete</span>
            <span><span class="slide-legend-dot" style="background:#6366f1"></span> In Progress</span>
            <span><span class="slide-legend-dot" style="background:#94a3b8"></span> Upcoming</span>
          </div>
        </div>`;
      break;
    }

    case 'beforeafter': {
      inner = `
        <div class="slide slide-beforeafter ${textCls}" style="${style}">
          <h2 class="slide-heading">Before &amp; After &mdash; ${slide.data.room}</h2>
          <div class="slide-ba-grid">
            <div class="slide-ba-panel">
              <div class="slide-ba-placeholder">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="4" y="4" width="40" height="40" rx="4" stroke="#cbd5e1" stroke-width="2"/><path d="M4 36l12-12 8 8 4-4 16 16" stroke="#cbd5e1" stroke-width="2"/><circle cx="32" cy="16" r="4" stroke="#cbd5e1" stroke-width="2"/></svg>
                <span>Before Photo</span>
              </div>
              <div class="slide-ba-label">BEFORE</div>
            </div>
            <div class="slide-ba-panel">
              <div class="slide-ba-placeholder">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="4" y="4" width="40" height="40" rx="4" stroke="#cbd5e1" stroke-width="2"/><path d="M4 36l12-12 8 8 4-4 16 16" stroke="#cbd5e1" stroke-width="2"/><circle cx="32" cy="16" r="4" stroke="#cbd5e1" stroke-width="2"/></svg>
                <span>After Photo</span>
              </div>
              <div class="slide-ba-label">AFTER</div>
            </div>
          </div>
        </div>`;
      break;
    }

    case 'palette': {
      const { colors, descriptions } = slide.data;
      inner = `
        <div class="slide slide-palette ${textCls}" style="${style}">
          <h2 class="slide-heading">Material Palette</h2>
          <div class="slide-palette-grid">
            ${colors.map(c => `
              <div class="slide-palette-item">
                <div class="slide-palette-swatch" style="background:${c.value}"></div>
                <span class="slide-palette-name">${c.label}</span>
                <span class="slide-palette-hex">${c.value}</span>
              </div>
            `).join('')}
          </div>
          ${descriptions.length > 0 ? `
            <div class="slide-palette-descriptions">
              ${descriptions.map(d => `<p>${d.value}</p>`).join('')}
            </div>
          ` : ''}
        </div>`;
      break;
    }

    case 'thankyou': {
      inner = `
        <div class="slide slide-thankyou ${textCls}" style="${style}">
          <div class="slide-thankyou-content">
            <h1>Thank You</h1>
            <p class="slide-thankyou-sub">We look forward to bringing your vision to life.</p>
            <div class="slide-thankyou-divider"></div>
            <div class="slide-thankyou-contact">
              <p><strong>${slide.data.companyName}</strong></p>
              <p>hello@designdeskstudio.co.uk</p>
              <p>020 7946 0958</p>
              <p>designdeskstudio.co.uk</p>
            </div>
            <div class="slide-thankyou-next">
              <h4>Next Steps</h4>
              <ol>
                <li>Review this presentation and share feedback</li>
                <li>Approve selections via the Client Portal</li>
                <li>Construction begins on confirmed schedule</li>
              </ol>
            </div>
          </div>
        </div>`;
      break;
    }

    default:
      inner = `<div class="slide" style="${style}"><p>Unknown slide type</p></div>`;
  }

  return inner;
}

// ── Template Picker ─────────────────────────────────────────────────────

function renderTemplatePicker() {
  const templates = [
    { type: 'cover', label: 'Cover', icon: '&#x1F3AC;', desc: 'Project title and branding' },
    { type: 'moodboard', label: 'Mood Board', icon: '&#x1F3A8;', desc: 'Colours, textures, inspiration' },
    { type: 'roomspec', label: 'Room Spec', icon: '&#x1F4CB;', desc: 'Item list for a room' },
    { type: 'budget', label: 'Budget Summary', icon: '&#x1F4B7;', desc: 'Spending by room chart' },
    { type: 'schedule', label: 'Schedule', icon: '&#x1F4C5;', desc: 'Key milestones timeline' },
    { type: 'beforeafter', label: 'Before / After', icon: '&#x1F4F7;', desc: 'Split comparison layout' },
    { type: 'palette', label: 'Material Palette', icon: '&#x1F308;', desc: 'Colour swatches & materials' },
    { type: 'thankyou', label: 'Thank You', icon: '&#x2728;', desc: 'Closing slide with contact' },
  ];

  return `
    <div class="pres-modal-overlay" id="template-picker-overlay">
      <div class="pres-modal">
        <div class="pres-modal-header">
          <h3>Add Slide</h3>
          <button class="pres-modal-close" id="close-template-picker">&times;</button>
        </div>
        <div class="pres-template-grid">
          ${templates.map(t => `
            <button class="pres-template-btn" data-type="${t.type}">
              <span class="pres-template-icon">${t.icon}</span>
              <strong>${t.label}</strong>
              <span class="pres-template-desc">${t.desc}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ── Main Render ─────────────────────────────────────────────────────────

export function render() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return '<div class="empty-state"><h2>No project selected</h2></div>';

  const items = state.items.filter(i => i.projectId === project.id);
  const boards = state.moodboards.filter(b => b.projectId === project.id);
  const tasks = state.tasks.filter(t => t.projectId === project.id);

  // Build slides on first render or if empty
  if (slides.length === 0) {
    slides = buildDefaultSlides(project, items, boards, tasks, state);
  }

  if (activeSlide >= slides.length) activeSlide = slides.length - 1;
  if (activeSlide < 0) activeSlide = 0;

  if (isPresenting) {
    return `
      <div class="pres-fullscreen" id="pres-fullscreen">
        <div class="pres-fullscreen-slide" id="pres-fs-slide">
          ${renderSlide(slides[activeSlide], activeSlide, false)}
        </div>
        <div class="pres-fs-counter">${activeSlide + 1} / ${slides.length}</div>
        <button class="pres-fs-exit" id="pres-exit-fs" title="Press Escape to exit">&times;</button>
      </div>
    `;
  }

  return `
    <div class="view-presentations">
      <div class="view-header">
        <h1>Presentations</h1>
        <div class="pres-header-actions">
          <button class="btn btn-outline btn-sm" id="pres-add-slide">${icons.plus} Add Slide</button>
          <button class="btn btn-outline btn-sm" id="pres-present">${icons.eye} Present</button>
          <button class="btn btn-outline btn-sm" id="pres-print">${icons.printer} Print</button>
        </div>
      </div>

      <div class="pres-layout">
        <div class="pres-sorter" id="pres-sorter">
          ${slides.map((s, i) => `
            <div class="pres-thumb ${i === activeSlide ? 'active' : ''}" data-idx="${i}" draggable="true">
              <span class="pres-thumb-num">${i + 1}</span>
              <span class="pres-thumb-title">${s.title}</span>
              <div class="pres-thumb-actions">
                <button class="pres-thumb-btn pres-dup-slide" data-idx="${i}" title="Duplicate">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M3 11V3h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </button>
                <button class="pres-thumb-btn pres-del-slide" data-idx="${i}" title="Delete">
                  ${icons.trash}
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="pres-preview-wrap">
          <div class="pres-slide-container" id="pres-slide-container">
            ${renderSlide(slides[activeSlide], activeSlide, true)}
          </div>
          <div class="pres-slide-controls">
            <button class="btn btn-outline btn-sm" id="pres-prev" ${activeSlide === 0 ? 'disabled' : ''}>&#8592; Prev</button>
            <span class="pres-slide-indicator">${activeSlide + 1} / ${slides.length}</span>
            <button class="btn btn-outline btn-sm" id="pres-next" ${activeSlide === slides.length - 1 ? 'disabled' : ''}>Next &#8594;</button>
          </div>
        </div>
      </div>

      ${showTemplatePicker ? renderTemplatePicker() : ''}
    </div>
  `;
}

// ── Mount ───────────────────────────────────────────────────────────────

export function mount(el) {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return;

  // ── Presentation mode
  if (isPresenting) {
    mountPresentationMode(el);
    return;
  }

  // Slide sorter — click to select
  el.querySelectorAll('.pres-thumb').forEach(thumb => {
    thumb.addEventListener('click', (e) => {
      if (e.target.closest('.pres-thumb-btn')) return;
      activeSlide = parseInt(thumb.dataset.idx);
      el.innerHTML = render();
      mount(el);
    });
  });

  // Slide sorter — drag to reorder
  el.querySelectorAll('.pres-thumb[draggable]').forEach(thumb => {
    thumb.addEventListener('dragstart', (e) => {
      dragFrom = parseInt(thumb.dataset.idx);
      thumb.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    thumb.addEventListener('dragend', () => {
      thumb.classList.remove('dragging');
      dragFrom = null;
    });
    thumb.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      thumb.classList.add('drag-over');
    });
    thumb.addEventListener('dragleave', () => {
      thumb.classList.remove('drag-over');
    });
    thumb.addEventListener('drop', (e) => {
      e.preventDefault();
      thumb.classList.remove('drag-over');
      const dragTo = parseInt(thumb.dataset.idx);
      if (dragFrom !== null && dragFrom !== dragTo) {
        const moved = slides.splice(dragFrom, 1)[0];
        slides.splice(dragTo, 0, moved);
        activeSlide = dragTo;
        el.innerHTML = render();
        mount(el);
      }
    });
  });

  // Duplicate slide
  el.querySelectorAll('.pres-dup-slide').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      const clone = JSON.parse(JSON.stringify(slides[idx]));
      clone.title = clone.title + ' (Copy)';
      slides.splice(idx + 1, 0, clone);
      activeSlide = idx + 1;
      showToast('Slide duplicated');
      el.innerHTML = render();
      mount(el);
    });
  });

  // Delete slide
  el.querySelectorAll('.pres-del-slide').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (slides.length <= 1) { showToast('Cannot delete the last slide', 'warning'); return; }
      if (!confirm('Delete this slide?')) return;
      const idx = parseInt(btn.dataset.idx);
      slides.splice(idx, 1);
      if (activeSlide >= slides.length) activeSlide = slides.length - 1;
      showToast('Slide deleted');
      el.innerHTML = render();
      mount(el);
    });
  });

  // Prev / Next
  el.querySelector('#pres-prev')?.addEventListener('click', () => {
    if (activeSlide > 0) { activeSlide--; el.innerHTML = render(); mount(el); }
  });
  el.querySelector('#pres-next')?.addEventListener('click', () => {
    if (activeSlide < slides.length - 1) { activeSlide++; el.innerHTML = render(); mount(el); }
  });

  // Add slide (template picker)
  el.querySelector('#pres-add-slide')?.addEventListener('click', () => {
    showTemplatePicker = true;
    el.innerHTML = render();
    mount(el);
  });

  // Template picker
  el.querySelector('#close-template-picker')?.addEventListener('click', () => {
    showTemplatePicker = false;
    el.innerHTML = render();
    mount(el);
  });
  el.querySelector('#template-picker-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'template-picker-overlay') {
      showTemplatePicker = false;
      el.innerHTML = render();
      mount(el);
    }
  });
  el.querySelectorAll('.pres-template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const newSlide = createBlankSlide(type, project, state);
      slides.splice(activeSlide + 1, 0, newSlide);
      activeSlide = activeSlide + 1;
      showTemplatePicker = false;
      showToast('Slide added');
      el.innerHTML = render();
      mount(el);
    });
  });

  // Present button
  el.querySelector('#pres-present')?.addEventListener('click', () => {
    isPresenting = true;
    el.innerHTML = render();
    mount(el);
  });

  // Print button
  el.querySelector('#pres-print')?.addEventListener('click', () => {
    printSlides();
  });

  // Editable text fields
  el.querySelectorAll('.slide-editable').forEach(editable => {
    editable.addEventListener('dblclick', () => {
      const slideIdx = parseInt(editable.dataset.slide);
      const field = editable.dataset.field;
      const currentText = editable.textContent;
      editable.contentEditable = 'true';
      editable.focus();
      editable.classList.add('editing');

      const save = () => {
        editable.contentEditable = 'false';
        editable.classList.remove('editing');
        const newText = editable.textContent.trim();
        if (newText && newText !== currentText && slides[slideIdx]) {
          slides[slideIdx].data[field] = newText;
        }
      };

      editable.addEventListener('blur', save, { once: true });
      editable.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); editable.blur(); }
        if (e.key === 'Escape') { editable.textContent = currentText; editable.blur(); }
      });
    });
  });
}

function mountPresentationMode(el) {
  const handleKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (activeSlide < slides.length - 1) {
        activeSlide++;
        updatePresSlide(el);
      }
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (activeSlide > 0) {
        activeSlide--;
        updatePresSlide(el);
      }
    }
    if (e.key === 'Escape') {
      exitPresentation(el);
      document.removeEventListener('keydown', handleKey);
    }
  };
  document.addEventListener('keydown', handleKey);

  // Click to advance
  el.querySelector('#pres-fs-slide')?.addEventListener('click', () => {
    if (activeSlide < slides.length - 1) {
      activeSlide++;
      updatePresSlide(el);
    }
  });

  // Exit button
  el.querySelector('#pres-exit-fs')?.addEventListener('click', () => {
    exitPresentation(el);
    document.removeEventListener('keydown', handleKey);
  });

  // Try fullscreen
  const fsEl = el.querySelector('#pres-fullscreen');
  if (fsEl && fsEl.requestFullscreen) {
    fsEl.requestFullscreen().catch(() => {});
  }

  // Listen for fullscreen exit
  const onFsChange = () => {
    if (!document.fullscreenElement && isPresenting) {
      exitPresentation(el);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('fullscreenchange', onFsChange);
    }
  };
  document.addEventListener('fullscreenchange', onFsChange);
}

function updatePresSlide(el) {
  const slideEl = el.querySelector('#pres-fs-slide');
  const counterEl = el.querySelector('.pres-fs-counter');
  if (slideEl) {
    slideEl.style.opacity = '0';
    setTimeout(() => {
      slideEl.innerHTML = renderSlide(slides[activeSlide], activeSlide, false);
      slideEl.style.opacity = '1';
    }, 200);
  }
  if (counterEl) counterEl.textContent = `${activeSlide + 1} / ${slides.length}`;
}

function exitPresentation(el) {
  isPresenting = false;
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  el.innerHTML = render();
  mount(el);
}

// ── Create blank slides of each type ────────────────────────────────────

function createBlankSlide(type, project, state) {
  const items = state.items.filter(i => i.projectId === project.id);
  const boards = state.moodboards.filter(b => b.projectId === project.id);
  const tasks = state.tasks.filter(t => t.projectId === project.id);
  const rooms = [...new Set(items.map(i => i.room))];

  switch (type) {
    case 'cover':
      return { type: 'cover', title: 'Cover', data: { projectName: project.name, client: project.client, address: project.address, date: formatDate(new Date().toISOString()) }, bg: '#1e293b' };
    case 'moodboard':
      if (boards.length > 0) {
        return { type: 'moodboard', title: `Mood: ${boards[0].name}`, data: { board: boards[0] }, bg: '#ffffff' };
      }
      return { type: 'moodboard', title: 'Mood Board', data: { board: { name: 'New Board', room: '', items: [] } }, bg: '#ffffff' };
    case 'roomspec':
      const room = rooms[0] || 'Room';
      return { type: 'roomspec', title: `Spec: ${room}`, data: { room, items: items.filter(i => i.room === room) }, bg: '#ffffff' };
    case 'budget':
      const totalClient = items.reduce((s, i) => s + i.trade * (1 + i.markup / 100), 0);
      return { type: 'budget', title: 'Budget Summary', data: { items, totalClient, budget: project.budget }, bg: '#ffffff' };
    case 'schedule':
      return { type: 'schedule', title: 'Schedule', data: { tasks, startDate: project.startDate, endDate: project.endDate }, bg: '#ffffff' };
    case 'beforeafter':
      return { type: 'beforeafter', title: 'Before / After', data: { room: rooms[0] || 'Room' }, bg: '#f8fafc' };
    case 'palette':
      const allColors = boards.flatMap(b => b.items.filter(i => i.type === 'color'));
      const allTexts = boards.flatMap(b => b.items.filter(i => i.type === 'text'));
      return { type: 'palette', title: 'Materials', data: { colors: allColors, descriptions: allTexts }, bg: '#ffffff' };
    case 'thankyou':
      return { type: 'thankyou', title: 'Thank You', data: { companyName: state.settings.companyName || 'DesignDesk Studio', client: project.client }, bg: '#1e293b' };
    default:
      return { type: 'cover', title: 'Slide', data: { projectName: 'New Slide', client: '', address: '', date: '' }, bg: '#ffffff' };
  }
}

// ── Print all slides ────────────────────────────────────────────────────

function printSlides() {
  const allSlidesHtml = slides.map((s, i) => `
    <div class="print-slide" style="page-break-after: always; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; overflow: hidden;">
      ${renderSlide(s, i, false)}
    </div>
  `).join('');

  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>Presentation — ${getActiveProject()?.name || 'DesignDesk'}</title>
    <style>
      @page { size: landscape; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', -apple-system, sans-serif; }
      .print-slide { width: 100vw; height: 100vh; }
      .slide { width: 100%; height: 100%; padding: 48px; display: flex; flex-direction: column; justify-content: center; }
      .slide-dark { color: white; }
      .slide-light { color: #1e293b; }
      .slide-heading { font-size: 28px; margin-bottom: 24px; }
      .slide-cover { align-items: center; text-align: center; }
      .slide-cover-title { font-family: 'Playfair Display', Georgia, serif; font-size: 42px; margin: 24px 0 8px; }
      .slide-cover-subtitle { font-size: 18px; opacity: 0.8; }
      .slide-cover-address, .slide-cover-date { font-size: 14px; opacity: 0.6; margin-top: 4px; }
      .slide-thankyou { align-items: center; text-align: center; color: white; }
      .slide-thankyou h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 48px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 13px; }
      th { font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: .05em; }
      .text-right { text-align: right; }
      .status-badge { padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
      .slide-budget-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
      .slide-budget-label { width: 120px; font-size: 13px; }
      .slide-budget-bar-track { flex: 1; height: 18px; background: #f1f5f9; border-radius: 4px; }
      .slide-budget-bar-fill { height: 100%; background: #6366f1; border-radius: 4px; }
      .slide-budget-val { width: 80px; text-align: right; font-size: 13px; font-weight: 600; }
      .slide-mood-grid { display: flex; gap: 16px; flex-wrap: wrap; }
      .slide-mood-swatch { width: 80px; height: 80px; border-radius: 8px; }
      .slide-palette-swatch { width: 64px; height: 64px; border-radius: 8px; }
      .slide-palette-grid { display: flex; gap: 20px; flex-wrap: wrap; }
      .slide-ba-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
      .slide-ba-placeholder { width: 100%; height: 200px; background: #f1f5f9; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #94a3b8; }
      .slide-brand-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
      .slide-brand-name { font-weight: 700; font-size: 16px; opacity: 0.7; }
    </style></head><body>${allSlidesHtml}</body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

export function destroy() {
  slides = [];
  activeSlide = 0;
  isPresenting = false;
  showTemplatePicker = false;
  dragFrom = null;
}
