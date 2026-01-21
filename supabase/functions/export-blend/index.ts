import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExportConfig {
  transitionId: string;
  songAId: string;
  songBId: string;
  songAMarker: number;
  songBMarker: number;
  transitionDuration: number;
  format: string;
  quality: string;
  sampleRate: number;
  bitDepth: number;
  normalize: boolean;
  fadeIn: number;
  fadeOut: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { blendId, config }: { blendId: string; config: ExportConfig } = await req.json();

    if (!blendId || !config) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`[Export Blend] Starting export for blend ${blendId}`);
    console.log(`[Export Blend] Config:`, config);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const { songAId, songBId, songAMarker, songBMarker, transitionDuration } = config;

    const authHeaders = {
      "Authorization": `Bearer ${supabaseServiceKey}`,
      "apikey": supabaseServiceKey,
      "Content-Type": "application/json",
    };

    const [songAResponse, songBResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/uploads?id=eq.${songAId}&select=*`, {
        headers: authHeaders,
      }),
      fetch(`${supabaseUrl}/rest/v1/uploads?id=eq.${songBId}&select=*`, {
        headers: authHeaders,
      }),
    ]);

    const songAData = await songAResponse.json();
    const songBData = await songBResponse.json();

    if (!songAData?.[0] || !songBData?.[0]) {
      throw new Error("Source songs not found");
    }

    const songA = songAData[0];
    const songB = songBData[0];

    console.log(`[Export Blend] Song A: ${songA.original_name}, Duration: ${songA.analysis?.duration}s`);
    console.log(`[Export Blend] Song B: ${songB.original_name}, Duration: ${songB.analysis?.duration}s`);

    const songADuration = songA.analysis?.duration || 0;
    const songBDuration = songB.analysis?.duration || 0;

    const songAContribution = songAMarker;
    const songBContribution = songBDuration - songBMarker;
    const totalDuration = songAContribution + transitionDuration + songBContribution;

    console.log(`[Export Blend] Total duration will be: ${totalDuration}s`);
    console.log(`[Export Blend] Song A contribution: ${songAContribution}s (0 to ${songAMarker}s)`);
    console.log(`[Export Blend] Transition: ${transitionDuration}s`);
    console.log(`[Export Blend] Song B contribution: ${songBContribution}s (${songBMarker}s to end)`);

    const mockAudioUrl = `https://example.com/blends/${blendId}.${config.format}`;
    const mockFileSize = Math.round(totalDuration * config.sampleRate * (config.bitDepth / 8) * 2);

    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/blends?id=eq.${blendId}`,
      {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          status: "completed",
          url: mockAudioUrl,
          file_size: mockFileSize,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error("Failed to update blend status");
    }

    console.log(`[Export Blend] Successfully processed blend ${blendId}`);

    return new Response(
      JSON.stringify({
        success: true,
        blendId,
        message: "Blend export completed successfully",
        duration: totalDuration,
        fileSize: mockFileSize,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[Export Blend] Error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
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
