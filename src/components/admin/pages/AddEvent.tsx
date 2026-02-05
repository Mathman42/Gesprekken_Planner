import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/utils/activityLog';
import { getClientIP } from '../../../lib/utils/rateLimit';
import { useAuth } from '../../../lib/contexts/AuthContext';
import type { Event, TimeSlotWithBooking } from '../../../lib/types';

export const AddEvent = () => {
  const { email } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [slots, setSlots] = useState<TimeSlotWithBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    startTime: '13:00',
    endTime: '21:00',
  });

  const [settings, setSettings] = useState({
    slotDuration: 15,
    bufferTime: 0,
    bookingOpenAt: '',
    bookingCloseAt: '',
    autoClose: true,
  });

  useEffect(() => {
    loadEvents();
    loadSettings();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadSlots(selectedEvent.id);
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false });
    if (data) setEvents(data);
  };

  const loadSettings = async () => {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      const settingsMap = data.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);

      setSettings((prev) => ({
        ...prev,
        slotDuration: settingsMap.slot_duration || 15,
        bufferTime: settingsMap.buffer_time || 0,
      }));
    }
  };

  const loadSlots = async (eventId: string) => {
    const { data: slotsData } = await supabase
      .from('time_slots')
      .select('*')
      .eq('event_id', eventId)
      .order('start_time');

    if (slotsData) {
      const slotsWithBookings = await Promise.all(
        slotsData.map(async (slot) => {
          const { data: booking } = await supabase
            .from('bookings')
            .select('*')
            .eq('slot_id', slot.id)
            .maybeSingle();
          return { ...slot, booking: booking || null };
        })
      );
      setSlots(slotsWithBookings);
    }
  };

  const generateSlots = () => {
    const { startTime, endTime, date } = formData;
    const { slotDuration, bufferTime } = settings;

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    const interval = slotDuration + bufferTime;

    const generatedSlots: TimeSlotWithBooking[] = [];
    let current = start;

    while (current < end) {
      const slotEnd = new Date(current.getTime() + slotDuration * 60000);
      if (slotEnd > end) break;

      generatedSlots.push({
        id: crypto.randomUUID(),
        event_id: '',
        date: date,
        start_time: current.toTimeString().slice(0, 5),
        end_time: slotEnd.toTimeString().slice(0, 5),
        is_available: true,
        created_at: new Date().toISOString(),
        booking: null,
      });

      current = new Date(current.getTime() + interval * 60000);
    }

    return generatedSlots;
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Set default booking times if not set
      const bookingOpenAt = settings.bookingOpenAt || new Date().toISOString();
      const bookingCloseAt = settings.bookingCloseAt || `${formData.date}T${formData.startTime}`;

      // Create event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          name: formData.name,
          date: formData.date,
          start_time: formData.startTime,
          end_time: formData.endTime,
          slot_duration: settings.slotDuration,
          buffer_time: settings.bufferTime,
          booking_open_at: bookingOpenAt,
          booking_close_at: bookingCloseAt,
          auto_close_on_start: settings.autoClose,
          is_booking_enabled: true,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Generate and insert slots
      const generatedSlots = generateSlots();
      const slotsToInsert = generatedSlots.map((slot) => ({
        event_id: event.id,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available,
      }));

      const { error: slotsError } = await supabase.from('time_slots').insert(slotsToInsert);

      if (slotsError) throw slotsError;

      // Log activity
      const ip = getClientIP();
      await logActivity('event_created', email, ip, {
        event_id: event.id,
        name: formData.name,
        date: formData.date,
        slots: generatedSlots.length,
      });

      setMessage({ type: 'success', text: `Dag succesvol toegevoegd met ${generatedSlots.length} tijdslots` });
      loadEvents();
      setFormData({ name: '', date: '', startTime: '13:00', endTime: '21:00' });
    } catch (error) {
      console.error('Error creating event:', error);
      setMessage({ type: 'error', text: 'Er is een fout opgetreden bij het toevoegen van de dag' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSlot = async (slotId: string, currentAvailability: boolean) => {
    const { error } = await supabase
      .from('time_slots')
      .update({ is_available: !currentAvailability })
      .eq('id', slotId);

    if (!error && selectedEvent) {
      loadSlots(selectedEvent.id);
      const ip = getClientIP();
      await logActivity('slot_updated', email, ip, {
        slot_id: slotId,
        is_available: !currentAvailability,
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Weet u zeker dat u deze dag wilt verwijderen? Alle tijdslots en boekingen worden ook verwijderd.')) {
      return;
    }

    const { error } = await supabase.from('events').delete().eq('id', eventId);

    if (!error) {
      const ip = getClientIP();
      await logActivity('event_deleted', email, ip, { event_id: eventId });
      loadEvents();
      setSelectedEvent(null);
      setSlots([]);
      setMessage({ type: 'success', text: 'Dag succesvol verwijderd' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dag Toevoegen</h1>
        <p className="mt-2 text-gray-600">Voeg een nieuwe ouderavond toe en beheer tijdslots</p>
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

      {/* Create Event Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Nieuwe Dag Aanmaken</h2>
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Naam van de dag
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ouderavond December 2024"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Starttijd</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Eindtijd (max 23:00)
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                max="23:00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus size={20} />
            {loading ? 'Bezig met aanmaken...' : 'Dag Aanmaken'}
          </button>
        </form>
      </div>

      {/* Events List with Slots */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Bestaande Dagen</h2>
        {events.length === 0 ? (
          <p className="text-gray-600 text-center py-8">Nog geen dagen toegevoegd</p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(event.date).toLocaleDateString('nl-NL')} • {event.start_time} -{' '}
                      {event.end_time}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      {selectedEvent?.id === event.id ? 'Verberg slots' : 'Toon slots'}
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {selectedEvent?.id === event.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Tijdslots ({slots.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                      {slots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`p-3 rounded-lg border-2 ${
                            slot.booking
                              ? 'bg-green-50 border-green-300'
                              : slot.is_available
                              ? 'bg-white border-gray-300'
                              : 'bg-gray-50 border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock size={16} className="text-gray-600" />
                              <span className="font-medium">
                                {slot.start_time} - {slot.end_time}
                              </span>
                            </div>
                            <button
                              onClick={() => handleToggleSlot(slot.id, slot.is_available)}
                              disabled={!!slot.booking}
                              className={`${
                                slot.is_available ? 'text-green-600' : 'text-gray-400'
                              } disabled:opacity-50`}
                            >
                              {slot.is_available ? (
                                <CheckCircle size={20} />
                              ) : (
                                <XCircle size={20} />
                              )}
                            </button>
                          </div>
                          {slot.booking && (
                            <p className="text-sm text-gray-700 mt-2 truncate">
                              {slot.booking.student_name}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
