
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

async function refreshAccessToken(
  supabaseAdmin: any,
  userId: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string
) {
  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshResponse.ok) return { error: 'Failed to refresh token' };

  const tokens = await refreshResponse.json();
  const { access_token, expires_in } = tokens;
  const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();

  await supabaseAdmin
    .from('user_tokens')
    .update({ access_token, expires_at, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('provider', 'google_contacts');

  return { access_token };
}

async function sendGmailNotification(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  body: string
) {
  const rawContent = `From: ${from}\r\nTo: ${to}\r\nSubject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${body}`;
  const encodedEmail = btoa(unescape(encodeURIComponent(rawContent)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedEmail }),
  });

  return response.ok;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

    const payload = await req.json();
    const { type, record, sender_id, recipient_id, message } = payload;

    console.log(`[Notification] Processing ${type} for user ${recipient_id}`);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Verificar preferências do destinatário
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('notification_settings, first_name')
      .eq('id', recipient_id)
      .single();

    if (!profile || profile.notification_settings?.email_notifications !== true) {
      return new Response(JSON.stringify({ message: 'Email skipped' }), { status: 200, headers: corsHeaders });
    }

    // 2. Buscar email do destinatário
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(recipient_id);
    const recipientEmail = userRes.user?.email;

    // 3. Buscar tokens do REMETENTE para enviar via Gmail dele (ou usar um sistema se fornecido)
    // Se não houver tokens do remetente, tentamos buscar de um admin ou falhamos email
    const { data: tokenData } = await supabaseAdmin
      .from('user_tokens')
      .select('*')
      .eq('user_id', sender_id)
      .eq('provider', 'google_contacts')
      .single();

    if (!tokenData || !recipientEmail) {
      console.warn(`[Notification] No gmail token for sender ${sender_id} or no email for recipient.`);
      return new Response(JSON.stringify({ message: 'No email sent (missing config)' }), { status: 200, headers: corsHeaders });
    }

    let accessToken = tokenData.access_token;
    if (new Date(tokenData.expires_at) < new Date()) {
      const refresh = await refreshAccessToken(supabaseAdmin, sender_id, tokenData.refresh_token, GOOGLE_CLIENT_ID!, GOOGLE_CLIENT_SECRET!);
      if (refresh.error) throw new Error(refresh.error);
      accessToken = refresh.access_token!;
    }

    const { data: senderRes } = await supabaseAdmin.auth.admin.getUserById(sender_id);
    const senderEmail = senderRes.user?.email || 'noreply@axelpro.com';

    const subject = `AXEL PRO CRM: ${type === 'mention' ? 'Você foi mencionado' : 'Atualização de Tarefa'}`;
    const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #3b82f6;">Olá ${profile.first_name || 'Usuário'},</h2>
                <p style="font-size: 16px; color: #374151;">${message}</p>
                <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 6px;">
                    <strong>Título:</strong> ${record.title || record.content || 'N/A'}
                </div>
                <p style="font-size: 14px; color: #6b7280;">Acesse o portal para mais detalhes.</p>
                <a href="https://app.axelpro.com.br/tarefas?task=${record.id}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Tarefa</a>
            </div>
        `;

    await sendGmailNotification(accessToken, senderEmail, recipientEmail, subject, htmlBody);

    return new Response(JSON.stringify({ message: 'OK' }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error('[Notification Error]', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
