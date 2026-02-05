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

export interface TimeSlotWithBooking extends TimeSlot {
  booking?: Booking | null;
}

export interface EventWithStats extends Event {
  total_slots: number;
  booked_slots: number;
  available_slots: number;
}

export type UserRole = 'admin' | 'parent';

export interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  email: string | null;
  magicLinkToken: string | null;
}
