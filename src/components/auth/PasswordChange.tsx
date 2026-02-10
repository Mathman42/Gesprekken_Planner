import { useState } from 'react';
import { Lock, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PasswordChangeProps {
  email: string;
  userType: 'parent' | 'teacher';
  isRequired?: boolean;
  onSuccess: () => void;
}

export const PasswordChange = ({ email, userType, isRequired = false, onSuccess }: PasswordChangeProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Wachtwoord moet minimaal 8 karakters lang zijn';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Wachtwoord moet minimaal één hoofdletter bevatten';
    }
    if (!/[a-z]/.test(password)) {
      return 'Wachtwoord moet minimaal één kleine letter bevatten';
    }
    if (!/[0-9]/.test(password)) {
      return 'Wachtwoord moet minimaal één cijfer bevatten';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        setError('Wachtwoorden komen niet overeen');
        setLoading(false);
        return;
      }

      const validationError = validatePassword(newPassword);
      if (validationError) {
        setError(validationError);
        setLoading(false);
        return;
      }

      if (!isRequired) {
        const table = userType === 'parent' ? 'parents' : 'teachers';
        const { data: userData } = await supabase
          .from(table)
          .select('password_hash')
          .eq('email', email)
          .single();

        if (userData && userData.password_hash) {
          const bcrypt = await import('bcryptjs');
          const isValid = await bcrypt.compare(currentPassword, userData.password_hash);

          if (!isValid) {
            setError('Huidig wachtwoord is onjuist');
            setLoading(false);
            return;
          }
        }
      }

      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const table = userType === 'parent' ? 'parents' : 'teachers';
      const { error: updateError } = await supabase
        .from(table)
        .update({
          password_hash: hashedPassword,
          password_must_change: false,
        })
        .eq('email', email);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      setError('Er is een fout opgetreden. Probeer het opnieuw.');
      console.error('Password change error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Wachtwoord gewijzigd</h2>
            <p className="text-gray-600">
              Uw wachtwoord is succesvol gewijzigd. U wordt doorgestuurd...
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
          <h1 className="text-2xl font-bold text-gray-900">
            {isRequired ? 'Wachtwoord instellen' : 'Wachtwoord wijzigen'}
          </h1>
          <p className="text-gray-600 mt-2">Kempenhorst College</p>
          {isRequired && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              U moet uw wachtwoord wijzigen voordat u verder kunt gaan.
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isRequired && (
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Huidig wachtwoord
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Nieuw wachtwoord
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
            <ul className="mt-2 text-xs text-gray-600 space-y-1">
              <li>• Minimaal 8 karakters</li>
              <li>• Minimaal één hoofdletter</li>
              <li>• Minimaal één kleine letter</li>
              <li>• Minimaal één cijfer</li>
            </ul>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Bevestig nieuw wachtwoord
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Bezig met wijzigen...' : 'Wachtwoord wijzigen'}
          </button>
        </form>

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
