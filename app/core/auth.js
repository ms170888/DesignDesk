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
  password: 'demo1234',
  company: 'DesignDesk Studio',
  plan: 'pro',
  avatar: null,
  createdAt: '2025-01-15T00:00:00.000Z'
};

function ensureDemoAccount() {
  const users = getUsers();
  if (!users.find(u => u.email === DEMO_USER.email)) {
    users.push({ ...DEMO_USER });
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

function hashPassword(password) {
  // Simple hash for demo purposes — NOT for production
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
    // Check expiry
    if (session.expiresAt && Date.now() > session.expiresAt) {
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

  if (!user) {
    return { success: false, error: 'No account found with this email' };
  }

  // Check password — compare raw for demo, or hashed
  if (user.password !== password && user.passwordHash && user.passwordHash !== hashPassword(password)) {
    return { success: false, error: 'Incorrect password' };
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
    password: data.password, // Store raw for demo
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

  return { success: true, user: { ...newUser, password: undefined, passwordHash: undefined } };
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

  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  // Always return success for security (don't reveal if email exists)
  // But log if user was found for debugging
  if (user) {
    console.debug('[auth] Reset email would be sent to:', email);
  }

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
    users[idx].password = data.newPassword;
    users[idx].passwordHash = hashPassword(data.newPassword);
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
