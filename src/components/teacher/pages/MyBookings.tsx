import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getTeacherBookings } from '../../../lib/services/teacherSlotService';

interface BookingWithSlot {
  id: string;
  student_name: string;
  parent_email: string;
  created_at: string;
  time_slot: {
    date: string;
    start_time: string;
    end_time: string;
  };
}

interface GroupedBookings {
  [date: string]: BookingWithSlot[];
}

export const MyBookings = () => {
  const [bookings, setBookings] = useState<BookingWithSlot[]>([]);
  const [groupedBookings, setGroupedBookings] = useState<GroupedBookings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.email) {
        setError('Geen gebruiker gevonden');
        setLoading(false);
        return;
      }

      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('email', userData.user.email)
        .maybeSingle();

      if (!teacherData) {
        setError('Docent niet gevonden');
        setLoading(false);
        return;
      }

      const result = await getTeacherBookings(teacherData.id);

      if (result.success && result.bookings) {
        const validBookings = result.bookings.filter(
          (booking) => booking.time_slot
        );
        setBookings(validBookings);
        groupBookingsByDate(validBookings);
      } else {
        setError(result.error || 'Fout bij laden van gesprekken');
      }
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError('Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  const groupBookingsByDate = (bookingsList: BookingWithSlot[]) => {
    const grouped: GroupedBookings = {};

    bookingsList.forEach((booking) => {
      const date = booking.time_slot.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(booking);
    });

    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        return a.time_slot.start_time.localeCompare(b.time_slot.start_time);
      });
    });

    const sortedGrouped: GroupedBookings = {};
    Object.keys(grouped)
      .sort()
      .forEach((date) => {
        sortedGrouped[date] = grouped[date];
      });

    setGroupedBookings(sortedGrouped);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
        <div>
          <h3 className="font-semibold text-red-900 mb-1">Fout</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Geen gesprekken gepland
          </h2>
          <p className="text-gray-600">
            Er zijn nog geen ouderavonden ingepland
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mijn Gesprekken</h1>
        <p className="text-gray-600">
          Overzicht van alle ingeplande ouderavonden
        </p>
      </div>

      {Object.keys(groupedBookings).length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Geen gesprekken gepland
            </h2>
            <p className="text-gray-600">
              Er zijn nog geen ouderavonden ingepland
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedBookings).map(([date, dayBookings]) => (
            <div key={date} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-900 text-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <Calendar size={24} />
                  <div>
                    <h2 className="text-xl font-bold">{formatDate(date)}</h2>
                    <p className="text-blue-100 text-sm">
                      {dayBookings.length} {dayBookings.length === 1 ? 'gesprek' : 'gesprekken'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {dayBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-24 text-center">
                        <div className="inline-flex items-center gap-2 text-blue-900 font-semibold">
                          <Clock size={18} />
                          <span>
                            {formatTime(booking.time_slot.start_time)} - {formatTime(booking.time_slot.end_time)}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <User className="text-gray-400 flex-shrink-0 mt-1" size={20} />
                          <div>
                            <p className="text-sm text-gray-600">Student</p>
                            <p className="font-semibold text-gray-900">{booking.student_name}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Mail className="text-gray-400 flex-shrink-0 mt-1" size={20} />
                          <div>
                            <p className="text-sm text-gray-600">Ouder Email</p>
                            <p className="font-medium text-gray-900 break-all">{booking.parent_email}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
