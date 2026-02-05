import { useState, useEffect } from 'react';
import { Search, Download, Trash2, Plus, Power } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/utils/activityLog';
import { getClientIP } from '../../../lib/utils/rateLimit';
import { useAuth } from '../../../lib/contexts/AuthContext';
import type { Booking, TimeSlot, Event } from '../../../lib/types';

interface BookingWithDetails extends Booking {
  time_slot: TimeSlot;
  event: Event;
}

export const BookingControl = () => {
  const { email } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [globalBookingEnabled, setGlobalBookingEnabled] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });
      if (eventsData) setEvents(eventsData);

      // Load bookings with slot and event details
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          time_slot:time_slots(*),
          event:events(*)
        `)
        .order('booked_at', { ascending: false });

      if (bookingsData) {
        setBookings(bookingsData as any);
      }

      // Check if any event has booking enabled
      setGlobalBookingEnabled(eventsData?.some((e) => e.is_booking_enabled) || false);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGlobalBooking = async () => {
    const newState = !globalBookingEnabled;

    // Update all events
    const { error } = await supabase
      .from('events')
      .update({ is_booking_enabled: newState })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    if (!error) {
      setGlobalBookingEnabled(newState);
      const ip = getClientIP();
      await logActivity('settings_updated', email, ip, {
        action: 'global_booking_toggle',
        enabled: newState,
      });
      loadData();
    }
  };

  const handleDeleteBooking = async (bookingId: string, studentName: string) => {
    if (!confirm(`Weet u zeker dat u de boeking van ${studentName} wilt verwijderen?`)) {
      return;
    }

    const { error } = await supabase.from('bookings').delete().eq('id', bookingId);

    if (!error) {
      const ip = getClientIP();
      await logActivity('booking_cancelled', email, ip, {
        booking_id: bookingId,
        student_name: studentName,
        cancelled_by: 'admin',
      });
      loadData();
    }
  };

  const handleExportCSV = () => {
    const csvData = [
      ['Student Naam', 'Ouder Email', 'Datum', 'Tijd', 'Evenement', 'Geboekt Op'],
      ...filteredBookings.map((booking) => [
        booking.student_name,
        booking.parent_email,
        new Date(booking.time_slot.date).toLocaleDateString('nl-NL'),
        `${booking.time_slot.start_time} - ${booking.time_slot.end_time}`,
        booking.event.name,
        new Date(booking.booked_at).toLocaleString('nl-NL'),
      ]),
    ];

    const csv = csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `boekingen_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.parent_email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEvent = selectedEvent === 'all' || booking.event_id === selectedEvent;

    return matchesSearch && matchesEvent;
  });

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
        <h1 className="text-3xl font-bold text-gray-900">Boekingen Beheren</h1>
        <p className="mt-2 text-gray-600">Bekijk en beheer alle ouderavond boekingen</p>
      </div>

      {/* Global Booking Control */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Globale Boekingsstatus</h2>
            <p className="text-sm text-gray-600 mt-1">
              Schakel boekingen in of uit voor alle evenementen
            </p>
          </div>
          <button
            onClick={handleToggleGlobalBooking}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              globalBookingEnabled
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            <Power size={20} />
            {globalBookingEnabled ? 'Boekingen Open' : 'Boekingen Gesloten'}
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zoek op naam of email
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Zoeken..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter op evenement</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Alle evenementen</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <strong>{filteredBookings.length}</strong> boeking(en) gevonden
          </div>
          <button
            onClick={handleExportCSV}
            disabled={filteredBookings.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Exporteer CSV
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Geen boekingen gevonden</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ouder Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum & Tijd
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Evenement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Geboekt Op
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.student_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{booking.parent_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(booking.time_slot.date).toLocaleDateString('nl-NL')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {booking.time_slot.start_time} - {booking.time_slot.end_time}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{booking.event.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {new Date(booking.booked_at).toLocaleString('nl-NL')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDeleteBooking(booking.id, booking.student_name)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Verwijder boeking"
                      >
                        <Trash2 size={18} />
                      </button>
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
