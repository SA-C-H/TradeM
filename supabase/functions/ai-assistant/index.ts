import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
    const chatUrl =
      Deno.env.get("OPENAI_API_URL") ?? "https://api.openai.com/v1/chat/completions";

    const systemPrompts: Record<string, string> = {
      coach: `You are an expert trading coach and mentor. You analyze traders' performance data, provide actionable feedback on discipline, risk management, and psychology. You help traders improve their edge by identifying patterns in their behavior and results. Be direct, supportive, and data-driven. Use trading terminology naturally. Format your responses with markdown for readability.`,
      analysis: `You are an expert trade analyst. When given trade data, you provide detailed analysis including:
- Entry/exit quality assessment
- Risk management evaluation
- Pattern recognition across multiple trades
- Specific, actionable improvements
- Emotional pattern detection
Be precise with numbers and honest about mistakes. Use markdown formatting.`,
      sentiment: `You are a market sentiment analyst specializing in forex and commodities. You provide:
- Current market sentiment analysis for given instruments
- Key economic events and their potential impact
- Technical and fundamental confluence analysis
- Risk factors to watch
Be concise and actionable. Use markdown formatting. Note: You provide educational analysis, not financial advice.`,
    };

    const systemMessage = systemPrompts[mode] || systemPrompts.coach;

    const response = await fetch(chatUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemMessage },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service quota or billing limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI API error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
