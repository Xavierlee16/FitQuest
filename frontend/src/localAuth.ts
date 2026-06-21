import type { AuthSession, AuthUser, RecommendationGoal } from "./types";

const ACCOUNTS_KEY = "fitquest.localAccounts";
const SESSION_KEY = "fitquest.localSession";

type LocalAccount = AuthUser & {
  password_hash: string;
};

function getAccounts(): LocalAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as LocalAccount[];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: LocalAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

async function hashPassword(password: string) {
  const encoded = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function validateEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function validatePassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function getLocalSession(): AuthSession | null {
  const saved = localStorage.getItem(SESSION_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as AuthSession;
  } catch {
    return null;
  }
}

export async function registerLocalAccount(payload: {
  name: string;
  email: string;
  password: string;
  goal: RecommendationGoal;
}): Promise<AuthSession> {
  const email = payload.email.trim().toLowerCase();
  if (payload.name.trim().length < 2) throw new Error("Enter your name.");
  if (!validateEmail(email)) throw new Error("Enter a valid email address.");
  if (!validatePassword(payload.password)) throw new Error("Password must be 8+ characters with letters and numbers.");

  const accounts = getAccounts();
  if (accounts.some((account) => account.email === email)) {
    throw new Error("An account with this email already exists.");
  }

  const user: LocalAccount = {
    id: crypto.randomUUID(),
    name: payload.name.trim(),
    email,
    goal: payload.goal,
    created_at: new Date().toISOString(),
    password_hash: await hashPassword(payload.password),
  };
  accounts.push(user);
  saveAccounts(accounts);

  const session = { token: crypto.randomUUID(), user };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function loginLocalAccount(emailInput: string, password: string): Promise<AuthSession> {
  const email = emailInput.trim().toLowerCase();
  const account = getAccounts().find((item) => item.email === email);
  if (!account || account.password_hash !== (await hashPassword(password))) {
    throw new Error("Invalid email or password.");
  }

  const session = { token: crypto.randomUUID(), user: account };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logoutLocalAccount() {
  localStorage.removeItem(SESSION_KEY);
}

export function updateLocalAccountName(userId: string | number, name: string): AuthUser {
  const accounts = getAccounts();
  const account = accounts.find((item) => item.id === userId);
  if (!account) throw new Error("Account not found.");
  account.name = name.trim();
  saveAccounts(accounts);
  const session = getLocalSession();
  if (session) {
    session.user = account;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return account;
}

export async function changeLocalPassword(userId: string | number, currentPassword: string, newPassword: string) {
  if (!validatePassword(newPassword)) throw new Error("New password must be 8+ characters with letters and numbers.");
  const accounts = getAccounts();
  const account = accounts.find((item) => item.id === userId);
  if (!account || account.password_hash !== (await hashPassword(currentPassword))) {
    throw new Error("Current password is incorrect.");
  }
  account.password_hash = await hashPassword(newPassword);
  saveAccounts(accounts);
}
