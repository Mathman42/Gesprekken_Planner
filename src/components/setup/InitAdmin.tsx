import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export const InitAdmin = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    initializeAdmin();
  }, []);

  const initializeAdmin = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/init-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setDetails(data);
      } else {
        setStatus('error');
        setMessage(data.error || 'Er is een fout opgetreden');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Netwerk fout');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Admin Account Initialiseren
              </h2>
              <p className="text-gray-600">Even geduld...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Succes!</h2>
              <p className="text-gray-600 mb-6">{message}</p>

              {details && (
                <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-2">Admin Inloggegevens:</p>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Email:</span> {details.email}
                  </p>
                  {details.defaultPassword && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Wachtwoord:</span> {details.defaultPassword}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-3">
                    ⚠️ Wijzig het wachtwoord na het eerste inloggen
                  </p>
                </div>
              )}

              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Ga naar Login
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Fout</h2>
              <p className="text-gray-600 mb-6">{message}</p>

              <button
                onClick={initializeAdmin}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors mb-3"
              >
                Opnieuw Proberen
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Terug naar Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
