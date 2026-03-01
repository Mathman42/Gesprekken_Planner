import { useState, useEffect } from 'react';
import { X, Save, Calendar, Clock } from 'lucide-react';
import { agendaService } from '../../../lib/services/agendaService';
import type { TeacherAgenda, TeacherAgendaInsert } from '../../../lib/types';

interface AgendaEditorModalProps {
  teacherId: string;
  agendaId?: string | null;
  onClose: () => void;
  onSave: () => void;
}

export default function AgendaEditorModal({
  teacherId,
  agendaId,
  onClose,
  onSave,
}: AgendaEditorModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    slot_duration_minutes: 15,
    status: 'draft' as 'draft' | 'active' | 'closed' | 'archived',
    is_booking_open: false,
  });

  useEffect(() => {
    if (agendaId) {
      loadAgenda();
    }
  }, [agendaId]);

  const loadAgenda = async () => {
    if (!agendaId) return;

    try {
      setLoading(true);
      const agenda = await agendaService.getAgendaById(agendaId);
      if (agenda) {
        setFormData({
          title: agenda.title,
          description: agenda.description || '',
          start_date: agenda.start_date,
          end_date: agenda.end_date,
          slot_duration_minutes: agenda.slot_duration_minutes,
          status: agenda.status,
          is_booking_open: agenda.is_booking_open,
        });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load agenda');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      alert('Please select start and end dates');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      alert('End date must be after start date');
      return;
    }

    try {
      setSaving(true);

      if (agendaId) {
        await agendaService.updateAgenda(agendaId, formData);
      } else {
        const newAgenda: TeacherAgendaInsert = {
          ...formData,
          teacher_id: teacherId,
        };
        await agendaService.createAgenda(newAgenda);
      }

      onSave();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save agenda');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === 'slot_duration_minutes') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 15 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {agendaId ? 'Edit Agenda' : 'Create New Agenda'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agenda Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Spring 2026 Parent-Teacher Conversations"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Add notes about this agenda period..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  End Date
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Slot Duration (minutes)
              </label>
              <select
                name="slot_duration_minutes"
                value={formData.slot_duration_minutes}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {formData.status === 'draft' && 'Not visible to parents'}
                {formData.status === 'active' && 'Visible and ready for booking'}
                {formData.status === 'closed' && 'No new bookings allowed'}
                {formData.status === 'archived' && 'Hidden from main list'}
              </p>
            </div>

            {formData.status === 'active' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_booking_open"
                  name="is_booking_open"
                  checked={formData.is_booking_open}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_booking_open" className="text-sm font-medium text-gray-700">
                  Allow parents to book slots
                </label>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : agendaId ? 'Update Agenda' : 'Create Agenda'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
