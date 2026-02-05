import { useState, useEffect } from 'react';
import { FileText, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { getActivityLogs } from '../../../lib/utils/activityLog';
import type { ActivityLog } from '../../../lib/types';

const ITEMS_PER_PAGE = 20;

const actionLabels: Record<string, string> = {
  admin_login: 'Admin Login',
  admin_logout: 'Admin Uitgelogd',
  magic_link_request: 'Magic Link Aangevraagd',
  magic_link_used: 'Magic Link Gebruikt',
  event_created: 'Dag Aangemaakt',
  event_updated: 'Dag Bijgewerkt',
  event_deleted: 'Dag Verwijderd',
  slot_created: 'Tijdslot Aangemaakt',
  slot_updated: 'Tijdslot Bijgewerkt',
  slot_deleted: 'Tijdslot Verwijderd',
  booking_created: 'Boeking Aangemaakt',
  booking_cancelled: 'Boeking Geannuleerd',
  settings_updated: 'Instellingen Bijgewerkt',
};

export const ActivityLogPage = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, [currentPage, actionFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const filters = actionFilter ? { actionType: actionFilter as any } : undefined;
      const { data, count, error } = await getActivityLogs(
        ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
        filters
      );

      if (!error && data) {
        setLogs(data);
        setTotalCount(count || 0);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const formatDetails = (details: any): string => {
    if (!details) return '';
    if (typeof details === 'string') return details;
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Logboek</h1>
        <p className="mt-2 text-gray-600">Bekijk alle systeemactiviteiten en gebeurtenissen</p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <Filter className="text-gray-400" size={20} />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter op actie type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Alle acties</option>
              {Object.entries(actionLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600">
            <strong>{totalCount}</strong> activiteiten
          </div>
        </div>
      </div>

      {/* Activity Log Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Laden...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">Geen activiteiten gevonden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum & Tijd
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gebruiker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Adres
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleDateString('nl-NL')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(log.created_at).toLocaleTimeString('nl-NL')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {actionLabels[log.action_type] || log.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.actor_email || <span className="text-gray-400">Systeem</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 font-mono">
                        {log.actor_ip || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {formatDetails(log.details) || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Pagina {currentPage + 1} van {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ChevronLeft size={18} />
                  Vorige
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Volgende
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
