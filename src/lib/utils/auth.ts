import { supabase } from '../supabase';
import type { AuthState } from '../types';

const AUTH_STORAGE_KEY = 'conference_auth';

export const saveAuthState = (state: AuthState): void => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
};

export const getAuthState = (): AuthState => {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { isAuthenticated: false, role: null, email: null, magicLinkToken: null };
    }
  }
  return { isAuthenticated: false, role: null, email: null, magicLinkToken: null };
};

export const clearAuthState = (): void => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const verifyAdminPassword = async (email: string, password: string): Promise<boolean> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return false;
  }

  return true;
};

export const generateMagicToken = (): string => {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const verifyMagicLink = async (token: string): Promise<{ valid: boolean; email?: string }> => {
  const { data, error } = await supabase
    .from('magic_links')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .maybeSingle();

  if (error || !data) {
    return { valid: false };
  }

  const now = new Date();
  const expiresAt = new Date(data.expires_at);

  if (now > expiresAt) {
    return { valid: false };
  }

  // Mark the link as used
  await supabase
    .from('magic_links')
    .update({ used_at: now.toISOString() })
    .eq('token', token);

  return { valid: true, email: data.email };
};
