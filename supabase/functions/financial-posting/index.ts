// Supabase Edge Function: financial-posting
// Performs automated double-entry general ledger voucher posting:
// Purchase Account (DR), Input GST (DR), Vendor Account (CR)

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
    const { billId, billNumber, vendorId, projectId, taxableAmount, gstAmount, totalAmount } = await req.json();

    if (!billId || !vendorId || !totalAmount) {
      return new Response(JSON.stringify({ error: 'Missing required financial posting parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const year = new Date().getFullYear();
    const postingNumber = `JV/${year}/${Math.floor(100000 + Math.random() * 900000)}`;

    const journalEntries = [
      {
        account_name: 'Civil Works / Material Purchase A/C',
        account_code: 'GL-5001',
        debit: Number(taxableAmount) || (Number(totalAmount) - (Number(gstAmount) || 0)),
        credit: 0,
      },
      {
        account_name: 'Input GST Recoverable A/C',
        account_code: 'GL-1402',
        debit: Number(gstAmount) || 0,
        credit: 0,
      },
      {
        account_name: 'Vendor Accounts Payable A/C',
        account_code: 'GL-2101',
        debit: 0,
        credit: Number(totalAmount),
      }
    ];

    return new Response(
      JSON.stringify({
        success: true,
        postingNumber,
        postingDate: new Date().toISOString().split('T')[0],
        entries: journalEntries,
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
