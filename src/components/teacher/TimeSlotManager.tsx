import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { TeacherTimeSlotWithBooking, SlotStatus } from '../../lib/types';
import { getTeacherTimeSlotsForDate, toggleSlotBlock } from '../../lib/services/teacherSlotService';
import SlotCard from '../common/SlotCard';

interface TimeSlotManagerProps {
  teacherId: string;
  date: string;
  onBack: () => void;
}

export default function TimeSlotManager({ teacherId, date, onBack }: TimeSlotManagerProps) {
  const [slots, setSlots] = useState<TeacherTimeSlotWithBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSlots();
  }, [teacherId, date]);

  const loadSlots = async () => {
    setLoading(true);
    setError(null);

    const result = await getTeacherTimeSlotsForDate(teacherId, date, true);

    if (result.success && result.slots) {
      setSlots(result.slots);
    } else {
      setError(result.error || 'Fout bij het laden van tijdsloten');
    }

    setLoading(false);
  };

  const handleToggleBlock = async (slotId: string, currentlyBlocked: boolean) => {
    setActionLoading(slotId);

    const result = await toggleSlotBlock(slotId, !currentlyBlocked);

    if (result.success) {
      setSlots((prev) =>
        prev.map((slot) =>
          slot.id === slotId ? { ...slot, is_blocked: !currentlyBlocked } : slot
        )
      );
    } else {
      alert(result.error || 'Fout bij het wijzigen van de blokkering');
    }

    setActionLoading(null);
  };

  const getSlotStatus = (slot: TeacherTimeSlotWithBooking): SlotStatus => {
    if (slot.booking) return 'booked';
    if (slot.is_blocked) return 'blocked';
    return 'available';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const stats = {
    total: slots.length,
    available: slots.filter((s) => !s.is_blocked && !s.booking).length,
    blocked: slots.filter((s) => s.is_blocked).length,
    booked: slots.filter((s) => s.booking).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar overzicht
        </button>

        <h2 className="text-2xl font-bold text-gray-900">{formatDate(date)}</h2>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Totaal</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Beschikbaar</div>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
            <div className="text-sm text-gray-600">Geblokkeerd</div>
            <div className="text-2xl font-bold text-gray-700">{stats.blocked}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-gray-600">Geboekt</div>
            <div className="text-2xl font-bold text-green-600">{stats.booked}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      ) : slots.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
          Er zijn geen tijdsloten gegenereerd voor deze dag.
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-w-2xl mx-auto">
          {slots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              status={getSlotStatus(slot)}
              viewMode="teacher"
              onAction={
                slot.booking
                  ? undefined
                  : () => handleToggleBlock(slot.id, slot.is_blocked)
              }
              showActionButton={!slot.booking && actionLoading !== slot.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
