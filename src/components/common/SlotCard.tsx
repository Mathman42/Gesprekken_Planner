import { X, Check, User } from 'lucide-react';
import type { TeacherTimeSlotWithBooking, SlotStatus } from '../../lib/types';

interface SlotCardProps {
  slot: TeacherTimeSlotWithBooking;
  status: SlotStatus;
  onAction?: () => void;
  actionLabel?: string;
  showActionButton?: boolean;
  viewMode: 'teacher' | 'parent';
}

export default function SlotCard({
  slot,
  status,
  onAction,
  actionLabel,
  showActionButton = true,
  viewMode,
}: SlotCardProps) {
  const getBackgroundColor = () => {
    switch (status) {
      case 'available':
        return 'bg-white border-gray-300';
      case 'blocked':
        return 'bg-gray-200 border-gray-400';
      case 'booked':
        return viewMode === 'teacher' ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400';
      case 'selected':
        return 'bg-blue-100 border-blue-500';
      default:
        return 'bg-white border-gray-300';
    }
  };

  const getIcon = () => {
    if (status === 'booked') {
      return <User className="w-4 h-4 text-green-600" />;
    }
    if (status === 'blocked') {
      return <X className="w-4 h-4 text-gray-600" />;
    }
    return null;
  };

  const getActionButton = () => {
    if (!showActionButton || !onAction) return null;

    if (viewMode === 'teacher') {
      if (status === 'available') {
        return (
          <button
            onClick={onAction}
            className="ml-auto p-1 rounded hover:bg-red-100 transition-colors"
            title="Blokkeren"
          >
            <X className="w-5 h-5 text-red-600" />
          </button>
        );
      }
      if (status === 'blocked') {
        return (
          <button
            onClick={onAction}
            className="ml-auto p-1 rounded hover:bg-green-100 transition-colors"
            title="Deblokkeren"
          >
            <Check className="w-5 h-5 text-green-600" />
          </button>
        );
      }
    }

    if (viewMode === 'parent' && status === 'available') {
      return (
        <button
          onClick={onAction}
          className="ml-auto px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          {actionLabel || 'Selecteren'}
        </button>
      );
    }

    return null;
  };

  const getStatusText = () => {
    if (viewMode === 'teacher' && status === 'booked' && slot.booking) {
      return (
        <div className="ml-2 text-sm text-gray-600">
          <span className="font-medium">{slot.booking.student_name}</span>
          <span className="text-xs text-gray-500 ml-1">({slot.booking.parent_email})</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`border-2 rounded-lg p-3 flex items-center transition-all ${getBackgroundColor()} ${
        status === 'available' && viewMode === 'parent' ? 'hover:border-blue-400 cursor-pointer' : ''
      }`}
      onClick={
        status === 'available' && viewMode === 'parent' && onAction
          ? onAction
          : undefined
      }
    >
      <div className="flex items-center flex-1">
        {getIcon()}
        <div className={`${getIcon() ? 'ml-2' : ''} font-medium`}>
          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
        </div>
        {getStatusText()}
      </div>
      {getActionButton()}
    </div>
  );
}
