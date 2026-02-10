import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, Key, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/utils/activityLog';
import { getClientIP } from '../../../lib/utils/rateLimit';
import { useAuth } from '../../../lib/contexts/AuthContext';

export const BaseSettings = () => {
  const { email } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasPlannedDays, setHasPlannedDays] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [settings, setSettings] = useState({
    slotDuration: 15,
    bufferTime: 0,
    captchaEnabled: false,
    sendConfirmation: true,
  });

  useEffect(() => {
    loadSettings();
    checkPlannedDays();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      const settingsMap = data.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);

      setSettings({
        slotDuration: settingsMap.slot_duration || 15,
        bufferTime: settingsMap.buffer_time || 0,
        captchaEnabled: settingsMap.captcha_enabled === true,
        sendConfirmation: settingsMap.send_booking_confirmation !== false,
      });
    }
  };

  const checkPlannedDays = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .limit(1);

    if (!error && data && data.length > 0) {
      setHasPlannedDays(true);
    } else {
      setHasPlannedDays(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Recheck if there are planned days
      await checkPlannedDays();

      const updates = [
        { key: 'slot_duration', value: settings.slotDuration },
        { key: 'buffer_time', value: settings.bufferTime },
        { key: 'captcha_enabled', value: settings.captchaEnabled },
        { key: 'send_booking_confirmation', value: settings.sendConfirmation },
      ];

      for (const update of updates) {
        await supabase
          .from('settings')
          .upsert(
            { key: update.key, value: update.value as any, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );
      }

      const ip = getClientIP();
      await logActivity('settings_updated', email, ip, { settings });

      setMessage({ type: 'success', text: 'Instellingen succesvol opgeslagen' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Er is een fout opgetreden bij het opslaan' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Wachtwoorden komen niet overeen' });
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Wachtwoord moet minimaal 8 tekens bevatten' });
      setPasswordLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      const ip = getClientIP();
      await logActivity('password_changed', email, ip);

      setPasswordMessage({ type: 'success', text: 'Wachtwoord succesvol gewijzigd' });
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      setPasswordMessage({
        type: 'error',
        text: error.message || 'Er is een fout opgetreden bij het wijzigen van het wachtwoord'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Basisinstellingen</h1>
        <p className="mt-2 text-gray-600">Configureer de standaard instellingen voor ouderavonden</p>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Slot Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gespreksduur (minuten)
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Hoelang duurt elk gesprek met een ouder?
          </p>
          {hasPlannedDays && (
            <div className="mb-3 p-3 bg-red-50 border border-red-300 rounded-lg">
              <p className="text-sm font-medium text-red-700">
                Gespreksduur kan niet worden gewijzigd wanneer er dagen gepland zijn. Verwijder eerst alle geplande dagen.
              </p>
            </div>
          )}
          <div className="flex gap-3">
            {[10, 15, 20].map((duration) => (
              <button
                key={duration}
                type="button"
                disabled={hasPlannedDays}
                onClick={() => !hasPlannedDays && setSettings({ ...settings, slotDuration: duration })}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  settings.slotDuration === duration
                    ? 'bg-blue-900 text-white'
                    : hasPlannedDays
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {duration} min
              </button>
            ))}
          </div>
        </div>

        {/* Buffer Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buffertijd (minuten)
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Extra tijd tussen gesprekken voor pauze en overloop
          </p>
          <div className="flex gap-3">
            {[0, 5, 10].map((buffer) => (
              <button
                key={buffer}
                type="button"
                onClick={() => setSettings({ ...settings, bufferTime: buffer })}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  settings.bufferTime === buffer
                    ? 'bg-blue-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {buffer} min
              </button>
            ))}
          </div>
        </div>

        {/* CAPTCHA Toggle */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">CAPTCHA Verificatie</label>
              <p className="text-sm text-gray-600 mt-1">
                Schakel CAPTCHA in om misbruik te voorkomen (standaard UIT)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, captchaEnabled: !settings.captchaEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.captchaEnabled ? 'bg-blue-900' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.captchaEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Email Confirmation Toggle */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bevestigingsmail Verzenden
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Stuur ouders een bevestigingsmail na het boeken
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings({ ...settings, sendConfirmation: !settings.sendConfirmation })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.sendConfirmation ? 'bg-blue-900' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.sendConfirmation ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="border-t border-gray-200 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={20} />
            {loading ? 'Bezig met opslaan...' : 'Instellingen Opslaan'}
          </button>
        </div>
      </form>

      {/* Password Change Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Key className="text-blue-900" size={24} />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Wachtwoord Wijzigen</h2>
            <p className="text-sm text-gray-600">Wijzig je admin wachtwoord</p>
          </div>
        </div>

        {passwordMessage && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-2 ${
              passwordMessage.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {passwordMessage.type === 'success' && <CheckCircle size={20} />}
            {passwordMessage.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Nieuw Wachtwoord
            </label>
            <input
              type="password"
              id="newPassword"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Minimaal 8 tekens"
              required
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Bevestig Nieuw Wachtwoord
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Herhaal wachtwoord"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Key size={20} />
            {passwordLoading ? 'Bezig met wijzigen...' : 'Wachtwoord Wijzigen'}
          </button>
        </form>
      </div>

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex gap-3">
          <SettingsIcon className="text-blue-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Hoe werken deze instellingen?</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>
                <strong>Gespreksduur:</strong> De lengte van elk tijdslot voor een ouderavond gesprek
              </li>
              <li>
                <strong>Buffertijd:</strong> Extra tijd tussen gesprekken. Een gesprek van 15 min met 5
                min buffer = tijdslots om de 20 minuten
              </li>
              <li>
                <strong>CAPTCHA:</strong> Kan later ingeschakeld worden als er misbruik wordt
                gedetecteerd
              </li>
              <li>
                <strong>Bevestigingsmail:</strong> Ouders ontvangen automatisch een bevestiging na het
                inplannen
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
