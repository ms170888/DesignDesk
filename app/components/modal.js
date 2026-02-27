// Modal component

let modalEl = null;

export function initModal() {
  modalEl = document.getElementById('modal-container');
}

export function showModal(title, bodyHtml, actions = []) {
  if (!modalEl) return;
  const actionsHtml = actions.map(a =>
    `<button class="btn ${a.primary ? 'btn-primary' : 'btn-outline'} btn-sm" data-action="${a.id}">${a.label}</button>`
  ).join('');

  modalEl.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${actionsHtml ? `<div class="modal-footer">${actionsHtml}</div>` : ''}
    </div>
  `;
  modalEl.classList.add('open');

  modalEl.querySelector('.modal-close').onclick = closeModal;
  modalEl.querySelector('.modal-backdrop').onclick = closeModal;

  actions.forEach(a => {
    const btn = modalEl.querySelector(`[data-action="${a.id}"]`);
    if (btn && a.onClick) btn.onclick = () => { a.onClick(); closeModal(); };
  });

  // Focus first input if exists
  const firstInput = modalEl.querySelector('input, select, textarea');
  if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

export function closeModal() {
  if (!modalEl) return;
  modalEl.classList.remove('open');
  setTimeout(() => { modalEl.innerHTML = ''; }, 200);
}

export function confirmModal(title, message) {
  return new Promise(resolve => {
    showModal(title, `<p>${message}</p>`, [
      { id: 'cancel', label: 'Cancel', onClick: () => resolve(false) },
      { id: 'confirm', label: 'Confirm', primary: true, onClick: () => resolve(true) },
    ]);
  });
}
