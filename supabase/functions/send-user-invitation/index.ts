import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  email: string;
  resort_id: string;
  role: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email: rawEmail, resort_id, role }: RequestBody = await req.json();

    // Trim and validate email
    const email = rawEmail?.trim();

    if (!email || !resort_id || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: requesterRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('resort_id', resort_id)
      .maybeSingle();

    if (requesterRole?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can invite users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: resort } = await supabaseClient
      .from('resorts')
      .select('name')
      .eq('id', resort_id)
      .maybeSingle();

    if (!resort) {
      return new Response(
        JSON.stringify({ error: 'Resort not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { users } } = await supabaseClient.auth.admin.listUsers();
    const existingUser = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      const { data: existingRole } = await supabaseClient
        .from('user_roles')
        .select('*')
        .eq('user_id', existingUser.id)
        .eq('resort_id', resort_id)
        .maybeSingle();

      if (existingRole) {
        return new Response(
          JSON.stringify({ error: 'This user already has access to this resort' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: existingInvitation } = await supabaseClient
      .from('user_invitations')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('resort_id', resort_id)
      .eq('status', 'pending')
      .maybeSingle();

    let invitation;

    if (existingInvitation) {
      const { data: updatedInvitation, error: updateError } = await supabaseClient
        .from('user_invitations')
        .update({
          role: role,
          invited_by: user.id,
          created_at: new Date().toISOString(),
        })
        .eq('id', existingInvitation.id)
        .select()
        .single();

      if (updateError || !updatedInvitation) {
        return new Response(
          JSON.stringify({ error: 'Failed to update invitation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      invitation = updatedInvitation;
    } else {
      const { data: newInvitation, error: inviteError } = await supabaseClient
        .from('user_invitations')
        .insert({
          email: email.toLowerCase(),
          resort_id: resort_id,
          role: role,
          invited_by: user.id,
        })
        .select()
        .single();

      if (inviteError || !newInvitation) {
        return new Response(
          JSON.stringify({ error: 'Failed to create invitation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      invitation = newInvitation;
    }

    if (!invitation) {
      return new Response(
        JSON.stringify({ error: 'Failed to create or update invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const invitationUrl = `${appUrl}?invite=${invitation.token}`;

    const { data: inviterData } = await supabaseClient.auth.admin.getUserById(user.id);
    const inviterEmail = inviterData?.user?.email || 'noreply@resort.com';

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">You're Invited!</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hello,</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              You have been invited to join <strong style="color: #10b981;">${resort.name}</strong> as a <strong>${role}</strong>.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${invitationUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 8px 0;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: #10b981; font-size: 14px; word-break: break-all; margin: 0 0 24px 0;">
              ${invitationUrl}
            </p>
            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 32px;">
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
                This invitation will expire in 7 days. If you did not expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${resort.name} <noreply@alunalun.co>`,
        to: email,
        subject: `Invitation to join ${resort.name}`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error('Failed to send email:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to send invitation email',
          details: error
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: existingInvitation ? 'Invitation resent successfully' : 'Invitation sent successfully',
        invitation_url: invitationUrl,
        resent: !!existingInvitation,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
