import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Mail, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  getLinkedParents,
  getAvailableTimeSlotsForDate,
  createBookingAsTeacher,
} from '../../../lib/services/teacherSlotService';

interface CreateBookingModalProps {
  teacherId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateBookingModal = ({
  teacherId,
  onClose,
  onSuccess,
}: CreateBookingModalProps) => {
  const [parents, setParents] = useState<any[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedParentEmail, setSelectedParentEmail] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingDates, setLoadingDates] = useState(true);

  useEffect(() => {
    loadParentsAndDates();
  }, [teacherId]);

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate]);

  const loadParentsAndDates = async () => {
    setLoadingDates(true);
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
      setAvailableDates(uniqueDates);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Fout bij laden van gegevens');
    } finally {
      setLoadingDates(false);
    }
  };

  const loadAvailableSlots = async () => {
    setAvailableSlots([]);
    setSelectedSlotId('');

    try {
      const result = await getAvailableTimeSlotsForDate(teacherId, selectedDate);
      if (result.success && result.slots) {
        setAvailableSlots(result.slots);
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

      const result = await createBookingAsTeacher({
        teacher_id: teacherId,
        teacher_time_slot_id: selectedSlotId,
        parent_email: selectedParentEmail,
        student_name: studentName.trim(),
      });

      if (!result.success) {
        throw new Error(result.error || 'Fout bij maken van afspraak');
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
          <h2 className="text-2xl font-bold text-gray-900">Nieuwe Afspraak</h2>
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
              disabled={loadingDates || loading}
              required
            >
              <option value="">Selecteer een ouder</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.email}>
                  {parent.name} ({parent.email})
                </option>
              ))}
            </select>
            {parents.length === 0 && !loadingDates && (
              <p className="text-sm text-gray-500 mt-2">
                Geen gekoppelde ouders gevonden
              </p>
            )}
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
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loadingDates || loading}
              required
            >
              <option value="">Selecteer een datum</option>
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </select>
            {availableDates.length === 0 && !loadingDates && (
              <p className="text-sm text-gray-500 mt-2">
                Geen beschikbare datums gevonden
              </p>
            )}
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
              {loading ? 'Bezig...' : 'Afspraak Maken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
