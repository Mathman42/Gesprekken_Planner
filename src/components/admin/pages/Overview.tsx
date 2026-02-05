import { useEffect, useState } from 'react';
import { Calendar, Users, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Event, EventWithStats } from '../../../lib/types';

export const Overview = () => {
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalSlots: 0,
    bookedSlots: 0,
    availableSlots: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (eventsError) throw eventsError;

      // Load stats for each event
      const eventsWithStats: EventWithStats[] = [];
      let totalSlots = 0;
      let bookedSlots = 0;

      for (const event of eventsData || []) {
        const { data: slots } = await supabase
          .from('time_slots')
          .select('id, is_available')
          .eq('event_id', event.id);

        const { data: bookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('event_id', event.id);

        const total = slots?.length || 0;
        const booked = bookings?.length || 0;
        const available = slots?.filter((s) => s.is_available).length || 0;

        eventsWithStats.push({
          ...event,
          total_slots: total,
          booked_slots: booked,
          available_slots: available,
        });

        totalSlots += total;
        bookedSlots += booked;
      }

      setEvents(eventsWithStats);
      setStats({
        totalEvents: eventsData?.length || 0,
        totalSlots,
        bookedSlots,
        availableSlots: totalSlots - bookedSlots,
      });
    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Overzicht</h1>
        <p className="mt-2 text-gray-600">Dashboard voor ouderavond beheer</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Totaal Dagen</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalEvents}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Totaal Tijdslots</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSlots}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Geboekt</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.bookedSlots}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Beschikbaar</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.availableSlots}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Users className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Geplande Dagen</h2>
        </div>
        <div className="p-6">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">Nog geen dagen toegevoegd</p>
              <p className="text-sm text-gray-500 mt-2">
                Gebruik "Dag toevoegen" om een nieuwe ouderavond in te plannen
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(event.date).toLocaleDateString('nl-NL', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {event.start_time} - {event.end_time}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {event.booked_slots}/{event.total_slots}
                        </p>
                        <p className="text-sm text-gray-600">Geboekt</p>
                      </div>
                      <div className="flex items-center">
                        {event.is_booking_enabled ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                            Open
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                            Gesloten
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
