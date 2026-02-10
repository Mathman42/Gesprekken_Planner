import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthState } from '../types';
import { getAuthState, saveAuthState, clearAuthState } from '../utils/auth';
import { supabase } from '../supabase';

interface AuthContextType extends AuthState {
  login: (email: string, role: 'admin' | 'parent' | 'teacher', magicLinkToken?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(getAuthState());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const stored = getAuthState();
        if (stored.role && stored.email) {
          setAuthState({
            isAuthenticated: true,
            role: stored.role,
            email: stored.email,
            magicLinkToken: stored.magicLinkToken,
          });
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          role: null,
          email: null,
          magicLinkToken: null,
        });
        clearAuthState();
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const stored = getAuthState();
      if (stored.role && stored.email) {
        setAuthState({
          isAuthenticated: true,
          role: stored.role,
          email: stored.email,
          magicLinkToken: stored.magicLinkToken,
        });
      }
    } else {
      const stored = getAuthState();
      setAuthState(stored);
    }
    setLoading(false);
  };

  const login = (email: string, role: 'admin' | 'parent' | 'teacher', magicLinkToken?: string) => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Laden...</h1>
        </div>
      </div>
    );
  }

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
