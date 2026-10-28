import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateTeacherRequest {
  email: string;
  name: string;
  password: string;
  password_must_change: boolean;
}

interface UpdateTeacherRequest {
  id: string;
  email: string;
  name: string;
  password?: string;
  password_must_change: boolean;
}

interface DeleteTeacherRequest {
  id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    if (user.email !== "sk.janssen@gmail.com") {
      throw new Error("Only admin can manage teachers");
    }

    const url = new URL(req.url);
    const method = req.method;

    if (method === "POST") {
      const body: CreateTeacherRequest = await req.json();

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          name: body.name,
          role: "teacher",
        },
      });

      if (authError) {
        throw authError;
      }

      const { data: teacherData, error: teacherError } = await supabaseAdmin
        .from("teachers")
        .insert({
          id: authData.user.id,
          email: body.email,
          name: body.name,
          password_must_change: body.password_must_change,
        })
        .select()
        .single();

      if (teacherError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw teacherError;
      }

      return new Response(
        JSON.stringify({ success: true, data: teacherData }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (method === "PUT") {
      const body: UpdateTeacherRequest = await req.json();

      if (body.password) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          body.id,
          {
            password: body.password,
            user_metadata: {
              name: body.name,
            },
          }
        );

        if (authError) {
          throw authError;
        }
      }

      const { data: teacherData, error: teacherError } = await supabaseAdmin
        .from("teachers")
        .update({
          email: body.email,
          name: body.name,
          password_must_change: body.password_must_change,
        })
        .eq("id", body.id)
        .select()
        .single();

      if (teacherError) {
        throw teacherError;
      }

      return new Response(
        JSON.stringify({ success: true, data: teacherData }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (method === "DELETE") {
      const body: DeleteTeacherRequest = await req.json();

      const { error: teacherError } = await supabaseAdmin
        .from("teachers")
        .delete()
        .eq("id", body.id);

      if (teacherError) {
        throw teacherError;
      }

      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(body.id);

      if (authError) {
        throw authError;
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
