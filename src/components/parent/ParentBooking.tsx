import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/utils/activityLog';
import { getClientIP } from '../../lib/utils/rateLimit';
import { useAuth } from '../../lib/contexts/AuthContext';
import type { Event, TimeSlotWithBooking, Booking } from '../../lib/types';

export const ParentBooking = () => {
  const { email, logout } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [slots, setSlots] = useState<TimeSlotWithBooking[]>([]);
  const [myBooking, setMyBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingStep, setBookingStep] = useState<'select' | 'confirm' | 'success'>('select');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotWithBooking | null>(null);
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load available events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('is_booking_enabled', true)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date');

      if (eventsData && eventsData.length > 0) {
        setEvents(eventsData);
        setSelectedEvent(eventsData[0]);
        await loadSlots(eventsData[0].id);
      }

      // Check if user already has a booking
      if (email) {
        const { data: bookingData } = await supabase
          .from('bookings')
          .select('*')
          .eq('parent_email', email)
          .maybeSingle();

        setMyBooking(bookingData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async (eventId: string) => {
    const { data: slotsData } = await supabase
      .from('time_slots')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_available', true)
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

  const handleSelectSlot = (slot: TimeSlotWithBooking) => {
    if (slot.booking) return;
    setSelectedSlot(slot);
    setBookingStep('confirm');
    setError('');
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !studentName.trim()) {
      setError('Vul de naam van de student in');
      return;
    }

    try {
      const ip = getClientIP();
      const { data, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          slot_id: selectedSlot.id,
          event_id: selectedEvent!.id,
          student_name: studentName.trim(),
          parent_email: email!,
          booking_ip: ip,
          created_by_admin: false,
        })
        .select()
        .single();

      if (bookingError) {
        if (bookingError.code === '23505') {
          setError('Dit tijdslot is inmiddels al geboekt door iemand anders');
        } else {
          throw bookingError;
        }
        return;
      }

      await logActivity('booking_created', email, ip, {
        booking_id: data.id,
        student_name: studentName,
        slot_time: `${selectedSlot.start_time} - ${selectedSlot.end_time}`,
      });

      setMyBooking(data);
      setBookingStep('success');
    } catch (err) {
      console.error('Booking error:', err);
      setError('Er is een fout opgetreden. Probeer het opnieuw.');
    }
  };

  const handleCancelBooking = async () => {
    if (!myBooking) return;

    if (
      !confirm(
        'Weet u zeker dat u uw boeking wilt annuleren? U kunt daarna een nieuw tijdslot kiezen.'
      )
    ) {
      return;
    }

    const { error } = await supabase.from('bookings').delete().eq('id', myBooking.id);

    if (!error) {
      const ip = getClientIP();
      await logActivity('booking_cancelled', email, ip, {
        booking_id: myBooking.id,
        student_name: myBooking.student_name,
        cancelled_by: 'parent',
      });

      setMyBooking(null);
      setBookingStep('select');
      loadData();
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Geen Beschikbare Datums</h2>
          <p className="text-gray-600 mb-6">
            Er zijn momenteel geen ouderavonden beschikbaar voor boeking.
          </p>
          <button
            onClick={handleLogout}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Terug naar home
          </button>
        </div>
      </div>
    );
  }

  if (myBooking && bookingStep !== 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Uw Boeking</h2>
            <p className="text-gray-600">U heeft al een gesprek ingepland</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Student:</p>
                <p className="font-semibold text-gray-900">{myBooking.student_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Datum:</p>
                <p className="font-semibold text-gray-900">
                  {new Date(selectedEvent?.date || '').toLocaleDateString('nl-NL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCancelBooking}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Boeking Annuleren
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={20} />
              Uitloggen
            </button>
          </div>

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
  }

  if (bookingStep === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Boeking Gelukt!</h2>
          <p className="text-gray-600 mb-6">
            Uw gesprek is succesvol ingepland voor <strong>{studentName}</strong>
          </p>

          <div className="bg-blue-50 rounded-lg p-6 mb-6 text-left">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Datum:</p>
              <p className="font-semibold text-gray-900">
                {selectedEvent &&
                  new Date(selectedEvent.date).toLocaleDateString('nl-NL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
              </p>
              <p className="text-sm text-gray-600 mt-4">Tijd:</p>
              <p className="font-semibold text-gray-900">
                {selectedSlot?.start_time} - {selectedSlot?.end_time}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={20} />
            Afsluiten
          </button>

          <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-600">
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
  }

  if (bookingStep === 'confirm' && selectedSlot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Boeking Bevestigen</h2>

          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Datum:</p>
                <p className="font-semibold text-gray-900">
                  {selectedEvent &&
                    new Date(selectedEvent.date).toLocaleDateString('nl-NL', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tijd:</p>
                <p className="font-semibold text-gray-900">
                  {selectedSlot.start_time} - {selectedSlot.end_time}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Naam van de student
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Voor- en achternaam"
              required
            />
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleConfirmBooking}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Bevestig Boeking
            </button>
            <button
              onClick={() => {
                setBookingStep('select');
                setSelectedSlot(null);
                setStudentName('');
                setError('');
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Terug
            </button>
          </div>

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
  }

  // Select slot view
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-900 to-blue-700 rounded flex items-center justify-center">
                <span className="text-white text-lg font-bold">KC</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Kempenhorst College</h1>
                <p className="text-sm text-gray-600">Ouderavond Boeking</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              Uitloggen
            </button>
          </div>

          {selectedEvent && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-1">{selectedEvent.name}</h2>
              <p className="text-sm text-gray-600">
                {new Date(selectedEvent.date).toLocaleDateString('nl-NL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Kies een tijdslot</h2>

          {slots.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">Geen beschikbare tijdslots</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {slots.map((slot) => {
                const isBooked = !!slot.booking;
                return (
                  <button
                    key={slot.id}
                    onClick={() => !isBooked && handleSelectSlot(slot)}
                    disabled={isBooked}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isBooked
                        ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                        : 'bg-white border-blue-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Clock size={16} className={isBooked ? 'text-gray-400' : 'text-blue-600'} />
                      <span className="font-semibold text-sm">
                        {slot.start_time} - {slot.end_time}
                      </span>
                    </div>
                    <div className="text-xs">
                      {isBooked ? (
                        <span className="text-red-600 font-medium">Niet beschikbaar</span>
                      ) : (
                        <span className="text-green-600 font-medium">Beschikbaar</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600 bg-white rounded-lg shadow p-4">
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
