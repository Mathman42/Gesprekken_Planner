import type { Database } from './database';

export type Event = Database['public']['Tables']['events']['Row'];
export type EventInsert = Database['public']['Tables']['events']['Insert'];
export type EventUpdate = Database['public']['Tables']['events']['Update'];

export type TimeSlot = Database['public']['Tables']['time_slots']['Row'];
export type TimeSlotInsert = Database['public']['Tables']['time_slots']['Insert'];
export type TimeSlotUpdate = Database['public']['Tables']['time_slots']['Update'];

export type Booking = Database['public']['Tables']['bookings']['Row'];
export type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
export type BookingUpdate = Database['public']['Tables']['bookings']['Update'];

export type MagicLink = Database['public']['Tables']['magic_links']['Row'];
export type MagicLinkInsert = Database['public']['Tables']['magic_links']['Insert'];

export type ActivityLog = Database['public']['Tables']['activity_log']['Row'];
export type ActivityLogInsert = Database['public']['Tables']['activity_log']['Insert'];

export type Setting = Database['public']['Tables']['settings']['Row'];

export type Teacher = Database['public']['Tables']['teachers']['Row'];
export type TeacherInsert = Database['public']['Tables']['teachers']['Insert'];

export type TeacherAvailability = Database['public']['Tables']['teacher_availability']['Row'];
export type TeacherAvailabilityInsert = Database['public']['Tables']['teacher_availability']['Insert'];
export type TeacherAvailabilityUpdate = Database['public']['Tables']['teacher_availability']['Update'];

export type TeacherTimeSlot = Database['public']['Tables']['teacher_time_slots']['Row'];
export type TeacherTimeSlotInsert = Database['public']['Tables']['teacher_time_slots']['Insert'];
export type TeacherTimeSlotUpdate = Database['public']['Tables']['teacher_time_slots']['Update'];

export type TeacherBooking = Database['public']['Tables']['teacher_bookings']['Row'];
export type TeacherBookingInsert = Database['public']['Tables']['teacher_bookings']['Insert'];
export type TeacherBookingUpdate = Database['public']['Tables']['teacher_bookings']['Update'];

export type TeacherSettings = Database['public']['Tables']['teacher_settings']['Row'];
export type TeacherSettingsInsert = Database['public']['Tables']['teacher_settings']['Insert'];
export type TeacherSettingsUpdate = Database['public']['Tables']['teacher_settings']['Update'];

export type Parent = Database['public']['Tables']['parents']['Row'];
export type ParentInsert = Database['public']['Tables']['parents']['Insert'];
export type ParentUpdate = Database['public']['Tables']['parents']['Update'];

export interface TimeSlotWithBooking extends TimeSlot {
  booking?: Booking | null;
}

export interface TeacherTimeSlotWithBooking extends TeacherTimeSlot {
  booking?: TeacherBooking | null;
}

export type SlotStatus = 'available' | 'blocked' | 'booked' | 'selected';

export interface EventWithStats extends Event {
  total_slots: number;
  booked_slots: number;
  available_slots: number;
}

export type UserRole = 'admin' | 'parent' | 'teacher';

export interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  email: string | null;
  magicLinkToken: string | null;
}
