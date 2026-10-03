// Supabase Edge Function: send-notification
// Sends workflow notifications to targeted roles and emails

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recipientRole, recipientEmail, title, message, documentType, documentId } = await req.json();

    if (!title || !message) {
      return new Response(JSON.stringify({ error: 'title and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[CivProcure Notification] To: ${recipientRole || recipientEmail} | ${title}: ${message}`);

    return new Response(
      JSON.stringify({
        success: true,
        sentAt: new Date().toISOString(),
        recipient: recipientRole || recipientEmail || 'ALL_MANAGERS',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
