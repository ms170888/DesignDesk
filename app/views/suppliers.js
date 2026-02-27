// Supplier Database view

import { getState, setState, addActivity } from '../store.js';
import { icons } from '../core/icons.js';
import { showModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const CATEGORIES = ['All', 'Fabric', 'Furniture', 'Lighting', 'Paint', 'Tiles', 'Hardware'];
let filterCat = 'All';
let searchQuery = '';

export function render() {
  const state = getState();
  if (!state) return '<div class="empty-state"><h2>No data</h2></div>';

  let suppliers = [...state.suppliers];
  if (filterCat !== 'All') suppliers = suppliers.filter(s => s.category === filterCat);
  if (searchQuery) suppliers = suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return `
    <div class="view-suppliers">
      <div class="view-header">
        <h1>Supplier Database</h1>
      </div>

      <div class="supplier-controls">
        <div class="search-box">
          <span class="search-icon">${icons.search}</span>
          <input type="text" id="supplier-search" placeholder="Search suppliers..." value="${searchQuery}" />
        </div>
        <div class="category-chips">
          ${CATEGORIES.map(c => `<button class="chip ${filterCat === c ? 'chip-active' : ''}" data-cat="${c}">${c}</button>`).join('')}
        </div>
      </div>

      <div class="supplier-grid">
        ${suppliers.map(s => `
          <div class="supplier-card" data-id="${s.id}">
            <div class="supplier-card-header">
              <h3>${s.name}</h3>
              ${s.tradeAccount ? '<span class="trade-badge">Trade Account</span>' : ''}
            </div>
            <div class="supplier-category"><span class="category-dot cat-${s.category.toLowerCase()}"></span>${s.category}</div>
            <div class="supplier-rating">${renderStars(s.rating)}</div>
            <div class="supplier-meta">
              <span>Lead time: ${s.leadTime}</span>
              ${s.discount > 0 ? `<span>Discount: ${s.discount}%</span>` : ''}
            </div>
            <div class="supplier-details hidden" id="details-${s.id}">
              <div class="supplier-detail-row">${icons.link} <a href="https://${s.website}" target="_blank">${s.website}</a></div>
              <div class="supplier-detail-row">Phone: ${s.phone}</div>
              <div class="supplier-detail-row">Email: ${s.email}</div>
              <div class="supplier-detail-row">${s.address}</div>
              <p class="supplier-notes">${s.notes}</p>
              <button class="btn btn-primary btn-sm add-to-project-btn" data-supplier="${s.name}">Add to Project</button>
            </div>
          </div>
        `).join('')}
        ${suppliers.length === 0 ? '<div class="empty-state"><h3>No suppliers found</h3></div>' : ''}
      </div>
    </div>
  `;
}

export function mount(el) {
  // Search
  el.querySelector('#supplier-search')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    el.innerHTML = render();
    mount(el);
  });

  // Category chips
  el.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      filterCat = chip.dataset.cat;
      el.innerHTML = render();
      mount(el);
    });
  });

  // Toggle card expand
  el.querySelectorAll('.supplier-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.add-to-project-btn') || e.target.closest('a')) return;
      const details = card.querySelector('.supplier-details');
      details.classList.toggle('hidden');
    });
  });

  // Add to project
  el.querySelectorAll('.add-to-project-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addActivity('Supplier linked', `${btn.dataset.supplier} added to project`, 'plus');
      showToast(`${btn.dataset.supplier} linked to project`);
    });
  });
}

export function destroy() { filterCat = 'All'; searchQuery = ''; }

function renderStars(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += i <= rating ? `<span class="star filled">${icons.star}</span>` : `<span class="star">${icons.starEmpty}</span>`;
  }
  return `<div class="stars">${html}</div>`;
}
