import { supabase } from '../supabase';
import type {
  TeacherAvailability,
  TeacherTimeSlot,
  TeacherTimeSlotInsert,
  TeacherBooking,
  TeacherBookingInsert,
  TeacherTimeSlotWithBooking,
} from '../types';
import { generateSlotsForAvailability } from '../utils/slotGeneration';

export async function generateSlotsForAvailabilityPeriod(
  availability: TeacherAvailability,
  slotDuration: number,
  bufferTime: number
): Promise<{ success: boolean; error?: string; slots?: TeacherTimeSlot[] }> {
  try {
    const slots = generateSlotsForAvailability(availability, slotDuration, bufferTime);

    const { data, error } = await supabase
      .from('teacher_time_slots')
      .insert(slots)
      .select();

    if (error) throw error;

    return { success: true, slots: data };
  } catch (error) {
    console.error('Error generating slots:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getTeacherTimeSlotsForDate(
  teacherId: string,
  date: string
): Promise<{ success: boolean; error?: string; slots?: TeacherTimeSlotWithBooking[] }> {
  try {
    const { data: slots, error: slotsError } = await supabase
      .from('teacher_time_slots')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('date', date)
      .order('start_time');

    if (slotsError) throw slotsError;

    const { data: bookings, error: bookingsError } = await supabase
      .from('teacher_bookings')
      .select('*')
      .eq('teacher_id', teacherId);

    if (bookingsError) throw bookingsError;

    const bookingsBySlotId = new Map(
      bookings?.map((b) => [b.teacher_time_slot_id, b]) || []
    );

    const slotsWithBookings: TeacherTimeSlotWithBooking[] = slots?.map((slot) => ({
      ...slot,
      booking: bookingsBySlotId.get(slot.id) || null,
    })) || [];

    return { success: true, slots: slotsWithBookings };
  } catch (error) {
    console.error('Error fetching slots:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function toggleSlotBlock(
  slotId: string,
  isBlocked: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('teacher_time_slots')
      .update({ is_blocked: isBlocked })
      .eq('id', slotId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error toggling slot block:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function checkStudentBooking(
  studentName: string
): Promise<{ success: boolean; error?: string; booking?: TeacherBooking }> {
  try {
    const { data, error } = await supabase
      .from('teacher_bookings')
      .select('*')
      .ilike('student_name', studentName.trim())
      .maybeSingle();

    if (error) throw error;

    return { success: true, booking: data || undefined };
  } catch (error) {
    console.error('Error checking student booking:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function createTeacherBooking(
  booking: Omit<TeacherBookingInsert, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string; booking?: TeacherBooking }> {
  try {
    const { data: slot, error: slotError } = await supabase
      .from('teacher_time_slots')
      .select('*, booking:teacher_bookings(id)')
      .eq('id', booking.teacher_time_slot_id)
      .maybeSingle();

    if (slotError) throw slotError;
    if (!slot) throw new Error('Time slot not found');
    if (slot.is_blocked) throw new Error('This time slot is blocked');
    if ((slot as any).booking) throw new Error('This time slot is already booked');

    const existingBooking = await checkStudentBooking(booking.student_name);
    if (existingBooking.success && existingBooking.booking) {
      throw new Error(`Er bestaat al een afspraak voor ${booking.student_name.trim()}`);
    }

    const { data, error } = await supabase
      .from('teacher_bookings')
      .insert([booking])
      .select()
      .single();

    if (error) throw error;

    return { success: true, booking: data };
  } catch (error) {
    console.error('Error creating booking:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getParentBooking(
  parentEmail: string
): Promise<{ success: boolean; error?: string; booking?: any }> {
  try {
    const { data, error } = await supabase
      .from('teacher_bookings')
      .select(`
        *,
        time_slot:teacher_time_slots(
          date,
          start_time,
          end_time
        ),
        teacher:teachers(
          name,
          email
        )
      `)
      .eq('parent_email', parentEmail)
      .maybeSingle();

    if (error) throw error;

    return { success: true, booking: data || undefined };
  } catch (error) {
    console.error('Error fetching parent booking:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function cancelBooking(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('teacher_bookings')
      .delete()
      .eq('id', bookingId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error canceling booking:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getAvailableTeacherDates(
  teacherId: string
): Promise<{ success: boolean; error?: string; dates?: string[] }> {
  try {
    const { data, error } = await supabase
      .from('teacher_availability')
      .select('date')
      .eq('teacher_id', teacherId)
      .eq('is_available', true)
      .order('date');

    if (error) throw error;

    const uniqueDates = [...new Set(data?.map((item) => item.date) || [])];

    return { success: true, dates: uniqueDates };
  } catch (error) {
    console.error('Error fetching available dates:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteSlotsForAvailability(
  availabilityId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('teacher_time_slots')
      .delete()
      .eq('teacher_availability_id', availabilityId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting slots:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getTeacherBookings(
  teacherId: string
): Promise<{ success: boolean; error?: string; bookings?: any[] }> {
  try {
    const { data, error } = await supabase
      .from('teacher_bookings')
      .select(`
        *,
        time_slot:teacher_time_slots(
          date,
          start_time,
          end_time
        )
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, bookings: data || [] };
  } catch (error) {
    console.error('Error fetching teacher bookings:', error);
    return { success: false, error: (error as Error).message };
  }
}
