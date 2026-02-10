import { useState, useEffect } from 'react';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { checkRateLimit, logRateLimit, getClientIP } from '../../lib/utils/rateLimit';
import { generateMagicToken } from '../../lib/utils/auth';
import { logActivity } from '../../lib/utils/activityLog';

interface ParentLoginProps {
  onBack?: () => void;
  onLoginSuccess: (email: string, requirePasswordChange: boolean) => void;
}

type LoginMethod = 'choose' | 'password' | 'magic-link';

export const ParentLogin = ({ onBack, onLoginSuccess }: ParentLoginProps) => {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkEnabled, setMagicLinkEnabled] = useState(true);

  useEffect(() => {
    loadMagicLinkSetting();
  }, []);

  const loadMagicLinkSetting = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'magic_link_enabled')
        .maybeSingle();

      if (data && data.value !== undefined) {
        setMagicLinkEnabled(data.value === true);
      }
    } catch (err) {
      console.error('Error loading magic link setting:', err);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const ip = getClientIP();

      const rateLimitCheck = await checkRateLimit(ip, email, 'parent_login');
      if (!rateLimitCheck.allowed) {
        setError(rateLimitCheck.reason || 'Te veel pogingen');
        setLoading(false);
        return;
      }

      await logRateLimit(ip, email, 'parent_login');

      const { data: parent, error: parentError } = await supabase
        .from('parents')
        .select('id, email, name, password_hash, password_must_change')
        .eq('email', email)
        .maybeSingle();

      if (parentError) throw parentError;

      if (!parent) {
        setError('Ongeldige inloggegevens');
        setLoading(false);
        return;
      }

      if (!parent.password_hash) {
        setError('Deze account heeft geen wachtwoord. Gebruik de magic link optie.');
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

      await logActivity('parent_login', email, ip, { method: 'password' });

      onLoginSuccess(email, parent.password_must_change);
    } catch (err) {
      setError('Er is een fout opgetreden. Probeer het opnieuw.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!magicLinkEnabled) {
      setError('Magic link inloggen is momenteel uitgeschakeld. Gebruik wachtwoord login.');
      setLoading(false);
      return;
    }

    try {
      const ip = getClientIP();

      const rateLimitCheck = await checkRateLimit(ip, email, 'magic_link_request');
      if (!rateLimitCheck.allowed) {
        setError(rateLimitCheck.reason || 'Te veel verzoeken');
        setLoading(false);
        return;
      }

      await logRateLimit(ip, email, 'magic_link_request');

      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!parent) {
        setError('Dit e-mailadres is niet bekend');
        setLoading(false);
        return;
      }

      const token = generateMagicToken();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      const { error: insertError } = await supabase.from('magic_links').insert({
        token,
        email,
        expires_at: expiresAt.toISOString(),
        created_ip: ip,
      });

      if (insertError) throw insertError;

      await logActivity('magic_link_request', email, ip);

      const magicLinkUrl = `${window.location.origin}/verify?token=${token}`;
      const emailResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-magic-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email,
            token,
            magicLinkUrl,
          }),
        }
      );

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error('Failed to send email:', errorData);
        throw new Error('Failed to send email');
      }

      setMagicLinkSent(true);
    } catch (err) {
      setError('Er is een fout opgetreden. Probeer het opnieuw.');
      console.error('Magic link error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Controleer uw e-mail</h2>
            <p className="text-gray-600 mb-6">
              U ontvangt binnen enkele minuten een link om in te loggen. De link is 15 minuten geldig.
            </p>
            <button
              onClick={() => {
                setMagicLinkSent(false);
                setLoginMethod('choose');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mx-auto"
            >
              <ArrowLeft size={20} />
              Terug
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loginMethod === 'choose') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white text-4xl font-bold">KC</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Ouder Inloggen</h1>
            <p className="text-gray-600 mt-2">Kempenhorst College</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setLoginMethod('password')}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-4 px-4 rounded-lg transition-colors flex items-center justify-center gap-3"
            >
              <Lock size={20} />
              Inloggen met wachtwoord
            </button>

            {magicLinkEnabled && (
              <button
                onClick={() => setLoginMethod('magic-link')}
                className="w-full bg-white hover:bg-gray-50 text-blue-900 font-medium py-4 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 border-2 border-blue-900"
              >
                <Mail size={20} />
                Inloggen met e-mail link
              </button>
            )}
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="mt-6 w-full text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2"
            >
              <ArrowLeft size={20} />
              Terug
            </button>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>Kempenhorst College</p>
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
  }

  if (loginMethod === 'password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white text-4xl font-bold">KC</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Inloggen met wachtwoord</h1>
            <p className="text-gray-600 mt-2">Kempenhorst College</p>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-mailadres
              </label>
              <input
                type="email"
                id="email"
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

          <button
            onClick={() => setLoginMethod('choose')}
            className="mt-4 w-full text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} />
            Andere inlogmethode
          </button>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>Kempenhorst College</p>
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
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-4xl font-bold">KC</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Inloggen met e-mail link</h1>
          <p className="text-gray-600 mt-2">Kempenhorst College</p>
        </div>

        <form onSubmit={handleMagicLinkRequest} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              E-mailadres
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="uw.email@voorbeeld.nl"
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              U ontvangt een inloglink per e-mail
            </p>
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
            <Mail size={20} />
            {loading ? 'Bezig met verzenden...' : 'Verstuur inloglink'}
          </button>
        </form>

        <button
          onClick={() => setLoginMethod('choose')}
          className="mt-4 w-full text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2"
        >
          <ArrowLeft size={20} />
          Andere inlogmethode
        </button>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>Kempenhorst College</p>
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
