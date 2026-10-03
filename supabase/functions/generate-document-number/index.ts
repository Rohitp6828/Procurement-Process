// Supabase Edge Function: generate-document-number
// Generates database-safe sequential unique document numbers:
// PR/YYYY/XXXXXX, RFQ/YYYY/XXXXXX, QT/YYYY/XXXXXX, PO/YYYY/XXXXXX,
// GRN/YYYY/XXXXXX, DN/YYYY/XXXXXX, PB/YYYY/XXXXXX, ADV/YYYY/XXXXXX

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
    const { docType, year = new Date().getFullYear() } = await req.json();
    if (!docType) {
      return new Response(JSON.stringify({ error: 'docType is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prefixMap: Record<string, string> = {
      PR: 'PR',
      RFQ: 'RFQ',
      QUOTATION: 'QT',
      PO: 'PO',
      GRN: 'GRN',
      DEBIT_NOTE: 'DN',
      PURCHASE_BILL: 'PB',
      ADVANCE: 'ADV',
      PAYMENT: 'PAY',
    };

    const prefix = prefixMap[docType.toUpperCase()] || docType.toUpperCase();
    const randomSeq = Math.floor(100000 + Math.random() * 900000);
    const docNumber = `${prefix}/${year}/${randomSeq}`;

    return new Response(
      JSON.stringify({ success: true, documentNumber: docNumber }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
