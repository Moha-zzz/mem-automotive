import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (!error && data.session) {
    localStorage.setItem('auth_token', data.session.access_token);
    localStorage.setItem('refresh_token', data.session.refresh_token);
  }
  return { data, error };
}

export async function signOut() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  const { error } = await supabase.auth.signOut();
  return error;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

export async function refreshSession() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (!error && data.session) {
    localStorage.setItem('auth_token', data.session.access_token);
    localStorage.setItem('refresh_token', data.session.refresh_token);
    return data.session;
  }
  return null;
}
