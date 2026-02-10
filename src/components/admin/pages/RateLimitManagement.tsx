import { useState, useEffect } from 'react';
import { Shield, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface RateLimitLog {
  id: string;
  ip_address: string;
  email: string | null;
  action_type: string;
  created_at: string;
}

export const RateLimitManagement = () => {
  const [logs, setLogs] = useState<RateLimitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [selectedIp, setSelectedIp] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rate_limit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading rate limit logs:', error);
      alert('Fout bij laden van rate limit logs');
    } finally {
      setLoading(false);
    }
  };

  const deleteAllLogs = async () => {
    if (!confirm('Weet je zeker dat je ALLE rate limit logs wilt verwijderen?')) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('rate_limit_log')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
      alert('Alle rate limit logs zijn verwijderd');
      loadLogs();
    } catch (error) {
      console.error('Error deleting logs:', error);
      alert('Fout bij verwijderen van logs');
    } finally {
      setDeleting(false);
    }
  };

  const deleteOldLogs = async () => {
    if (!confirm('Weet je zeker dat je alle logs ouder dan 1 uur wilt verwijderen?')) {
      return;
    }

    setDeleting(true);
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('rate_limit_log')
        .delete()
        .lt('created_at', oneHourAgo);

      if (error) throw error;
      alert('Oude rate limit logs zijn verwijderd');
      loadLogs();
    } catch (error) {
      console.error('Error deleting old logs:', error);
      alert('Fout bij verwijderen van oude logs');
    } finally {
      setDeleting(false);
    }
  };

  const deleteByEmail = async () => {
    if (!selectedEmail) {
      alert('Voer een e-mailadres in');
      return;
    }

    if (!confirm(`Weet je zeker dat je alle logs voor ${selectedEmail} wilt verwijderen?`)) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('rate_limit_log')
        .delete()
        .eq('email', selectedEmail);

      if (error) throw error;
      alert(`Alle logs voor ${selectedEmail} zijn verwijderd`);
      setSelectedEmail('');
      loadLogs();
    } catch (error) {
      console.error('Error deleting logs by email:', error);
      alert('Fout bij verwijderen van logs');
    } finally {
      setDeleting(false);
    }
  };

  const deleteByIp = async () => {
    if (!selectedIp) {
      alert('Voer een IP-adres in');
      return;
    }

    if (!confirm(`Weet je zeker dat je alle logs voor IP ${selectedIp} wilt verwijderen?`)) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('rate_limit_log')
        .delete()
        .eq('ip_address', selectedIp);

      if (error) throw error;
      alert(`Alle logs voor IP ${selectedIp} zijn verwijderd`);
      setSelectedIp('');
      loadLogs();
    } catch (error) {
      console.error('Error deleting logs by IP:', error);
      alert('Fout bij verwijderen van logs');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getUniqueEmails = () => {
    const emails = logs
      .map(log => log.email)
      .filter((email): email is string => email !== null);
    return Array.from(new Set(emails));
  };

  const getUniqueIps = () => {
    const ips = logs.map(log => log.ip_address);
    return Array.from(new Set(ips));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rate Limit Beheer</h2>
          <p className="text-gray-600 mt-1">
            Beheer en reset rate limiting voor gebruikers
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Vernieuwen
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-yellow-800">
          <p className="font-medium">Let op!</p>
          <p className="mt-1">
            Rate limiting beschermt het systeem tegen misbruik. Verwijder logs alleen als
            een gebruiker legitiem geblokkeerd is. Logs ouder dan 1 uur hebben geen effect meer.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Totaal Logs</p>
              <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Shield className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Unieke E-mails</p>
              <p className="text-2xl font-bold text-gray-900">{getUniqueEmails().length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Unieke IP's</p>
              <p className="text-2xl font-bold text-gray-900">{getUniqueIps().length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Bulk Acties</h3>
          <p className="text-sm text-gray-600 mt-1">
            Verwijder rate limit logs op basis van verschillende criteria
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verwijder per E-mail
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecteer e-mail...</option>
                  {getUniqueEmails().map((email) => (
                    <option key={email} value={email}>
                      {email}
                    </option>
                  ))}
                </select>
                <button
                  onClick={deleteByEmail}
                  disabled={!selectedEmail || deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  Verwijder
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verwijder per IP-adres
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedIp}
                  onChange={(e) => setSelectedIp(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecteer IP...</option>
                  {getUniqueIps().map((ip) => (
                    <option key={ip} value={ip}>
                      {ip}
                    </option>
                  ))}
                </select>
                <button
                  onClick={deleteByIp}
                  disabled={!selectedIp || deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  Verwijder
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              onClick={deleteOldLogs}
              disabled={deleting}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash2 size={18} />
              Verwijder Oude Logs (&gt; 1 uur)
            </button>
            <button
              onClick={deleteAllLogs}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash2 size={18} />
              Verwijder ALLE Logs
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Rate Limit Logs</h3>
          <p className="text-sm text-gray-600 mt-1">
            Overzicht van alle rate limit pogingen
          </p>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
              <p>Laden...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Shield className="mx-auto mb-2 text-gray-400" size={48} />
              <p className="font-medium">Geen rate limit logs gevonden</p>
              <p className="text-sm mt-1">Er zijn momenteel geen geblokkeerde gebruikers</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tijdstip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-mail
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP-adres
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actie Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {log.ip_address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                        {log.action_type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
