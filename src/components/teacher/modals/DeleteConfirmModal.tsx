import { useState } from 'react';
import { X, AlertTriangle, Calendar, Clock, User, Mail } from 'lucide-react';
import { cancelBooking } from '../../../lib/services/teacherSlotService';

interface BookingWithSlot {
  id: string;
  student_name: string;
  parent_email: string;
  time_slot: {
    date: string;
    start_time: string;
    end_time: string;
  };
}

interface DeleteConfirmModalProps {
  booking: BookingWithSlot;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteConfirmModal = ({
  booking,
  onClose,
  onSuccess,
}: DeleteConfirmModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await cancelBooking(booking.id);

      if (!result.success) {
        throw new Error(result.error || 'Fout bij verwijderen van afspraak');
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-full">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-red-900">Afspraak Verwijderen</h2>
          </div>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600 transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            Weet u zeker dat u deze afspraak wilt verwijderen? Deze actie kan niet
            ongedaan worden gemaakt.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Afspraakgegevens:</h3>

            <div className="flex items-start gap-3">
              <Calendar className="text-gray-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Datum</p>
                <p className="text-sm text-gray-900 font-medium">
                  {formatDate(booking.time_slot.date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="text-gray-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Tijd</p>
                <p className="text-sm text-gray-900 font-medium">
                  {formatTime(booking.time_slot.start_time)} -{' '}
                  {formatTime(booking.time_slot.end_time)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="text-gray-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Student</p>
                <p className="text-sm text-gray-900 font-medium">
                  {booking.student_name}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="text-gray-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Ouder</p>
                <p className="text-sm text-gray-900 font-medium break-all">
                  {booking.parent_email}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Annuleren
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Bezig...' : 'Verwijderen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
