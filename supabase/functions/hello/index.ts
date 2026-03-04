import { corsHeaders } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  return new Response(
    JSON.stringify({ message: "BiteWalk Edge Functions are live" }),
    {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
      status: 200,
    }
  );
});
