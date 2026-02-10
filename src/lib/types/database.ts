export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          created_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          name: string;
          date: string;
          start_time: string;
          end_time: string;
          slot_duration: number;
          buffer_time: number;
          booking_open_at: string;
          booking_close_at: string;
          auto_close_on_start: boolean;
          is_booking_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          date: string;
          start_time: string;
          end_time: string;
          slot_duration?: number;
          buffer_time?: number;
          booking_open_at: string;
          booking_close_at: string;
          auto_close_on_start?: boolean;
          is_booking_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          slot_duration?: number;
          buffer_time?: number;
          booking_open_at?: string;
          booking_close_at?: string;
          auto_close_on_start?: boolean;
          is_booking_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      time_slots: {
        Row: {
          id: string;
          event_id: string;
          date: string;
          start_time: string;
          end_time: string;
          is_available: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          date: string;
          start_time: string;
          end_time: string;
          is_available?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          is_available?: boolean;
          created_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          slot_id: string;
          event_id: string;
          student_name: string;
          parent_email: string;
          booked_at: string;
          booking_ip: string | null;
          created_by_admin: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slot_id: string;
          event_id: string;
          student_name: string;
          parent_email: string;
          booked_at?: string;
          booking_ip?: string | null;
          created_by_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slot_id?: string;
          event_id?: string;
          student_name?: string;
          parent_email?: string;
          booked_at?: string;
          booking_ip?: string | null;
          created_by_admin?: boolean;
          created_at?: string;
        };
      };
      magic_links: {
        Row: {
          id: string;
          token: string;
          email: string;
          expires_at: string;
          used_at: string | null;
          created_ip: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          email: string;
          expires_at: string;
          used_at?: string | null;
          created_ip?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          email?: string;
          expires_at?: string;
          used_at?: string | null;
          created_ip?: string | null;
          created_at?: string;
        };
      };
      rate_limit_log: {
        Row: {
          id: string;
          ip_address: string;
          email: string | null;
          action_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ip_address: string;
          email?: string | null;
          action_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ip_address?: string;
          email?: string | null;
          action_type?: string;
          created_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          action_type: string;
          actor_email: string | null;
          actor_ip: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          action_type: string;
          actor_email?: string | null;
          actor_ip?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          action_type?: string;
          actor_email?: string | null;
          actor_ip?: string | null;
          details?: Json | null;
          created_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          updated_at?: string;
        };
      };
      teachers: {
        Row: {
          id: string;
          email: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          created_at?: string;
        };
      };
      teacher_availability: {
        Row: {
          id: string;
          teacher_id: string;
          date: string;
          start_time: string;
          end_time: string;
          is_available: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          date: string;
          start_time: string;
          end_time: string;
          is_available?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          is_available?: boolean;
          created_at?: string;
        };
      };
      teacher_time_slots: {
        Row: {
          id: string;
          teacher_availability_id: string;
          teacher_id: string;
          date: string;
          start_time: string;
          end_time: string;
          is_blocked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_availability_id: string;
          teacher_id: string;
          date: string;
          start_time: string;
          end_time: string;
          is_blocked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_availability_id?: string;
          teacher_id?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          is_blocked?: boolean;
          created_at?: string;
        };
      };
      teacher_bookings: {
        Row: {
          id: string;
          teacher_time_slot_id: string;
          teacher_id: string;
          parent_id: string | null;
          parent_email: string;
          student_name: string;
          booking_ip: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_time_slot_id: string;
          teacher_id: string;
          parent_id?: string | null;
          parent_email: string;
          student_name: string;
          booking_ip?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_time_slot_id?: string;
          teacher_id?: string;
          parent_id?: string | null;
          parent_email?: string;
          student_name?: string;
          booking_ip?: string | null;
          created_at?: string;
        };
      };
      teacher_settings: {
        Row: {
          id: string;
          teacher_id: string;
          slot_duration: number;
          buffer_time: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          slot_duration?: number;
          buffer_time?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          slot_duration?: number;
          buffer_time?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      parents: {
        Row: {
          id: string;
          email: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          created_at?: string;
        };
      };
    };
  };
}
