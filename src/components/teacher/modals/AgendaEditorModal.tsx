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
    booking_open_date: '',
    booking_open_time: '',
    booking_close_date: '',
    booking_close_time: '',
    auto_schedule_enabled: false,
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
        const bookingOpenDate = agenda.booking_open_date ? new Date(agenda.booking_open_date) : null;
        const bookingCloseDate = agenda.booking_close_date ? new Date(agenda.booking_close_date) : null;

        setFormData({
          title: agenda.title,
          description: agenda.description || '',
          start_date: agenda.start_date,
          end_date: agenda.end_date,
          slot_duration_minutes: agenda.slot_duration_minutes,
          status: agenda.status,
          is_booking_open: agenda.is_booking_open,
          booking_open_date: bookingOpenDate ? bookingOpenDate.toISOString().split('T')[0] : '',
          booking_open_time: bookingOpenDate ? bookingOpenDate.toTimeString().slice(0, 5) : '',
          booking_close_date: bookingCloseDate ? bookingCloseDate.toISOString().split('T')[0] : '',
          booking_close_time: bookingCloseDate ? bookingCloseDate.toTimeString().slice(0, 5) : '',
          auto_schedule_enabled: agenda.auto_schedule_enabled || false,
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

      const bookingOpenDateTime = formData.booking_open_date && formData.booking_open_time
        ? new Date(`${formData.booking_open_date}T${formData.booking_open_time}:00`).toISOString()
        : null;

      const bookingCloseDateTime = formData.booking_close_date && formData.booking_close_time
        ? new Date(`${formData.booking_close_date}T${formData.booking_close_time}:00`).toISOString()
        : null;

      const agendaData = {
        title: formData.title,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        slot_duration_minutes: formData.slot_duration_minutes,
        status: formData.status,
        is_booking_open: formData.is_booking_open,
        booking_open_date: bookingOpenDateTime,
        booking_close_date: bookingCloseDateTime,
        auto_schedule_enabled: formData.auto_schedule_enabled,
      };

      if (agendaId) {
        await agendaService.updateAgenda(agendaId, agendaData);
      } else {
        const newAgenda: TeacherAgendaInsert = {
          ...agendaData,
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
            {agendaId ? 'Bewerk Agenda' : 'Maak Nieuwe Agenda'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Laden...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agenda Titel
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="bijv. Lente 2026 Oudergesprekken"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschrijving (Optioneel)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Voeg notities toe over deze agenda periode..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Startdatum
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
                  Einddatum
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
                Tijdslot Duur (minuten)
              </label>
              <select
                name="slot_duration_minutes"
                value={formData.slot_duration_minutes}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10 minuten</option>
                <option value={15}>15 minuten</option>
                <option value={20}>20 minuten</option>
                <option value={30}>30 minuten</option>
                <option value={45}>45 minuten</option>
                <option value={60}>60 minuten</option>
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
                <option value="draft">Concept</option>
                <option value="active">Actief</option>
                <option value="closed">Gesloten</option>
                <option value="archived">Gearchiveerd</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {formData.status === 'draft' && 'Niet zichtbaar voor ouders'}
                {formData.status === 'active' && 'Zichtbaar en klaar voor boeken'}
                {formData.status === 'closed' && 'Geen nieuwe boekingen toegestaan'}
                {formData.status === 'archived' && 'Verborgen uit hoofdlijst'}
              </p>
            </div>

            {formData.status === 'active' && (
              <>
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
                    Ouders mogen tijdslots boeken
                  </label>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="auto_schedule_enabled"
                      name="auto_schedule_enabled"
                      checked={formData.auto_schedule_enabled}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="auto_schedule_enabled" className="text-sm font-medium text-gray-700">
                      Automatisch openen en sluiten volgens schema
                    </label>
                  </div>

                  {formData.auto_schedule_enabled && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Boekingen openen op
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            name="booking_open_date"
                            value={formData.booking_open_date}
                            onChange={handleChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <input
                            type="time"
                            name="booking_open_time"
                            value={formData.booking_open_time}
                            onChange={handleChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Boekingen sluiten op
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            name="booking_close_date"
                            value={formData.booking_close_date}
                            onChange={handleChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <input
                            type="time"
                            name="booking_close_time"
                            value={formData.booking_close_time}
                            onChange={handleChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Opslaan...' : agendaId ? 'Bijwerken' : 'Aanmaken'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
