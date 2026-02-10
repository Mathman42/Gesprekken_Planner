import type { TeacherAvailability, TeacherTimeSlotInsert } from '../types';

interface SlotGenerationParams {
  teacherId: string;
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  bufferTime: number;
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function timeToMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function generateTimeSlots(params: SlotGenerationParams): TeacherTimeSlotInsert[] {
  const { teacherId, availabilityId, date, startTime, endTime, slotDuration, bufferTime } = params;

  const start = parseTime(startTime);
  const end = parseTime(endTime);

  const startMinutes = timeToMinutes(start.hours, start.minutes);
  const endMinutes = timeToMinutes(end.hours, end.minutes);

  const slots: TeacherTimeSlotInsert[] = [];
  let currentMinutes = startMinutes;

  while (currentMinutes + slotDuration <= endMinutes) {
    const slotStart = minutesToTime(currentMinutes);
    const slotEnd = minutesToTime(currentMinutes + slotDuration);

    slots.push({
      teacher_availability_id: availabilityId,
      teacher_id: teacherId,
      date,
      start_time: slotStart,
      end_time: slotEnd,
      is_blocked: false,
    });

    currentMinutes += slotDuration + bufferTime;
  }

  return slots;
}

export function generateSlotsForAvailability(
  availability: TeacherAvailability,
  slotDuration: number,
  bufferTime: number
): TeacherTimeSlotInsert[] {
  return generateTimeSlots({
    teacherId: availability.teacher_id,
    availabilityId: availability.id,
    date: availability.date,
    startTime: availability.start_time,
    endTime: availability.end_time,
    slotDuration,
    bufferTime,
  });
}
