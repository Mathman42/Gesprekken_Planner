import { supabase } from '../supabase';
import type {
  TeacherAgenda,
  TeacherAgendaInsert,
  TeacherAgendaUpdate,
  TeacherAgendaWithStats,
} from '../types';

export const agendaService = {
  async getTeacherAgendas(teacherId: string): Promise<TeacherAgenda[]> {
    const { data, error } = await supabase
      .from('teacher_agendas')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getTeacherAgendasWithStats(teacherId: string): Promise<TeacherAgendaWithStats[]> {
    const { data, error } = await supabase
      .from('teacher_agendas')
      .select(`
        *,
        teacher_time_slots(id, is_blocked),
        teacher_bookings(id)
      `)
      .eq('teacher_id', teacherId)
      .order('start_date', { ascending: false });

    if (error) throw error;

    return (data || []).map((agenda: any) => {
      const slots = agenda.teacher_time_slots || [];
      const bookings = agenda.teacher_bookings || [];
      const totalSlots = slots.length;
      const bookedSlots = bookings.length;
      const availableSlots = slots.filter((s: any) => !s.is_blocked).length - bookedSlots;

      const { teacher_time_slots, teacher_bookings, ...agendaData } = agenda;

      return {
        ...agendaData,
        total_slots: totalSlots,
        booked_slots: bookedSlots,
        available_slots: Math.max(0, availableSlots),
      };
    });
  },

  async getAgendaById(agendaId: string): Promise<TeacherAgenda | null> {
    const { data, error } = await supabase
      .from('teacher_agendas')
      .select('*')
      .eq('id', agendaId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createAgenda(agenda: TeacherAgendaInsert): Promise<TeacherAgenda> {
    const { data, error } = await supabase
      .from('teacher_agendas')
      .insert(agenda)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAgenda(agendaId: string, updates: TeacherAgendaUpdate): Promise<TeacherAgenda> {
    const { data, error } = await supabase
      .from('teacher_agendas')
      .update(updates)
      .eq('id', agendaId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAgenda(agendaId: string): Promise<void> {
    const { error } = await supabase
      .from('teacher_agendas')
      .delete()
      .eq('id', agendaId);

    if (error) throw error;
  },

  async activateAgenda(agendaId: string, openBooking: boolean = true): Promise<TeacherAgenda> {
    return this.updateAgenda(agendaId, {
      status: 'active',
      is_booking_open: openBooking,
    });
  },

  async closeAgenda(agendaId: string): Promise<TeacherAgenda> {
    return this.updateAgenda(agendaId, {
      status: 'closed',
      is_booking_open: false,
      closed_at: new Date().toISOString(),
    });
  },

  async archiveAgenda(agendaId: string): Promise<TeacherAgenda> {
    return this.updateAgenda(agendaId, {
      status: 'archived',
      is_booking_open: false,
    });
  },

  async toggleBooking(agendaId: string, isOpen: boolean): Promise<TeacherAgenda> {
    return this.updateAgenda(agendaId, {
      is_booking_open: isOpen,
    });
  },

  async updateDateRange(
    agendaId: string,
    startDate: string,
    endDate: string
  ): Promise<TeacherAgenda> {
    return this.updateAgenda(agendaId, {
      start_date: startDate,
      end_date: endDate,
    });
  },

  async getActiveAgendasForBooking(): Promise<TeacherAgenda[]> {
    const { data, error } = await supabase
      .from('teacher_agendas')
      .select('*')
      .eq('status', 'active')
      .eq('is_booking_open', true)
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getAgendaBookings(agendaId: string) {
    const { data, error } = await supabase
      .from('teacher_bookings')
      .select(`
        *,
        teacher_time_slots(*)
      `)
      .eq('agenda_id', agendaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAgendaTimeSlots(agendaId: string) {
    const { data, error } = await supabase
      .from('teacher_time_slots')
      .select(`
        *,
        teacher_bookings(*)
      `)
      .eq('agenda_id', agendaId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
