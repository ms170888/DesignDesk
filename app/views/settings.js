// Settings view

import { getState, setState, resetStore } from '../store.js';
import { seedData } from '../seed-data.js';
import { showToast } from '../components/toast.js';
import { icons } from '../core/icons.js';

export function render() {
  const state = getState();
  const settings = state ? state.settings : {};

  return `
    <div class="view-settings">
      <div class="view-header">
        <h1>Settings</h1>
      </div>

      <div class="settings-sections">
        <div class="settings-section">
          <h3>Studio Information</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Company Name</label>
              <input type="text" id="company-name" value="${settings.companyName || ''}" />
            </div>
            <div class="form-group">
              <label>Default VAT Rate (%)</label>
              <input type="number" id="vat-rate" value="${settings.vatRate || 20}" />
            </div>
            <div class="form-group">
              <label>Default Markup (%)</label>
              <input type="number" id="default-markup" value="${settings.defaultMarkup || 30}" />
            </div>
            <div class="form-group">
              <label>Currency</label>
              <select id="currency">
                <option value="GBP" selected>GBP (£)</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" id="save-settings">Save Settings</button>
        </div>

        <div class="settings-section">
          <h3>Demo Data</h3>
          <p class="text-muted">Reset all data back to the original demo state. This will erase any changes you've made.</p>
          <button class="btn btn-outline btn-sm settings-danger" id="reset-demo">${icons.reset} Reset Demo Data</button>
        </div>

        <div class="settings-section">
          <h3>Keyboard Shortcuts</h3>
          <div class="shortcuts-list">
            <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>K</kbd> <span>Quick search</span></div>
            <div class="shortcut"><kbd>Esc</kbd> <span>Close modals</span></div>
            <div class="shortcut"><kbd>Delete</kbd> <span>Remove selected item (floor plan)</span></div>
            <div class="shortcut"><kbd>&larr;</kbd> <kbd>&rarr;</kbd> <span>Navigate slides (presentation mode)</span></div>
          </div>
        </div>

        <div class="settings-section">
          <h3>About</h3>
          <p class="text-muted">DesignDesk Interactive Demo v1.0</p>
          <p class="text-muted">Built with vanilla JS, no dependencies. All data stored locally in your browser.</p>
        </div>
      </div>
    </div>
  `;
}

export function mount(el) {
  el.querySelector('#save-settings')?.addEventListener('click', () => {
    const state = getState();
    state.settings.companyName = el.querySelector('#company-name').value;
    state.settings.vatRate = parseFloat(el.querySelector('#vat-rate').value) || 20;
    state.settings.defaultMarkup = parseFloat(el.querySelector('#default-markup').value) || 30;
    state.settings.currency = el.querySelector('#currency').value;
    setState(state);
    showToast('Settings saved');
  });

  el.querySelector('#reset-demo')?.addEventListener('click', () => {
    if (confirm('Reset all demo data? This cannot be undone.')) {
      resetStore(seedData);
      showToast('Demo data reset');
      window.location.hash = '/dashboard';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  });
}
