import { useState, useEffect } from 'react';
import { Calendar, Download, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { agendaService } from '../../../lib/services/agendaService';
import { supabase } from '../../../lib/supabase';
import type { TeacherAgenda } from '../../../lib/types';

interface ClosedAgendaViewerProps {
  agendaId: string;
  onBack: () => void;
}

export default function ClosedAgendaViewer({ agendaId, onBack }: ClosedAgendaViewerProps) {
  const [agenda, setAgenda] = useState<TeacherAgenda | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ student_name: '', parent_email: '' });

  useEffect(() => {
    loadAgendaData();
  }, [agendaId]);

  const loadAgendaData = async () => {
    try {
      setLoading(true);
      const [agendaData, bookingsData] = await Promise.all([
        agendaService.getAgendaById(agendaId),
        agendaService.getAgendaBookings(agendaId),
      ]);

      setAgenda(agendaData);
      setBookings(bookingsData);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load agenda data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBooking = (booking: any) => {
    setEditingBooking(booking.id);
    setEditForm({
      student_name: booking.student_name,
      parent_email: booking.parent_email,
    });
  };

  const handleSaveEdit = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('teacher_bookings')
        .update({
          student_name: editForm.student_name,
          parent_email: editForm.parent_email,
        })
        .eq('id', bookingId);

      if (error) throw error;

      setEditingBooking(null);
      await loadAgendaData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update booking');
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Delete this booking? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('teacher_bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;

      await loadAgendaData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete booking');
    }
  };

  const handleExportCSV = () => {
    if (bookings.length === 0) {
      alert('No bookings to export');
      return;
    }

    const headers = ['Date', 'Start Time', 'End Time', 'Student Name', 'Parent Email', 'Booked At'];
    const rows = bookings.map((b) => [
      new Date(b.teacher_time_slots.date).toLocaleDateString(),
      b.teacher_time_slots.start_time,
      b.teacher_time_slots.end_time,
      b.student_name,
      b.parent_email,
      new Date(b.created_at).toLocaleString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agenda?.title || 'agenda'}-bookings.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Agenda not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{agenda.title}</h2>
          <p className="text-gray-600">
            {new Date(agenda.start_date).toLocaleDateString()} - {new Date(agenda.end_date).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bookings ({bookings.length})</h3>

        {bookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No bookings in this agenda</div>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                {editingBooking === booking.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Student Name
                        </label>
                        <input
                          type="text"
                          value={editForm.student_name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, student_name: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Parent Email
                        </label>
                        <input
                          type="email"
                          value={editForm.parent_email}
                          onChange={(e) =>
                            setEditForm({ ...editForm, parent_email: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(booking.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingBooking(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Date</div>
                        <div className="font-medium">
                          {new Date(booking.teacher_time_slots.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Time</div>
                        <div className="font-medium">
                          {booking.teacher_time_slots.start_time.substring(0, 5)} -{' '}
                          {booking.teacher_time_slots.end_time.substring(0, 5)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Student</div>
                        <div className="font-medium">{booking.student_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Parent Email</div>
                        <div className="font-medium text-sm">{booking.parent_email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditBooking(booking)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit booking"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBooking(booking.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete booking"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
}
