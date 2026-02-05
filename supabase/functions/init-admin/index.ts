import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if admin user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const adminExists = existingUser?.users.some((u) => u.email === 'admin@kempenhorst.nl');

    if (adminExists) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Admin user already exists',
          email: 'admin@kempenhorst.nl'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Create admin user
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: 'admin@kempenhorst.nl',
      password: 'KempenhorstAdmin2024!',
      email_confirm: true,
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin user created successfully',
        email: 'admin@kempenhorst.nl',
        defaultPassword: 'KempenhorstAdmin2024!'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
