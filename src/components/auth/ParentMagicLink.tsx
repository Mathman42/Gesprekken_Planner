import { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { checkRateLimit, logRateLimit, getClientIP } from '../../lib/utils/rateLimit';
import { generateMagicToken } from '../../lib/utils/auth';
import { logActivity } from '../../lib/utils/activityLog';

interface ParentMagicLinkProps {
  onBack?: () => void;
}

export const ParentMagicLink = ({ onBack }: ParentMagicLinkProps) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const ip = getClientIP();

      // Check rate limit
      const rateLimitCheck = await checkRateLimit(ip, email, 'magic_link_request');
      if (!rateLimitCheck.allowed) {
        setError(rateLimitCheck.reason || 'Te veel verzoeken');
        setLoading(false);
        return;
      }

      // Log the rate limit attempt
      await logRateLimit(ip, email, 'magic_link_request');

      // Generate magic link token
      const token = generateMagicToken();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      // Store the magic link
      const { error: insertError } = await supabase.from('magic_links').insert({
        token,
        email,
        expires_at: expiresAt.toISOString(),
        created_ip: ip,
      });

      if (insertError) throw insertError;

      // Log the activity
      await logActivity('magic_link_request', email, ip);

      // Send magic link email via edge function
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

      const emailResult = await emailResponse.json();
      console.log('Email sent:', emailResult);

      setSubmitted(true);
    } catch (err) {
      setError('Er is een fout opgetreden. Probeer het opnieuw.');
      console.error('Magic link error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Controleer uw e-mail</h2>
            <p className="text-gray-600 mb-6">
              Als uw e-mailadres geldig is, ontvangt u binnen enkele minuten een link om in te loggen.
              De link is 15 minuten geldig.
            </p>
            {onBack && (
              <button
                onClick={onBack}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mx-auto"
              >
                <ArrowLeft size={20} />
                Terug
              </button>
            )}
          </div>

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
          <h1 className="text-2xl font-bold text-gray-900">Ouderavond Inschrijven</h1>
          <p className="text-gray-600 mt-2">Kempenhorst College</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 w-full text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2"
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
};
