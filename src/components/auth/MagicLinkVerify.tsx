import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { verifyMagicLink } from '../../lib/utils/auth';
import { logActivity } from '../../lib/utils/activityLog';
import { getClientIP } from '../../lib/utils/rateLimit';
import { useAuth } from '../../lib/contexts/AuthContext';

interface MagicLinkVerifyProps {
  token: string;
}

export const MagicLinkVerify = ({ token }: MagicLinkVerifyProps) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { login } = useAuth();

  useEffect(() => {
    const verify = async () => {
      try {
        const result = await verifyMagicLink(token);

        if (result.valid && result.email) {
          const ip = getClientIP();
          await logActivity('magic_link_used', result.email, ip, { token });
          login(result.email, 'parent', token);
          setStatus('success');
          setMessage('U bent succesvol ingelogd!');
        } else {
          setStatus('error');
          setMessage('Deze link is ongeldig of verlopen.');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage('Er is een fout opgetreden bij het verifiëren van de link.');
      }
    };

    verify();
  }, [token, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verificatie...</h2>
              <p className="text-gray-600">Even geduld, we verifiëren uw link.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="text-green-600 mx-auto mb-4" size={48} />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Gelukt!</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <p className="text-sm text-gray-500">U wordt doorgestuurd naar de boekingspagina...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="text-red-600 mx-auto mb-4" size={48} />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Fout</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <a
                href="/"
                className="inline-block bg-blue-900 hover:bg-blue-800 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Terug naar home
              </a>
            </>
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
};
