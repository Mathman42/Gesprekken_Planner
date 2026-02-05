import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthState } from '../types';
import { getAuthState, saveAuthState, clearAuthState } from '../utils/auth';
import { supabase } from '../supabase';

interface AuthContextType extends AuthState {
  login: (email: string, role: 'admin' | 'parent', magicLinkToken?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(getAuthState());

  useEffect(() => {
    const stored = getAuthState();
    setAuthState(stored);
  }, []);

  const login = (email: string, role: 'admin' | 'parent', magicLinkToken?: string) => {
    const newState: AuthState = {
      isAuthenticated: true,
      role,
      email,
      magicLinkToken: magicLinkToken || null,
    };
    setAuthState(newState);
    saveAuthState(newState);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    const newState: AuthState = {
      isAuthenticated: false,
      role: null,
      email: null,
      magicLinkToken: null,
    };
    setAuthState(newState);
    clearAuthState();
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
