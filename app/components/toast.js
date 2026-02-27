// Toast notification component

let containerEl = null;

export function initToast() {
  containerEl = document.getElementById('toast-container');
}

export function showToast(message, type = 'success', duration = 3000) {
  if (!containerEl) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '&#10003;' : type === 'error' ? '&#10007;' : '&#9432;'}</span>
    <span class="toast-msg">${message}</span>
  `;
  containerEl.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
