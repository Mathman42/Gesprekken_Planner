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

    const slotsWithAgenda = slots.map(slot => ({
      ...slot,
      agenda_id: availability.agenda_id,
    }));

    const { data, error } = await supabase
      .from('teacher_time_slots')
      .insert(slotsWithAgenda)
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
  date: string,
  filterByActiveAgenda: boolean = false
): Promise<{ success: boolean; error?: string; slots?: TeacherTimeSlotWithBooking[] }> {
  try {
    let slotsQuery = supabase
      .from('teacher_time_slots')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('date', date)
      .order('start_time');

    if (filterByActiveAgenda) {
      const { data: activeAgendas } = await supabase
        .from('teacher_agendas')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('status', 'active')
        .eq('is_booking_open', true);

      const activeAgendaIds = activeAgendas?.map(a => a.id) || [];

      if (activeAgendaIds.length === 0) {
        return { success: true, slots: [] };
      }

      slotsQuery = slotsQuery.in('agenda_id', activeAgendaIds);
    }

    const { data: slots, error: slotsError } = await slotsQuery;

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

    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('email', booking.parent_email)
      .maybeSingle();

    if (!parent) throw new Error('Parent not found');

    const { data: relationship } = await supabase
      .from('parent_teachers')
      .select('id')
      .eq('parent_id', parent.id)
      .eq('teacher_id', booking.teacher_id)
      .maybeSingle();

    if (!relationship) {
      throw new Error('U heeft geen toestemming om met deze docent af te spreken');
    }

    const existingBooking = await checkStudentBooking(booking.student_name);
    if (existingBooking.success && existingBooking.booking) {
      throw new Error(`Er bestaat al een afspraak voor ${booking.student_name.trim()}`);
    }

    const bookingWithAgenda = {
      ...booking,
      agenda_id: slot.agenda_id,
    };

    const { data, error } = await supabase
      .from('teacher_bookings')
      .insert([bookingWithAgenda])
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
    const { data: activeAgendas } = await supabase
      .from('teacher_agendas')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('status', 'active')
      .eq('is_booking_open', true);

    const activeAgendaIds = activeAgendas?.map(a => a.id) || [];

    if (activeAgendaIds.length === 0) {
      return { success: true, dates: [] };
    }

    const { data, error } = await supabase
      .from('teacher_availability')
      .select('date')
      .eq('teacher_id', teacherId)
      .eq('is_available', true)
      .in('agenda_id', activeAgendaIds)
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

export async function getLinkedParents(
  teacherId: string
): Promise<{ success: boolean; error?: string; parents?: any[] }> {
  try {
    const { data, error } = await supabase
      .from('parent_teachers')
      .select(`
        parent:parents(
          id,
          email,
          name
        )
      `)
      .eq('teacher_id', teacherId);

    if (error) throw error;

    const parents = data?.map((item: any) => item.parent).filter(Boolean) || [];

    return { success: true, parents };
  } catch (error) {
    console.error('Error fetching linked parents:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getAvailableTimeSlotsForDate(
  teacherId: string,
  date: string
): Promise<{ success: boolean; error?: string; slots?: TeacherTimeSlot[] }> {
  try {
    const { data: allSlots, error: slotsError } = await supabase
      .from('teacher_time_slots')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('date', date)
      .eq('is_blocked', false)
      .order('start_time');

    if (slotsError) throw slotsError;

    const { data: bookings, error: bookingsError } = await supabase
      .from('teacher_bookings')
      .select('teacher_time_slot_id')
      .eq('teacher_id', teacherId);

    if (bookingsError) throw bookingsError;

    const bookedSlotIds = new Set(bookings?.map((b) => b.teacher_time_slot_id) || []);

    const availableSlots = allSlots?.filter((slot) => !bookedSlotIds.has(slot.id)) || [];

    return { success: true, slots: availableSlots };
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function createBookingAsTeacher(
  booking: Omit<TeacherBookingInsert, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string; booking?: TeacherBooking }> {
  try {
    const { data: slot, error: slotError } = await supabase
      .from('teacher_time_slots')
      .select('*, booking:teacher_bookings(id)')
      .eq('id', booking.teacher_time_slot_id)
      .maybeSingle();

    if (slotError) throw slotError;
    if (!slot) throw new Error('Tijdslot niet gevonden');
    if (slot.is_blocked) throw new Error('Dit tijdslot is geblokkeerd');
    if ((slot as any).booking) throw new Error('Dit tijdslot is al geboekt');

    const existingBooking = await checkStudentBooking(booking.student_name);
    if (existingBooking.success && existingBooking.booking) {
      throw new Error(`Er bestaat al een afspraak voor ${booking.student_name.trim()}`);
    }

    const bookingWithAgenda = {
      ...booking,
      agenda_id: slot.agenda_id,
    };

    const { data, error } = await supabase
      .from('teacher_bookings')
      .insert([bookingWithAgenda])
      .select()
      .single();

    if (error) throw error;

    return { success: true, booking: data };
  } catch (error) {
    console.error('Error creating booking as teacher:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateTeacherBooking(
  bookingId: string,
  updates: {
    student_name?: string;
    parent_email?: string;
    teacher_time_slot_id?: string;
  }
): Promise<{ success: boolean; error?: string; booking?: TeacherBooking }> {
  try {
    const { data: currentBooking, error: fetchError } = await supabase
      .from('teacher_bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!currentBooking) throw new Error('Afspraak niet gevonden');

    if (updates.teacher_time_slot_id && updates.teacher_time_slot_id !== currentBooking.teacher_time_slot_id) {
      const { data: newSlot, error: slotError } = await supabase
        .from('teacher_time_slots')
        .select('*, booking:teacher_bookings(id)')
        .eq('id', updates.teacher_time_slot_id)
        .maybeSingle();

      if (slotError) throw slotError;
      if (!newSlot) throw new Error('Nieuw tijdslot niet gevonden');
      if (newSlot.is_blocked) throw new Error('Het nieuwe tijdslot is geblokkeerd');
      if ((newSlot as any).booking) throw new Error('Het nieuwe tijdslot is al geboekt');
    }

    if (updates.student_name && updates.student_name.trim() !== currentBooking.student_name.trim()) {
      const existingBooking = await checkStudentBooking(updates.student_name);
      if (existingBooking.success && existingBooking.booking && existingBooking.booking.id !== bookingId) {
        throw new Error(`Er bestaat al een afspraak voor ${updates.student_name.trim()}`);
      }
    }

    const { data, error } = await supabase
      .from('teacher_bookings')
      .update(updates)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, booking: data };
  } catch (error) {
    console.error('Error updating booking:', error);
    return { success: false, error: (error as Error).message };
  }
}
