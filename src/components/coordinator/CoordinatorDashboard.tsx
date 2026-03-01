import { useState, useEffect } from 'react';
import { Calendar, LogOut, Users, BookOpen, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/contexts/AuthContext';

interface AgendaWithTeacher {
  id: string;
  title: string;
  teacher_id: string;
  teacher_name: string;
  status: string;
}

interface BookingStats {
  date: string;
  last_conversation_time: string;
  booking_count: number;
}

export default function CoordinatorDashboard() {
  const [agendas, setAgendas] = useState<AgendaWithTeacher[]>([]);
  const [selectedAgenda, setSelectedAgenda] = useState<string | null>(null);
  const [bookingStats, setBookingStats] = useState<BookingStats[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { email, logout } = useAuth();

  useEffect(() => {
    loadAccessibleAgendas();
  }, [email]);

  useEffect(() => {
    if (selectedAgenda) {
      loadBookingStats();
    }
  }, [selectedAgenda, dateRange]);

  const loadAccessibleAgendas = async () => {
    if (!email) return;

    try {
      setLoading(true);
      const { data: coordinator } = await supabase
        .from('coordinators')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!coordinator) {
        setError('Coordinator profiel niet gevonden');
        return;
      }

      const { data: agendaAccess, error: accessError } = await supabase
        .from('coordinator_agenda_access')
        .select(`
          agenda_id,
          teacher_agendas:teacher_agendas(
            id,
            title,
            status,
            teacher_id,
            teachers:teachers(name)
          )
        `)
        .eq('coordinator_id', coordinator.id);

      if (accessError) throw accessError;

      const agendasWithTeacher: AgendaWithTeacher[] = agendaAccess?.map((access: any) => ({
        id: access.teacher_agendas.id,
        title: access.teacher_agendas.title,
        teacher_id: access.teacher_agendas.teacher_id,
        teacher_name: access.teacher_agendas.teachers.name,
        status: access.teacher_agendas.status,
      })) || [];

      setAgendas(agendasWithTeacher);

      if (agendasWithTeacher.length > 0 && !selectedAgenda) {
        setSelectedAgenda(agendasWithTeacher[0].id);
      }
    } catch (err) {
      console.error('Error loading agendas:', err);
      setError('Fout bij het laden van agenda\'s');
    } finally {
      setLoading(false);
    }
  };

  const loadBookingStats = async () => {
    if (!selectedAgenda) return;

    try {
      const { data: bookings, error: bookingsError } = await supabase
        .from('teacher_bookings')
        .select(`
          id,
          teacher_time_slots:teacher_time_slots(
            date,
            start_time,
            end_time
          )
        `)
        .eq('agenda_id', selectedAgenda)
        .gte('teacher_time_slots.date', dateRange.start)
        .lte('teacher_time_slots.date', dateRange.end)
        .order('teacher_time_slots.date', { ascending: true });

      if (bookingsError) throw bookingsError;

      const statsByDate: Record<string, { times: string[], count: number }> = {};

      bookings?.forEach((booking: any) => {
        const slot = booking.teacher_time_slots;
        if (!slot) return;

        if (!statsByDate[slot.date]) {
          statsByDate[slot.date] = { times: [], count: 0 };
        }

        statsByDate[slot.date].times.push(slot.start_time);
        statsByDate[slot.date].count++;
      });

      const stats: BookingStats[] = Object.entries(statsByDate).map(([date, data]) => ({
        date,
        last_conversation_time: data.times.sort().reverse()[0] || '',
        booking_count: data.count,
      }));

      setBookingStats(stats.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (err) {
      console.error('Error loading booking stats:', err);
      setError('Fout bij het laden van gespreksstatistieken');
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

  const selectedAgendaInfo = agendas.find(a => a.id === selectedAgenda);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Coordinator Dashboard</h1>
                <p className="text-sm text-gray-600">{email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Uitloggen
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {agendas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Geen toegang tot agenda's
            </h3>
            <p className="text-gray-600">
              Je hebt nog geen toegang tot docent agenda's. Neem contact op met een docent om toegang te krijgen.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Selecteer Agenda</h2>
              <select
                value={selectedAgenda || ''}
                onChange={(e) => setSelectedAgenda(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {agendas.map((agenda) => (
                  <option key={agenda.id} value={agenda.id}>
                    {agenda.teacher_name} - {agenda.title}
                  </option>
                ))}
              </select>

              {selectedAgendaInfo && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Users className="w-4 h-4" />
                    <span>Docent: {selectedAgendaInfo.teacher_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                    <BookOpen className="w-4 h-4" />
                    <span>Status: {selectedAgendaInfo.status}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Datumbereik</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Van
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tot
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Geplande Gesprekken</h2>
              </div>

              {bookingStats.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p>Geen gesprekken gevonden in het geselecteerde datumbereik</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {bookingStats.map((stat) => (
                    <div key={stat.date} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-blue-900" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{formatDate(stat.date)}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>Laatste gesprek: {formatTime(stat.last_conversation_time)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>{stat.booking_count} gesprek(ken)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
