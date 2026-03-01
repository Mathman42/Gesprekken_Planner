import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, CheckCircle, ChevronRight, BookOpen } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/contexts/AuthContext';
import type { TeacherAvailability, Teacher, TeacherSettings, TeacherAgenda } from '../../../lib/types';
import { generateSlotsForAvailabilityPeriod, deleteSlotsForAvailability } from '../../../lib/services/teacherSlotService';
import TimeSlotManager from '../TimeSlotManager';

export const AvailabilityManager = () => {
  const [availabilities, setAvailabilities] = useState<TeacherAvailability[]>([]);
  const [agendas, setAgendas] = useState<TeacherAgenda[]>([]);
  const [selectedAgenda, setSelectedAgenda] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherSettings, setTeacherSettings] = useState<TeacherSettings | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    start_time: '',
    end_time: '',
    agenda_id: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { email } = useAuth();

  useEffect(() => {
    loadTeacherData();
  }, [email]);

  useEffect(() => {
    if (teacherId) {
      loadAgendas();
    }
  }, [teacherId]);

  useEffect(() => {
    if (teacherId && selectedAgenda) {
      loadAvailabilities(teacherId, selectedAgenda);
    }
  }, [teacherId, selectedAgenda]);

  const loadTeacherData = async () => {
    if (!email) return;

    try {
      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (teacherError) throw teacherError;
      if (!teacher) {
        setError('Docent profiel niet gevonden');
        return;
      }

      setTeacherId(teacher.id);

      const { data: settings, error: settingsError } = await supabase
        .from('teacher_settings')
        .select('*')
        .eq('teacher_id', teacher.id)
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (settings) {
        setTeacherSettings(settings);
      } else {
        const { data: newSettings, error: insertError } = await supabase
          .from('teacher_settings')
          .insert({
            teacher_id: teacher.id,
            slot_duration: 15,
            buffer_time: 5,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setTeacherSettings(newSettings);
      }

    } catch (err) {
      console.error('Error loading teacher data:', err);
      setError('Fout bij het laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  const loadAgendas = async () => {
    if (!teacherId) return;

    try {
      const { data, error } = await supabase
        .from('teacher_agendas')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgendas(data || []);

      if (data && data.length > 0 && !selectedAgenda) {
        const activeAgenda = data.find(a => a.status === 'active') || data[0];
        setSelectedAgenda(activeAgenda.id);
      }
    } catch (err) {
      console.error('Error loading agendas:', err);
      setError('Fout bij het laden van agenda\'s');
    }
  };

  const loadAvailabilities = async (tId: string, agendaId: string) => {
    try {
      const { data, error } = await supabase
        .from('teacher_availability')
        .select('*')
        .eq('teacher_id', tId)
        .eq('agenda_id', agendaId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAvailabilities(data || []);
    } catch (err) {
      console.error('Error loading availabilities:', err);
      setError('Fout bij het laden van beschikbaarheden');
    }
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!teacherId) {
      setError('Docent ID niet gevonden');
      return;
    }

    if (!teacherSettings) {
      setError('Docent instellingen niet gevonden. Ga naar Instellingen om deze aan te maken.');
      return;
    }

    if (!formData.agenda_id) {
      setError('Selecteer een agenda');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      setError('Eindtijd moet na starttijd zijn');
      return;
    }

    try {
      const { data: newAvailability, error: insertError } = await supabase
        .from('teacher_availability')
        .insert({
          teacher_id: teacherId,
          agenda_id: formData.agenda_id,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          is_available: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const slotsResult = await generateSlotsForAvailabilityPeriod(
        newAvailability,
        teacherSettings.slot_duration,
        teacherSettings.buffer_time
      );

      if (!slotsResult.success) {
        throw new Error(slotsResult.error || 'Fout bij het genereren van tijdsloten');
      }

      setSuccess('Beschikbaarheid en tijdsloten succesvol toegevoegd');
      setFormData({ date: '', start_time: '', end_time: '', agenda_id: formData.agenda_id });
      setShowAddForm(false);
      if (selectedAgenda) {
        await loadAvailabilities(teacherId, selectedAgenda);
      }
    } catch (err) {
      console.error('Error adding availability:', err);
      setError('Fout bij het toevoegen van beschikbaarheid');
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze beschikbaarheid wilt verwijderen? Alle bijbehorende tijdsloten worden ook verwijderd.')) {
      return;
    }

    try {
      await deleteSlotsForAvailability(id);

      const { error: deleteError } = await supabase
        .from('teacher_availability')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSuccess('Beschikbaarheid en tijdsloten succesvol verwijderd');
      if (teacherId && selectedAgenda) {
        await loadAvailabilities(teacherId, selectedAgenda);
      }
    } catch (err) {
      console.error('Error deleting availability:', err);
      setError('Fout bij het verwijderen van beschikbaarheid');
    }
  };

  const getAgendaStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAgendaStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Actief';
      case 'closed': return 'Gesloten';
      case 'draft': return 'Concept';
      case 'archived': return 'Gearchiveerd';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (selectedDate && teacherId) {
    return (
      <TimeSlotManager
        teacherId={teacherId}
        date={selectedDate}
        onBack={() => setSelectedDate(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mijn Beschikbaarheid</h2>
          <p className="text-gray-600 mt-1">Beheer je beschikbare tijden voor ouderavonden</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (!showAddForm && selectedAgenda) {
              setFormData({ ...formData, agenda_id: selectedAgenda });
            }
          }}
          disabled={agendas.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
          Beschikbaarheid toevoegen
        </button>
      </div>

      {agendas.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          Je hebt nog geen agenda's aangemaakt. Ga naar "Agenda Beheer" om een agenda aan te maken.
        </div>
      )}

      {agendas.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecteer Agenda
          </label>
          <select
            value={selectedAgenda || ''}
            onChange={(e) => setSelectedAgenda(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {agendas.map((agenda) => (
              <option key={agenda.id} value={agenda.id}>
                {agenda.title} - {getAgendaStatusText(agenda.status)}
              </option>
            ))}
          </select>
          {selectedAgenda && (
            <div className="mt-2 flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAgendaStatusColor(agendas.find(a => a.id === selectedAgenda)?.status || '')}`}>
                {getAgendaStatusText(agendas.find(a => a.id === selectedAgenda)?.status || '')}
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nieuwe beschikbaarheid toevoegen</h3>
          <form onSubmit={handleAddAvailability} className="space-y-4">
            <div>
              <label htmlFor="agenda_id" className="block text-sm font-medium text-gray-700 mb-2">
                Agenda
              </label>
              <select
                id="agenda_id"
                value={formData.agenda_id}
                onChange={(e) => setFormData({ ...formData, agenda_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Selecteer een agenda</option>
                {agendas.map((agenda) => (
                  <option key={agenda.id} value={agenda.id}>
                    {agenda.title} - {getAgendaStatusText(agenda.status)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Datum
              </label>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                  Starttijd
                </label>
                <input
                  type="time"
                  id="start_time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                  Eindtijd
                </label>
                <input
                  type="time"
                  id="end_time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
              >
                Opslaan
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedAgenda && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {availabilities.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
              <p>Nog geen beschikbaarheden toegevoegd voor deze agenda</p>
              <p className="text-sm mt-2">Klik op "Beschikbaarheid toevoegen" om te beginnen</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {availabilities.map((availability) => (
                <div
                  key={availability.id}
                  className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <div
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                    onClick={() => setSelectedDate(availability.date)}
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar size={24} className="text-blue-900" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{formatDate(availability.date)}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Clock size={16} />
                        <span>
                          {formatTime(availability.start_time)} - {formatTime(availability.end_time)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-900 transition-colors" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAvailability(availability.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                    title="Verwijderen"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
