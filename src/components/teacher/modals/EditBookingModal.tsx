import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Mail, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  getLinkedParents,
  getAvailableTimeSlotsForDate,
  updateTeacherBooking,
} from '../../../lib/services/teacherSlotService';

interface BookingWithSlot {
  id: string;
  student_name: string;
  parent_email: string;
  teacher_time_slot_id: string;
  time_slot: {
    date: string;
    start_time: string;
    end_time: string;
  };
}

interface EditBookingModalProps {
  teacherId: string;
  booking: BookingWithSlot;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditBookingModal = ({
  teacherId,
  booking,
  onClose,
  onSuccess,
}: EditBookingModalProps) => {
  const [parents, setParents] = useState<any[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedParentEmail, setSelectedParentEmail] = useState(booking.parent_email);
  const [selectedDate, setSelectedDate] = useState(booking.time_slot.date);
  const [selectedSlotId, setSelectedSlotId] = useState(booking.teacher_time_slot_id);
  const [studentName, setStudentName] = useState(booking.student_name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadParentsAndDates();
  }, [teacherId]);

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate]);

  const loadParentsAndDates = async () => {
    setLoadingData(true);
    setError('');

    try {
      const parentsResult = await getLinkedParents(teacherId);
      if (parentsResult.success && parentsResult.parents) {
        setParents(parentsResult.parents);
      }

      const { data: availabilityData, error: availabilityError } = await supabase
        .from('teacher_availability')
        .select('date')
        .eq('teacher_id', teacherId)
        .eq('is_available', true)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date');

      if (availabilityError) throw availabilityError;

      const uniqueDates = [
        ...new Set(availabilityData?.map((item) => item.date) || []),
      ];

      if (!uniqueDates.includes(booking.time_slot.date)) {
        uniqueDates.unshift(booking.time_slot.date);
      }

      setAvailableDates(uniqueDates);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Fout bij laden van gegevens');
    } finally {
      setLoadingData(false);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      const result = await getAvailableTimeSlotsForDate(teacherId, selectedDate);
      if (result.success && result.slots) {
        const slots = result.slots;

        if (selectedDate === booking.time_slot.date) {
          const { data: currentSlot, error: slotError } = await supabase
            .from('teacher_time_slots')
            .select('*')
            .eq('id', booking.teacher_time_slot_id)
            .maybeSingle();

          if (!slotError && currentSlot && !slots.find((s) => s.id === currentSlot.id)) {
            slots.push(currentSlot);
          }
        }

        slots.sort((a, b) => a.start_time.localeCompare(b.start_time));
        setAvailableSlots(slots);
      }
    } catch (err) {
      console.error('Error loading slots:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!selectedParentEmail || !selectedSlotId || !studentName.trim()) {
        throw new Error('Vul alle velden in');
      }

      const updates: any = {};

      if (studentName.trim() !== booking.student_name) {
        updates.student_name = studentName.trim();
      }

      if (selectedParentEmail !== booking.parent_email) {
        updates.parent_email = selectedParentEmail;
      }

      if (selectedSlotId !== booking.teacher_time_slot_id) {
        updates.teacher_time_slot_id = selectedSlotId;
      }

      if (Object.keys(updates).length === 0) {
        throw new Error('Geen wijzigingen om op te slaan');
      }

      const result = await updateTeacherBooking(booking.id, updates);

      if (!result.success) {
        throw new Error(result.error || 'Fout bij wijzigen van afspraak');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Afspraak Wijzigen</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <Mail size={18} className="text-gray-600" />
                <span>Ouder</span>
              </div>
            </label>
            <select
              value={selectedParentEmail}
              onChange={(e) => setSelectedParentEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loadingData || loading}
              required
            >
              {!parents.find((p) => p.email === selectedParentEmail) && (
                <option value={selectedParentEmail}>{selectedParentEmail}</option>
              )}
              {parents.map((parent) => (
                <option key={parent.id} value={parent.email}>
                  {parent.name} ({parent.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <User size={18} className="text-gray-600" />
                <span>Student Naam</span>
              </div>
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Naam van de student"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className="text-gray-600" />
                <span>Datum</span>
              </div>
            </label>
            <select
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlotId('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loadingData || loading}
              required
            >
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </select>
          </div>

          {selectedDate && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={18} className="text-gray-600" />
                  <span>Tijdslot</span>
                </div>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedSlotId === slot.id
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                      }`}
                      disabled={loading}
                    >
                      <div className="text-sm">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="col-span-full text-sm text-gray-500 py-4 text-center">
                    Geen beschikbare tijdslots voor deze datum
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !selectedParentEmail || !selectedSlotId || !studentName.trim()}
            >
              {loading ? 'Bezig...' : 'Wijzigingen Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
