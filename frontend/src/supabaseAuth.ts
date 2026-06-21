import { supabase } from "./supabaseClient";
import type { AuthSession, AuthUser, RecommendationGoal } from "./types";

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  goal: RecommendationGoal | null;
  created_at: string | null;
};

function validateEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function validatePassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function profileToAuthUser(profile: ProfileRow, fallbackEmail: string): AuthUser {
  return {
    id: profile.id,
    name: profile.name ?? fallbackEmail.split("@")[0] ?? "FitQuest User",
    email: profile.email ?? fallbackEmail,
    goal: profile.goal ?? "general fitness",
    created_at: profile.created_at ?? new Date().toISOString(),
  };
}

async function ensureProfile(payload: {
  id: string;
  email: string;
  name?: string;
  goal?: RecommendationGoal;
  created_at?: string;
}): Promise<AuthUser> {
  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("id,name,email,goal,created_at")
    .eq("id", payload.id)
    .maybeSingle<ProfileRow>();

  if (fetchError) throw fetchError;

  if (existingProfile) {
    return profileToAuthUser(existingProfile, payload.email);
  }

  const profile = {
    id: payload.id,
    name: payload.name ?? payload.email.split("@")[0],
    email: payload.email,
    goal: payload.goal ?? "general fitness",
    created_at: payload.created_at ?? new Date().toISOString(),
  };

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .insert(profile)
    .select("id,name,email,goal,created_at")
    .single<ProfileRow>();

  if (insertError) throw insertError;
  return profileToAuthUser(insertedProfile, payload.email);
}

async function userToAuthSession(): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const session = data.session;
  if (!session?.user?.email) return null;

  const authUser = await ensureProfile({
    id: session.user.id,
    email: session.user.email,
    name: typeof session.user.user_metadata.name === "string" ? session.user.user_metadata.name : undefined,
    goal: session.user.user_metadata.goal as RecommendationGoal | undefined,
    created_at: session.user.created_at,
  });

  return { token: session.access_token, user: authUser };
}

export async function getSupabaseAuthSession(): Promise<AuthSession | null> {
  return userToAuthSession();
}

export function onSupabaseAuthChange(callback: (session: AuthSession | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user?.email) {
      callback(null);
      return;
    }

    void ensureProfile({
      id: session.user.id,
      email: session.user.email,
      name: typeof session.user.user_metadata.name === "string" ? session.user.user_metadata.name : undefined,
      goal: session.user.user_metadata.goal as RecommendationGoal | undefined,
      created_at: session.user.created_at,
    }).then((authUser) => callback({ token: session.access_token, user: authUser }));
  });

  return () => data.subscription.unsubscribe();
}

export async function registerSupabaseAccount(payload: {
  name: string;
  email: string;
  password: string;
  goal: RecommendationGoal;
}): Promise<AuthSession> {
  const email = payload.email.trim().toLowerCase();
  if (payload.name.trim().length < 2) throw new Error("Enter your name.");
  if (!validateEmail(email)) throw new Error("Enter a valid email address.");
  if (!validatePassword(payload.password)) throw new Error("Password must be 8+ characters with letters and numbers.");

  const { data, error } = await supabase.auth.signUp({
    email,
    password: payload.password,
    options: {
      data: {
        name: payload.name.trim(),
        goal: payload.goal,
      },
    },
  });

  if (error) throw error;
  if (!data.user?.email) {
    throw new Error("Check your email to confirm your account, then log in.");
  }

  const authUser = await ensureProfile({
    id: data.user.id,
    email: data.user.email,
    name: payload.name.trim(),
    goal: payload.goal,
    created_at: data.user.created_at,
  });

  return {
    token: data.session?.access_token ?? "",
    user: authUser,
  };
}

export async function loginSupabaseAccount(emailInput: string, password: string): Promise<AuthSession> {
  const email = emailInput.trim().toLowerCase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const session = await userToAuthSession();
  if (!session) throw new Error("Could not start your session.");
  return session;
}

export async function logoutSupabaseAccount() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function updateSupabaseProfileName(userId: string | number, name: string): Promise<AuthUser> {
  const trimmedName = name.trim();
  if (trimmedName.length < 2) throw new Error("Enter your name.");

  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .update({ name: trimmedName })
    .eq("id", String(userId))
    .select("id,name,email,goal,created_at")
    .single<ProfileRow>();

  if (error) throw error;
  return profileToAuthUser(updatedProfile, updatedProfile.email ?? "");
}

export async function changeSupabasePassword(_currentPassword: string, newPassword: string) {
  if (!validatePassword(newPassword)) throw new Error("New password must be 8+ characters with letters and numbers.");
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
