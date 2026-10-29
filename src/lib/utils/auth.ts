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
      return { isAuthenticated: false, role: null, email: null };
    }
  }
  return { isAuthenticated: false, role: null, email: null };
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

export const verifyTeacherPassword = async (email: string, password: string): Promise<boolean> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return false;
  }

  // Verify that the user is a teacher
  const { data: teacherData, error: teacherError } = await supabase
    .from('teachers')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (teacherError || !teacherData) {
    return false;
  }

  return true;
};

