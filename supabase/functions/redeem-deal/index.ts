// deno-lint-ignore-file no-explicit-any
declare const Deno: any;

import { corsHeaders, getSupabaseClient } from "../_shared/auth.ts";

type RedeemBody = {
  deal_id?: string;
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
    );
  }

  let body: RedeemBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
    );
  }

  if (!body.deal_id) {
    return new Response(
      JSON.stringify({ error: "deal_id is required" }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
    );
  }

  const supabase = getSupabaseClient(authHeader);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
    );
  }

  const { data, error } = await supabase.rpc("redeem_deal", {
    p_user_id: user.id,
    p_deal_id: body.deal_id,
  });

  if (error) {
    const message = error.message ?? "Redeem failed";
    const status = message.toLowerCase().includes("insufficient")
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

