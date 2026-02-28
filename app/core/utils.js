// Core utilities — DesignDesk

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function relativeTime(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return formatDateShort(dateStr);
}

export function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ── Date utilities ──────────────────────────────────────────────────────

export function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function addDays(dateStr, days) {
  const d = parseDate(dateStr);
  if (!d) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function daysBetween(dateStr1, dateStr2) {
  const d1 = parseDate(dateStr1);
  const d2 = parseDate(dateStr2);
  if (!d1 || !d2) return 0;
  return Math.round((d2 - d1) / 86400000);
}

export function isOverdue(dueDateStr) {
  const d = parseDate(dueDateStr);
  if (!d) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d < now;
}

export function isToday(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth() &&
         d.getDate() === now.getDate();
}

export function getWeekRange(offsetWeeks = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + (offsetWeeks * 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
    label: `${formatDateShort(monday.toISOString())} – ${formatDateShort(sunday.toISOString())}`
  };
}

// ── Collection utilities ────────────────────────────────────────────────

export function groupBy(arr, keyFn) {
  const groups = {};
  for (const item of arr) {
    const key = typeof keyFn === 'string' ? item[keyFn] : keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export function sortBy(arr, keyFn, direction = 'asc') {
  const sorted = [...arr];
  sorted.sort((a, b) => {
    const aVal = typeof keyFn === 'string' ? a[keyFn] : keyFn(a);
    const bVal = typeof keyFn === 'string' ? b[keyFn] : keyFn(b);
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === 'string') {
      const cmp = aVal.localeCompare(bVal);
      return direction === 'asc' ? cmp : -cmp;
    }
    return direction === 'asc' ? aVal - bVal : bVal - aVal;
  });
  return sorted;
}

export function filterBySearch(arr, query, fields) {
  if (!query || !query.trim()) return arr;
  const terms = query.toLowerCase().trim().split(/\s+/);
  return arr.filter(item => {
    const haystack = fields
      .map(f => {
        const val = typeof f === 'function' ? f(item) : item[f];
        return val != null ? String(val) : '';
      })
      .join(' ')
      .toLowerCase();
    return terms.every(term => {
      if (haystack.includes(term)) return true;
      // Fuzzy: allow 1 character difference for terms > 3 chars
      if (term.length > 3) {
        const words = haystack.split(/\s+/);
        return words.some(word => fuzzyMatch(term, word));
      }
      return false;
    });
  });
}

function fuzzyMatch(needle, word) {
  if (word.includes(needle)) return true;
  if (Math.abs(needle.length - word.length) > 2) return false;
  let errors = 0;
  const maxLen = Math.max(needle.length, word.length);
  for (let i = 0; i < maxLen; i++) {
    if (needle[i] !== word[i]) {
      errors++;
      if (errors > 1) return false;
    }
  }
  return errors <= 1;
}

// ── Sanitization ────────────────────────────────────────────────────────

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;'
};

export function sanitizeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"'`/]/g, ch => HTML_ESCAPE_MAP[ch]);
}

// ── Export helpers ───────────────────────────────────────────────────────

export function downloadAsJson(data, filename = 'export.json') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  triggerDownload(blob, filename);
}

export function downloadAsCsv(rows, filename = 'export.csv') {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.map(h => escapeCsvField(h)).join(','),
    ...rows.map(row =>
      headers.map(h => escapeCsvField(row[h])).join(',')
    )
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
  triggerDownload(blob, filename);
}

function escapeCsvField(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── String utilities ────────────────────────────────────────────────────

export function pluralize(count, singular, plural) {
  const p = plural || singular + 's';
  return `${count} ${count === 1 ? singular : p}`;
}

export function truncate(str, maxLength = 50) {
  if (!str || str.length <= maxLength) return str || '';
  return str.slice(0, maxLength - 1).trimEnd() + '\u2026';
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
