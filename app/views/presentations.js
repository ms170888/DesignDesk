// Presentations — simplified slide builder

import { getState, getActiveProject } from '../store.js';
import { formatCurrency } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showToast } from '../components/toast.js';

let activeSlide = 0;

export function render() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return '<div class="empty-state"><h2>No project selected</h2></div>';

  const items = state.items.filter(i => i.projectId === project.id);
  const boards = state.moodboards.filter(b => b.projectId === project.id);

  const slides = buildSlides(project, items, boards, state);

  return `
    <div class="view-presentations">
      <div class="view-header">
        <h1>Presentations</h1>
        <div class="pres-actions">
          <button class="btn btn-outline btn-sm" id="pres-present">${icons.eye} Present</button>
          <button class="btn btn-outline btn-sm" onclick="window.print()">${icons.printer} Print</button>
        </div>
      </div>

      <div class="pres-layout">
        <div class="slide-sorter">
          ${slides.map((s, i) => `
            <div class="slide-thumb ${i === activeSlide ? 'active' : ''}" data-idx="${i}">
              <span class="slide-num">${i + 1}</span>
              <span class="slide-thumb-title">${s.title}</span>
            </div>
          `).join('')}
        </div>

        <div class="slide-preview" id="slide-preview">
          ${renderSlide(slides[activeSlide])}
        </div>
      </div>
    </div>
  `;
}

function buildSlides(project, items, boards, state) {
  const slides = [];

  // Cover slide
  slides.push({
    type: 'cover',
    title: 'Cover',
    content: { projectName: project.name, client: project.client, address: project.address }
  });

  // Mood boards
  boards.forEach(b => {
    slides.push({
      type: 'moodboard',
      title: `Mood Board: ${b.name}`,
      content: { board: b }
    });
  });

  // Spec sheets by room
  const rooms = [...new Set(items.map(i => i.room))];
  rooms.forEach(room => {
    const roomItems = items.filter(i => i.room === room);
    slides.push({
      type: 'spec',
      title: `Specs: ${room}`,
      content: { room, items: roomItems }
    });
  });

  // Budget summary
  const totalClient = items.reduce((s, i) => s + i.trade * (1 + i.markup / 100), 0);
  slides.push({
    type: 'budget',
    title: 'Budget Summary',
    content: { items, totalClient, budget: project.budget }
  });

  return slides;
}

function renderSlide(slide) {
  if (!slide) return '';

  if (slide.type === 'cover') {
    return `
      <div class="slide slide-cover">
        <div class="slide-brand">
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="url(#sg)"/><path d="M8 12h16M8 16h12M8 20h8" stroke="white" stroke-width="2" stroke-linecap="round"/><defs><linearGradient id="sg" x1="0" y1="0" x2="32" y2="32"><stop stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs></svg>
          <span>DesignDesk Studio</span>
        </div>
        <h1 class="slide-title">${slide.content.projectName}</h1>
        <p class="slide-subtitle">Prepared for ${slide.content.client}</p>
        <p class="slide-address">${slide.content.address}</p>
      </div>
    `;
  }

  if (slide.type === 'moodboard') {
    const b = slide.content.board;
    return `
      <div class="slide slide-moodboard">
        <h2>${b.name} — ${b.room}</h2>
        <div class="slide-board">
          ${b.items.map(item => {
            if (item.type === 'color') return `<div class="slide-color" style="background:${item.value}"><span>${item.label}</span></div>`;
            if (item.type === 'text') return `<div class="slide-text-item">${item.value}</div>`;
            if (item.type === 'image') return `<div class="slide-image"><img src="${item.value}" /></div>`;
            return '';
          }).join('')}
        </div>
      </div>
    `;
  }

  if (slide.type === 'spec') {
    return `
      <div class="slide slide-spec">
        <h2>${slide.content.room}</h2>
        <table class="slide-table">
          <thead><tr><th>Item</th><th>Supplier</th><th>Price</th><th>Status</th></tr></thead>
          <tbody>
            ${slide.content.items.map(i => `<tr>
              <td>${i.name}</td>
              <td>${i.supplier}</td>
              <td>${formatCurrency(i.trade * (1 + i.markup / 100))}</td>
              <td><span class="status-badge status-${i.status}">${i.status}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  if (slide.type === 'budget') {
    const byRoom = {};
    slide.content.items.forEach(i => {
      const price = i.trade * (1 + i.markup / 100);
      byRoom[i.room] = (byRoom[i.room] || 0) + price;
    });
    return `
      <div class="slide slide-budget">
        <h2>Budget Summary</h2>
        <div class="budget-chart">
          ${Object.entries(byRoom).map(([room, total]) => {
            const pct = (total / slide.content.totalClient * 100).toFixed(0);
            return `<div class="budget-bar-row">
              <span class="budget-room">${room}</span>
              <div class="budget-bar"><div class="budget-bar-fill" style="width:${pct}%"></div></div>
              <span class="budget-val">${formatCurrency(total)}</span>
            </div>`;
          }).join('')}
        </div>
        <div class="budget-total">
          <span>Total: ${formatCurrency(slide.content.totalClient)}</span>
          <span>Budget: ${formatCurrency(slide.content.budget)}</span>
        </div>
      </div>
    `;
  }

  return '';
}

export function mount(el) {
  // Slide sorter
  el.querySelectorAll('.slide-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      activeSlide = parseInt(thumb.dataset.idx);
      el.innerHTML = render();
      mount(el);
    });
  });

  // Present button (fullscreen)
  el.querySelector('#pres-present')?.addEventListener('click', () => {
    const preview = el.querySelector('#slide-preview');
    if (preview && preview.requestFullscreen) {
      preview.requestFullscreen();
    }
  });

  // Keyboard nav in fullscreen
  document.addEventListener('keydown', (e) => {
    if (!document.fullscreenElement) return;
    const state = getState();
    const project = getActiveProject();
    const items = state.items.filter(i => i.projectId === project.id);
    const boards = state.moodboards.filter(b => b.projectId === project.id);
    const slides = buildSlides(project, items, boards, state);

    if (e.key === 'ArrowRight' || e.key === ' ') {
      activeSlide = Math.min(activeSlide + 1, slides.length - 1);
      el.querySelector('#slide-preview').innerHTML = renderSlide(slides[activeSlide]);
    }
    if (e.key === 'ArrowLeft') {
      activeSlide = Math.max(activeSlide - 1, 0);
      el.querySelector('#slide-preview').innerHTML = renderSlide(slides[activeSlide]);
    }
    if (e.key === 'Escape') document.exitFullscreen();
  });
}

export function destroy() { activeSlide = 0; }
