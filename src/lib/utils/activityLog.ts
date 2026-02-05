import { supabase } from '../supabase';
import type { Json } from '../types/database';

export type ActivityType =
  | 'admin_login'
  | 'admin_logout'
  | 'magic_link_request'
  | 'magic_link_used'
  | 'event_created'
  | 'event_updated'
  | 'event_deleted'
  | 'slot_created'
  | 'slot_updated'
  | 'slot_deleted'
  | 'booking_created'
  | 'booking_cancelled'
  | 'settings_updated';

export const logActivity = async (
  actionType: ActivityType,
  actorEmail: string | null,
  actorIp: string | null,
  details?: Record<string, unknown>
): Promise<void> => {
  try {
    await supabase.from('activity_log').insert({
      action_type: actionType,
      actor_email: actorEmail,
      actor_ip: actorIp,
      details: (details as Json) || null,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

export const getActivityLogs = async (
  limit: number = 50,
  offset: number = 0,
  filters?: {
    actionType?: ActivityType;
    actorEmail?: string;
    startDate?: string;
    endDate?: string;
  }
) => {
  let query = supabase
    .from('activity_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.actionType) {
    query = query.eq('action_type', filters.actionType);
  }

  if (filters?.actorEmail) {
    query = query.eq('actor_email', filters.actorEmail);
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  return query;
};
