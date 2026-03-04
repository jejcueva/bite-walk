// deno-lint-ignore-file no-explicit-any
declare const Deno: any;

import { corsHeaders, getServiceClient } from "../_shared/auth.ts";

type ValidateBody = {
  voucher_id?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
    );
  }

  let body: ValidateBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
    );
  }

  if (!body.voucher_id) {
    return new Response(
      JSON.stringify({ error: "voucher_id is required" }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
    );
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase.rpc("validate_voucher", {
    p_voucher_id: body.voucher_id,
  });

  if (error) {
    const message = error.message ?? "Validation failed";
    const status = message.toLowerCase().includes("expired") ||
        message.toLowerCase().includes("inactive")
      ? 400
      : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  return new Response(
    JSON.stringify(row ?? {}),
    { status: 200, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
  );
});

