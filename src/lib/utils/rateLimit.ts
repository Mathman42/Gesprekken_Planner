import { supabase } from '../supabase';

const MAX_REQUESTS_PER_IP = 3;
const MAX_REQUESTS_PER_EMAIL = 5;
const RATE_LIMIT_WINDOW_HOURS = 1;

export const checkRateLimit = async (
  ipAddress: string,
  email: string | null,
  actionType: string
): Promise<{ allowed: boolean; reason?: string }> => {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - RATE_LIMIT_WINDOW_HOURS);

  // Check IP-based rate limit
  const { data: ipLogs, error: ipError } = await supabase
    .from('rate_limit_log')
    .select('*')
    .eq('ip_address', ipAddress)
    .eq('action_type', actionType)
    .gte('created_at', oneHourAgo.toISOString());

  if (ipError) {
    console.error('Error checking IP rate limit:', ipError);
    return { allowed: true };
  }

  if (ipLogs && ipLogs.length >= MAX_REQUESTS_PER_IP) {
    return {
      allowed: false,
      reason: 'Te veel verzoeken van dit IP-adres. Probeer het later opnieuw.',
    };
  }

  // Check email-based rate limit if email provided
  if (email) {
    const { data: emailLogs, error: emailError } = await supabase
      .from('rate_limit_log')
      .select('*')
      .eq('email', email)
      .eq('action_type', actionType)
      .gte('created_at', oneHourAgo.toISOString());

    if (emailError) {
      console.error('Error checking email rate limit:', emailError);
      return { allowed: true };
    }

    if (emailLogs && emailLogs.length >= MAX_REQUESTS_PER_EMAIL) {
      return {
        allowed: false,
        reason: 'Te veel verzoeken voor dit e-mailadres. Probeer het later opnieuw.',
      };
    }
  }

  return { allowed: true };
};

export const logRateLimit = async (
  ipAddress: string,
  email: string | null,
  actionType: string
): Promise<void> => {
  await supabase.from('rate_limit_log').insert({
    ip_address: ipAddress,
    email,
    action_type: actionType,
  });
};

// Helper to get client IP (in production, this should come from headers)
export const getClientIP = (): string => {
  // This is a placeholder - in production, you'd get this from request headers
  // For now, generate a mock IP for development
  return '127.0.0.1';
};
