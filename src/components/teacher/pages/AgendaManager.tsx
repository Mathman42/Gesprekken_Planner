import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit, Trash2, Lock, Unlock, Archive, Eye } from 'lucide-react';
import { agendaService } from '../../../lib/services/agendaService';
import type { TeacherAgendaWithStats } from '../../../lib/types';

interface AgendaManagerProps {
  teacherId: string;
  onEditAgenda: (agendaId: string) => void;
  onViewAgenda: (agendaId: string) => void;
  onCreateNew: () => void;
}

export default function AgendaManager({
  teacherId,
  onEditAgenda,
  onViewAgenda,
  onCreateNew,
}: AgendaManagerProps) {
  const [agendas, setAgendas] = useState<TeacherAgendaWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgendas();
  }, [teacherId]);

  const loadAgendas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agendaService.getTeacherAgendasWithStats(teacherId);
      setAgendas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agendas');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBooking = async (agendaId: string, currentState: boolean) => {
    try {
      await agendaService.toggleBooking(agendaId, !currentState);
      await loadAgendas();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle booking');
    }
  };

  const handleCloseAgenda = async (agendaId: string) => {
    if (!confirm('Weet je zeker dat je deze agenda wilt sluiten? Ouders kunnen geen nieuwe tijdslots meer boeken.')) {
      return;
    }

    try {
      await agendaService.closeAgenda(agendaId);
      await loadAgendas();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to close agenda');
    }
  };

  const handleArchiveAgenda = async (agendaId: string) => {
    if (!confirm('Deze agenda archiveren? Het wordt verborgen uit de lijst maar alle gegevens blijven bewaard.')) {
      return;
    }

    try {
      await agendaService.archiveAgenda(agendaId);
      await loadAgendas();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to archive agenda');
    }
  };

  const handleDeleteAgenda = async (agendaId: string) => {
    if (!confirm('Deze concept agenda verwijderen? Deze actie kan niet ongedaan worden gemaakt.')) {
      return;
    }

    try {
      await agendaService.deleteAgenda(agendaId);
      await loadAgendas();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete agenda');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading agendas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Mijn Agenda's</h2>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Maak Nieuwe Agenda
        </button>
      </div>

      {agendas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen agenda's</h3>
          <p className="text-gray-600 mb-6">Maak je eerste agenda om gesprekstijdslots te beheren</p>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Maak Nieuwe Agenda
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {agendas.map((agenda) => (
            <div
              key={agenda.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{agenda.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(agenda.status)}`}>
                      {agenda.status}
                    </span>
                    {agenda.is_booking_open && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Boeken Open
                      </span>
                    )}
                  </div>
                  {agenda.description && (
                    <p className="text-gray-600 text-sm mb-3">{agenda.description}</p>
                  )}
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(agenda.start_date).toLocaleDateString()} - {new Date(agenda.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 py-4 border-t border-b border-gray-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{agenda.total_slots}</div>
                  <div className="text-sm text-gray-600">Totaal Tijdslots</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{agenda.booked_slots}</div>
                  <div className="text-sm text-gray-600">Geboekt</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{agenda.available_slots}</div>
                  <div className="text-sm text-gray-600">Beschikbaar</div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onViewAgenda(agenda.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Bekijk Boekingen
                </button>

                {agenda.status !== 'archived' && (
                  <button
                    onClick={() => onEditAgenda(agenda.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Bewerken
                  </button>
                )}

                {agenda.status === 'active' && (
                  <button
                    onClick={() => handleToggleBooking(agenda.id, agenda.is_booking_open)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors ${
                      agenda.is_booking_open
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {agenda.is_booking_open ? (
                      <>
                        <Lock className="w-4 h-4" />
                        Boeken Sluiten
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        Boeken Openen
                      </>
                    )}
                  </button>
                )}

                {agenda.status === 'active' && (
                  <button
                    onClick={() => handleCloseAgenda(agenda.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    Sluit Agenda
                  </button>
                )}

                {(agenda.status === 'closed' || agenda.status === 'active') && (
                  <button
                    onClick={() => handleArchiveAgenda(agenda.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    Archiveren
                  </button>
                )}

                {agenda.status === 'draft' && (
                  <button
                    onClick={() => handleDeleteAgenda(agenda.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Verwijderen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
