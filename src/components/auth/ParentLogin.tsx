import { useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { checkRateLimit, logRateLimit, getClientIP } from '../../lib/utils/rateLimit';
import { logActivity } from '../../lib/utils/activityLog';

interface ParentLoginProps {
  onLoginSuccess: (email: string, requirePasswordChange: boolean) => void;
  onStaffLogin: () => void;
}

export const ParentLogin = ({ onLoginSuccess, onStaffLogin }: ParentLoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const ip = getClientIP();

      const rateLimitCheck = await checkRateLimit(ip, normalizedEmail, 'parent_login');
      if (!rateLimitCheck.allowed) {
        setError(rateLimitCheck.reason || 'Te veel pogingen');
        setLoading(false);
        return;
      }

      await logRateLimit(ip, normalizedEmail, 'parent_login');

      const { data: parent, error: parentError } = await supabase
        .from('parents')
        .select('id, email, name, password_hash, password_must_change')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (parentError) throw parentError;

      if (!parent || !parent.password_hash) {
        setError('Ongeldige inloggegevens');
        setLoading(false);
        return;
      }

      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(password, parent.password_hash);

      if (!isValid) {
        setError('Ongeldige inloggegevens');
        setLoading(false);
        return;
      }

      await logActivity('parent_login', normalizedEmail, ip, { method: 'password' });

      onLoginSuccess(normalizedEmail, parent.password_must_change);
    } catch (err) {
      setError('Er is een fout opgetreden. Probeer het opnieuw.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-4xl font-bold">KC</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Plan een gesprek</h1>
          <p className="text-gray-600 mt-2">Log in met uw e-mailadres en wachtwoord</p>
        </div>

        <form onSubmit={handlePasswordLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Inlognaam (e-mailadres)
            </label>
            <input
              type="email"
              id="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="uw.email@voorbeeld.nl"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Wachtwoord
            </label>
            <input
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock size={20} />
            {loading ? 'Bezig met inloggen...' : 'Inloggen'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          <button
            onClick={onStaffLogin}
            className="text-blue-700 hover:text-blue-900 font-medium underline underline-offset-4"
          >
            Personeelslogin
          </button>
          <p className="mt-4">Kempenhorst College</p>
          <p>Eikenbussel 1, 5689 AA Oirschot</p>
          <p>T: +31 (0)499 58 21 60</p>
          <p className="mt-2">
            <a href="https://kempenhorst.nl" className="text-blue-600 hover:underline">
              kempenhorst.nl
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
