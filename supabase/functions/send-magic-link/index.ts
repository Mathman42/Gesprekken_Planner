import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  email: string;
  token: string;
  magicLinkUrl: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, token, magicLinkUrl }: RequestPayload = await req.json();

    if (!email || !token || !magicLinkUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // In a production environment, you would integrate with an email service here
    // For example: SendGrid, Resend, AWS SES, etc.
    // For now, we'll log the magic link (in production, this would send an email)

    console.log("Magic Link Email:");
    console.log("To:", email);
    console.log("Link:", magicLinkUrl);

    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Kempenhorst College</h1>
              <p>Ouderavond Boeking</p>
            </div>
            <div class="content">
              <h2>Uw inloglink</h2>
              <p>Klik op de onderstaande knop om in te loggen en een tijdslot te boeken voor de ouderavond:</p>
              <div style="text-align: center;">
                <a href="${magicLinkUrl}" class="button">Inloggen en Boeken</a>
              </div>
              <p><strong>Let op:</strong> Deze link is 15 minuten geldig en kan slechts één keer worden gebruikt.</p>
              <p>Als u deze link niet heeft aangevraagd, kunt u deze email negeren.</p>
            </div>
            <div class="footer">
              <p><strong>Kempenhorst College</strong></p>
              <p>Eikenbussel 1, 5689 AA Oirschot</p>
              <p>T: +31 (0)499 58 21 60</p>
              <p><a href="https://kempenhorst.nl" style="color: #2563eb;">kempenhorst.nl</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Kempenhorst College <onboarding@resend.dev>',
        to: email,
        subject: 'Uw inloglink voor ouderavond boeking',
        html: emailBody,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log('Email sent successfully:', resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Magic link email sent successfully",
        emailId: resendData.id
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending magic link:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send magic link" }),
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
