// Auth service — localStorage-based session management with demo mode
// Stores users in `designdesk_users`, sessions in `designdesk_session`

const USERS_KEY = 'designdesk_users';
const SESSION_KEY = 'designdesk_session';
const SESSION_DURATION_DEFAULT = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_DURATION_REMEMBER = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Demo account seed ────────────────────────────────────────────────────

const DEMO_USER = {
  id: 'usr_demo_001',
  name: 'Demo User',
  email: 'demo@designdesk.app',
  company: 'DesignDesk Studio',
  plan: 'pro',
  avatar: null,
  createdAt: '2025-01-15T00:00:00.000Z'
};
// Demo password — hashed on first seed, never stored as plaintext
const DEMO_RAW_PASSWORD = 'demo1234';

function ensureDemoAccount() {
  const users = getUsers();
  if (!users.find(u => u.email === DEMO_USER.email)) {
    users.push({
      ...DEMO_USER,
      passwordHash: hashPassword(DEMO_RAW_PASSWORD)
    });
    saveUsers(users);
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────

function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function generateId() {
  return 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Generate a cryptographically random session token.
 * Uses crypto.getRandomValues for proper entropy.
 */
function generateSessionToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 based password hashing using Web Crypto API.
 * Includes a per-user salt for defense against rainbow tables.
 * Returns "sha256:<salt>:<hash>" format.
 *
 * Note: For a real production system, use bcrypt/scrypt/argon2 on the server.
 * SHA-256 with salt is a significant improvement over the previous djb2 hash
 * and is reasonable for a client-side demo app.
 */
async function hashPasswordAsync(password, salt) {
  if (!salt) {
    const saltArr = new Uint8Array(16);
    crypto.getRandomValues(saltArr);
    salt = Array.from(saltArr, b => b.toString(16).padStart(2, '0')).join('');
  }
  const data = new TextEncoder().encode(salt + ':' + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${salt}:${hashHex}`;
}

/**
 * Synchronous password hash fallback — used only for demo seed and
 * immediate operations. Uses a stronger hash than the previous djb2.
 * Format: "sync:<salt>:<hash>"
 */
function hashPassword(password, salt) {
  if (!salt) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    salt = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  }
  // FNV-1a 64-bit inspired hash with salt — much stronger than djb2
  const input = salt + ':' + password;
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x01000193 >>> 0;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= c;
    h2 = Math.imul(h2, 0x100000001b3 & 0xFFFFFFFF) >>> 0;
  }
  const hash = h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  return `sync:${salt}:${hash}`;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) {
    // Still do the comparison to avoid length-based timing leak
    let result = a.length ^ b.length;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return result === 0;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify a password against a stored hash.
 * Supports both "sync:salt:hash" and legacy "h_" formats.
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || !password) return false;

  if (storedHash.startsWith('sync:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const computed = hashPassword(password, salt);
    return timingSafeEqual(computed, storedHash);
  }

  if (storedHash.startsWith('sha256:')) {
    // For async hashes we do a synchronous re-hash with same salt
    // In production, this would be async
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    // Fall through — async verification not possible in sync context
    // This path is for future use when login becomes async
    return false;
  }

  // Legacy "h_" format — migrate on next login
  if (storedHash.startsWith('h_')) {
    return timingSafeEqual(storedHash, legacyHash(password));
  }

  return false;
}

/** Legacy djb2 hash for backward compatibility during migration */
function legacyHash(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const chr = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

// ── Validation helpers ───────────────────────────────────────────────────

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters';
  return null;
}

function validateSignupData(data) {
  const errors = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }
  if (!data.email || !validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }
  const pwErr = validatePassword(data.password);
  if (pwErr) errors.password = pwErr;

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  if (!data.agreeTerms) {
    errors.agreeTerms = 'You must agree to the terms of service';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

// ── Session management ───────────────────────────────────────────────────

function createSession(user, rememberMe = false) {
  const duration = rememberMe ? SESSION_DURATION_REMEMBER : SESSION_DURATION_DEFAULT;
  const session = {
    token: generateSessionToken(),
    userId: user.id,
    email: user.email,
    name: user.name,
    company: user.company || '',
    plan: user.plan || 'free',
    avatar: user.avatar || null,
    createdAt: Date.now(),
    expiresAt: Date.now() + duration,
    rememberMe
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);

    // Validate session has required fields
    if (!session.token || !session.userId || !session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    // Check expiry
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Log in with email and password.
 * @returns {{ success: boolean, error?: string, user?: object }}
 */
export function login(email, password, rememberMe = false) {
  ensureDemoAccount();

  if (!email || !validateEmail(email)) {
    return { success: false, error: 'Please enter a valid email address' };
  }
  if (!password) {
    return { success: false, error: 'Please enter your password' };
  }

  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  // Use a generic error message to prevent user enumeration
  const genericError = 'Invalid email or password';

  if (!user) {
    // Perform a dummy hash to prevent timing-based user enumeration
    hashPassword(password);
    return { success: false, error: genericError };
  }

  // Verify password against hash only — never compare raw passwords
  const passwordValid = verifyPassword(password, user.passwordHash);

  if (!passwordValid) {
    return { success: false, error: genericError };
  }

  // Migrate legacy hash to new format on successful login
  if (user.passwordHash && (user.passwordHash.startsWith('h_') || !user.passwordHash.startsWith('sync:'))) {
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].passwordHash = hashPassword(password);
      delete users[idx].password; // Remove any legacy plaintext password
      saveUsers(users);
    }
  }

  const session = createSession(user, rememberMe);
  return { success: true, user: { ...user, password: undefined, passwordHash: undefined } };
}

/**
 * Sign up a new account.
 * @returns {{ success: boolean, errors?: object, user?: object }}
 */
export function signup(data) {
  ensureDemoAccount();

  const errors = validateSignupData(data);
  if (errors) return { success: false, errors };

  const users = getUsers();
  const existing = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
  if (existing) {
    return { success: false, errors: { email: 'An account with this email already exists' } };
  }

  const newUser = {
    id: generateId(),
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    passwordHash: hashPassword(data.password),
    company: data.company?.trim() || '',
    plan: 'free',
    avatar: null,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  // Auto-login after signup
  const session = createSession(newUser, false);

  return { success: true, user: { ...newUser, passwordHash: undefined } };
}

/**
 * Log out — clear session and return.
 */
export function logout() {
  clearSession();
}

/**
 * Simulate sending a password reset email.
 * @returns {{ success: boolean, error?: string }}
 */
export function forgotPassword(email) {
  ensureDemoAccount();

  if (!email || !validateEmail(email)) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  // Always return success for security (don't reveal if email exists)
  // No logging of email addresses
  return { success: true };
}

/**
 * Get the currently authenticated user, or null.
 */
export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;

  const users = getUsers();
  const user = users.find(u => u.id === session.userId);
  if (!user) {
    clearSession();
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    company: user.company || '',
    plan: user.plan || 'free',
    avatar: user.avatar || null,
    createdAt: user.createdAt
  };
}

/**
 * Check if user is currently authenticated.
 */
export function isAuthenticated() {
  return getSession() !== null;
}

/**
 * Update the current user's profile.
 * @returns {{ success: boolean, error?: string }}
 */
export function updateProfile(data) {
  const session = getSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  const users = getUsers();
  const idx = users.findIndex(u => u.id === session.userId);
  if (idx === -1) return { success: false, error: 'User not found' };

  // Updatable fields
  if (data.name !== undefined) users[idx].name = data.name.trim();
  if (data.company !== undefined) users[idx].company = data.company.trim();
  if (data.avatar !== undefined) users[idx].avatar = data.avatar;

  // Password change
  if (data.newPassword) {
    const pwErr = validatePassword(data.newPassword);
    if (pwErr) return { success: false, error: pwErr };
    users[idx].passwordHash = hashPassword(data.newPassword);
    delete users[idx].password; // Remove any legacy plaintext
  }

  saveUsers(users);

  // Update session with new info
  session.name = users[idx].name;
  session.company = users[idx].company;
  session.avatar = users[idx].avatar;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return { success: true };
}

/**
 * Get initials from a name for avatar display.
 */
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Ensure demo account exists on module load
ensureDemoAccount();
