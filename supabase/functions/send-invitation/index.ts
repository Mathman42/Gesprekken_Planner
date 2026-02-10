import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  parentName: string;
  parentEmail: string;
  parentPassword?: string;
  teacherName: string;
  template: string;
  loginLink: string;
}

function replacePlaceholders(template: string, data: RequestPayload): string {
  let result = template;

  result = result.replace(/\[naam-ouder\]/g, data.parentName);
  result = result.replace(/\[email-ouder\]/g, data.parentEmail);
  result = result.replace(/\[naam-docent\]/g, data.teacherName);
  result = result.replace(/\[login-link\]/g, data.loginLink);

  if (data.parentPassword) {
    result = result.replace(/\[wachtwoord\]/g, data.parentPassword);
  } else {
    result = result.replace(/\[wachtwoord\]/g, '(gebruik magic link om in te loggen)');
  }

  return result;
}

function createHtmlEmail(content: string, teacherName: string): string {
  const lines = content.split('\n');
  const subject = lines[0].replace('Onderwerp: ', '').trim();
  const body = lines.slice(2).join('\n');

  const htmlBody = body
    .split('\n')
    .map(line => {
      if (line.trim() === '') return '<br>';
      if (line.includes('http://') || line.includes('https://')) {
        return `<p style="margin: 10px 0;">${line.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color: #1e3a8a; text-decoration: underline;">$1</a>')}</p>`;
      }
      return `<p style="margin: 10px 0;">${line}</p>`;
    })
    .join('');

  return `
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
            <p>Voortgangsgesprek Boeking</p>
          </div>
          <div class="content">
            ${htmlBody}
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
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: RequestPayload = await req.json();

    if (!payload.parentEmail || !payload.template || !payload.teacherName || !payload.loginLink) {
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

    const processedContent = replacePlaceholders(payload.template, payload);
    const lines = processedContent.split('\n');
    const subject = lines[0].replace('Onderwerp: ', '').trim();
    const htmlBody = createHtmlEmail(processedContent, payload.teacherName);

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
        to: payload.parentEmail,
        subject: subject,
        html: htmlBody,
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

    console.log('Invitation email sent successfully:', resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation email sent successfully",
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
    console.error("Error sending invitation:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send invitation" }),
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
