import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, LogOut, User, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/utils/activityLog';
import { getClientIP } from '../../lib/utils/rateLimit';
import { useAuth } from '../../lib/contexts/AuthContext';
import type { Teacher, TeacherTimeSlotWithBooking, TeacherBooking, SlotStatus } from '../../lib/types';
import {
  getTeacherTimeSlotsForDate,
  createTeacherBooking,
  cancelBooking,
  getParentBooking,
  getAvailableTeacherDates,
} from '../../lib/services/teacherSlotService';
import SlotCard from '../common/SlotCard';

type ViewStep = 'select-teacher' | 'select-date' | 'select-slot' | 'confirm' | 'success' | 'has-booking';

export const ParentBooking = () => {
  const { email, logout } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TeacherTimeSlotWithBooking[]>([]);
  const [myBooking, setMyBooking] = useState<TeacherBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewStep, setViewStep] = useState<ViewStep>('select-teacher');
  const [selectedSlot, setSelectedSlot] = useState<TeacherTimeSlotWithBooking | null>(null);
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (email) {
        const { data: parent } = await supabase
          .from('parents')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (parent) {
          const { data: parentTeacherRelations } = await supabase
            .from('parent_teachers')
            .select('teacher_id')
            .eq('parent_id', parent.id);

          const teacherIds = parentTeacherRelations?.map(rel => rel.teacher_id) || [];

          if (teacherIds.length > 0) {
            const { data: teachersData } = await supabase
              .from('teachers')
              .select('*')
              .in('id', teacherIds)
              .order('name');

            if (teachersData) {
              setTeachers(teachersData);
            }
          }
        }

        const result = await getParentBooking(email);
        if (result.success && result.booking) {
          setMyBooking(result.booking);
          setViewStep('has-booking');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeacher = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setError('');

    const result = await getAvailableTeacherDates(teacher.id);
    if (result.success && result.dates) {
      setAvailableDates(result.dates);
      setViewStep('select-date');
    } else {
      setError('Geen beschikbare datums gevonden voor deze docent');
    }
  };

  const handleSelectDate = async (date: string) => {
    if (!selectedTeacher) return;

    setSelectedDate(date);
    setError('');

    const result = await getTeacherTimeSlotsForDate(selectedTeacher.id, date);
    if (result.success && result.slots) {
      setSlots(result.slots);
      setViewStep('select-slot');
    } else {
      setError('Fout bij het laden van tijdsloten');
    }
  };

  const handleSelectSlot = (slot: TeacherTimeSlotWithBooking) => {
    if (slot.booking || slot.is_blocked) return;
    setSelectedSlot(slot);
    setViewStep('confirm');
    setError('');
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !studentName.trim() || !selectedTeacher || !email) {
      setError('Vul de naam van de student in');
      return;
    }

    try {
      const ip = getClientIP();
      const result = await createTeacherBooking({
        teacher_time_slot_id: selectedSlot.id,
        teacher_id: selectedTeacher.id,
        parent_email: email,
        student_name: studentName.trim(),
        booking_ip: ip,
      });

      if (!result.success) {
        if (result.error?.includes('Er bestaat al een afspraak voor')) {
          setError(`${result.error}. Elk kind kan maar één afspraak maken. Neem contact op met de school bij vragen.`);
        } else {
          setError(result.error || 'Er is een fout opgetreden');
        }
        return;
      }

      await logActivity('teacher_booking_created', email, ip, {
        booking_id: result.booking!.id,
        teacher_id: selectedTeacher.id,
        student_name: studentName,
        slot_time: `${selectedSlot.start_time} - ${selectedSlot.end_time}`,
        date: selectedDate,
      });

      setMyBooking(result.booking!);
      setViewStep('success');
    } catch (err) {
      console.error('Booking error:', err);
      setError('Er is een fout opgetreden. Probeer het opnieuw.');
    }
  };

  const handleCancelBooking = async () => {
    if (!myBooking) return;

    if (!confirm('Weet u zeker dat u uw boeking wilt annuleren?')) {
      return;
    }

    const result = await cancelBooking(myBooking.id);

    if (result.success) {
      const ip = getClientIP();
      await logActivity('teacher_booking_cancelled', email, ip, {
        booking_id: myBooking.id,
        student_name: myBooking.student_name,
        cancelled_by: 'parent',
      });

      setMyBooking(null);
      setViewStep('select-teacher');
      loadData();
    } else {
      setError(result.error || 'Fout bij annuleren');
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const getSlotStatus = (slot: TeacherTimeSlotWithBooking): SlotStatus => {
    if (selectedSlot?.id === slot.id) return 'selected';
    if (slot.booking) return 'booked';
    if (slot.is_blocked) return 'blocked';
    return 'available';
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

  if (viewStep === 'has-booking' && myBooking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Uw afspraak staat gepland</h2>
            <p className="text-gray-600">Hieronder vindt u de details</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Student:</p>
                <p className="font-semibold text-gray-900">{myBooking.student_name}</p>
              </div>
              {myBooking.teacher && (
                <div>
                  <p className="text-sm text-gray-600">Docent:</p>
                  <p className="font-semibold text-gray-900">{myBooking.teacher.name}</p>
                </div>
              )}
              {myBooking.time_slot && (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Datum:</p>
                    <p className="font-semibold text-gray-900">{formatDate(myBooking.time_slot.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tijd:</p>
                    <p className="font-semibold text-gray-900">
                      {myBooking.time_slot.start_time.slice(0, 5)} - {myBooking.time_slot.end_time.slice(0, 5)}
                    </p>
                  </div>
                </>
              )}
              <div>
                <p className="text-sm text-gray-600">Email:</p>
                <p className="font-semibold text-gray-900">{myBooking.parent_email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCancelBooking}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Afspraak Annuleren
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
          </div>
        </div>
      </div>
    );
  }

  if (viewStep === 'success') {
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
              <div>
                <p className="text-sm text-gray-600">Docent:</p>
                <p className="font-semibold text-gray-900">{selectedTeacher?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Datum:</p>
                <p className="font-semibold text-gray-900">{selectedDate && formatDate(selectedDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tijd:</p>
                <p className="font-semibold text-gray-900">
                  {selectedSlot?.start_time.slice(0, 5)} - {selectedSlot?.end_time.slice(0, 5)}
                </p>
              </div>
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
          </div>
        </div>
      </div>
    );
  }

  if (viewStep === 'confirm' && selectedSlot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Boeking Bevestigen</h2>

          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Docent:</p>
                <p className="font-semibold text-gray-900">{selectedTeacher?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Datum:</p>
                <p className="font-semibold text-gray-900">{selectedDate && formatDate(selectedDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tijd:</p>
                <p className="font-semibold text-gray-900">
                  {selectedSlot.start_time.slice(0, 5)} - {selectedSlot.end_time.slice(0, 5)}
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
                setViewStep('select-slot');
                setSelectedSlot(null);
                setStudentName('');
                setError('');
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Terug
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (viewStep === 'select-slot' && selectedDate && selectedTeacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <button
              onClick={() => {
                setViewStep('select-date');
                setSelectedDate(null);
                setSlots([]);
              }}
              className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug naar datums
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedTeacher.name}</h1>
                <p className="text-gray-600">{formatDate(selectedDate)}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                Uitloggen
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Kies een tijdslot</h2>

            <div className="mb-4 flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
                <span>Beschikbaar</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 border-2 border-gray-400 rounded"></div>
                <span>Geblokkeerd</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border-2 border-red-400 rounded"></div>
                <span>Bezet</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded"></div>
                <span>Geselecteerd</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {slots.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600">Geen beschikbare tijdslots</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-w-2xl mx-auto">
                {slots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    status={getSlotStatus(slot)}
                    viewMode="parent"
                    onAction={() => handleSelectSlot(slot)}
                    showActionButton={!slot.booking && !slot.is_blocked}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (viewStep === 'select-date' && selectedTeacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <button
              onClick={() => {
                setViewStep('select-teacher');
                setSelectedTeacher(null);
                setAvailableDates([]);
              }}
              className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug naar docenten
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedTeacher.name}</h1>
                <p className="text-gray-600">Kies een datum</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                Uitloggen
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            {availableDates.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600">Geen beschikbare datums</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableDates.map((date) => (
                  <button
                    key={date}
                    onClick={() => handleSelectDate(date)}
                    className="p-6 border-2 border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="text-blue-600" size={24} />
                      <div>
                        <p className="font-semibold text-gray-900">{formatDate(date)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
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
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Kies een docent</h2>

          {teachers.length === 0 ? (
            <div className="text-center py-12">
              <User className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">Geen docenten beschikbaar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachers.map((teacher) => (
                <button
                  key={teacher.id}
                  onClick={() => handleSelectTeacher(teacher)}
                  className="p-6 border-2 border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="text-blue-900" size={24} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{teacher.name}</p>
                      <p className="text-sm text-gray-600">{teacher.email}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600 bg-white rounded-lg shadow p-4">
          <p>Kempenhorst College</p>
        </div>
      </div>
    </div>
  );
};
