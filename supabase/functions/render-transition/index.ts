import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RenderRequest {
  transitionId: string;
  userId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { transitionId, userId }: RenderRequest = await req.json();

    if (!transitionId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: transitionId, userId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[RenderTransition] Starting render for transition ${transitionId}`);
    const startTime = Date.now();

    const { data: transition, error: fetchError } = await supabase
      .from("transitions")
      .select("*")
      .eq("id", transitionId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !transition) {
      console.error("[RenderTransition] Transition not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Transition not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase
      .from("transitions")
      .update({
        status: "rendering",
        render_attempts: (transition.render_attempts || 0) + 1,
        render_error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transitionId);

    const { data: songA, error: songAError } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", transition.song_a_id)
      .single();

    const { data: songB, error: songBError } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", transition.song_b_id)
      .single();

    if (songAError || !songA || songBError || !songB) {
      throw new Error("Failed to fetch song data");
    }

    console.log("[RenderTransition] Fetched songs:", {
      songA: songA.original_name,
      songB: songB.original_name,
    });

    const songAClipStart = transition.song_a_clip_start || 18;
    const songAMarker = transition.song_a_marker_point || 30;
    const songBMarker = transition.song_b_marker_point || 0;
    const songBClipEnd = transition.song_b_clip_end || 12;
    const transitionDuration = transition.transition_duration || 12;

    const templateAudioUrl = transition.metadata?.templateAudioUrl;
    if (!templateAudioUrl) {
      throw new Error("No template audio URL found in transition metadata");
    }

    console.log("[RenderTransition] Processing parameters:", {
      songAClipStart,
      songAMarker,
      songBMarker,
      songBClipEnd,
      transitionDuration,
      templateAudioUrl,
    });

    const tempDir = await Deno.makeTempDir();
    console.log("[RenderTransition] Created temp directory:", tempDir);

    const songAPath = `${tempDir}/song_a.mp3`;
    const songBPath = `${tempDir}/song_b.mp3`;
    const templatePath = `${tempDir}/template.mp3`;
    const outputPath = `${tempDir}/transition.wav`;

    const songAUrl = songA.url;
    const songBUrl = songB.url;

    console.log("[RenderTransition] Downloading audio files...");

    await Promise.all([
      downloadFile(songAUrl, songAPath),
      downloadFile(songBUrl, songBPath),
      downloadFile(templateAudioUrl, templatePath),
    ]);

    console.log("[RenderTransition] Audio files downloaded successfully");

    const songASegmentPath = `${tempDir}/song_a_segment.wav`;
    const songBSegmentPath = `${tempDir}/song_b_segment.wav`;
    const templateSegmentPath = `${tempDir}/template_segment.wav`;

    const songASegmentDuration = songAMarker - songAClipStart;
    const songBSegmentDuration = songBClipEnd - songBMarker;

    console.log("[RenderTransition] Extracting segments...");

    await extractSegment(songAPath, songASegmentPath, songAClipStart, songASegmentDuration);
    await extractSegment(songBPath, songBSegmentPath, songBMarker, songBSegmentDuration);

    const templateDuration = transitionDuration;
    await extractSegment(templatePath, templateSegmentPath, 0, templateDuration);

    console.log("[RenderTransition] Segments extracted successfully");

    const fadeOutKeyframes = transition.metadata?.fadeOutKeyframes || [
      { position: 0, value: 1 },
      { position: 1, value: 0 },
    ];
    const fadeInKeyframes = transition.metadata?.fadeInKeyframes || [
      { position: 0, value: 0 },
      { position: 1, value: 1 },
    ];

    const songAFadedPath = `${tempDir}/song_a_faded.wav`;
    const songBFadedPath = `${tempDir}/song_b_faded.wav`;
    const templateFadedPath = `${tempDir}/template_faded.wav`;

    console.log("[RenderTransition] Applying fades...");

    await applyFadeOut(songASegmentPath, songAFadedPath, songASegmentDuration, fadeOutKeyframes);
    await applyFadeIn(songBSegmentPath, songBFadedPath, songBSegmentDuration, fadeInKeyframes);
    await applyTemplateFades(
      templateSegmentPath,
      templateFadedPath,
      templateDuration,
      fadeInKeyframes,
      fadeOutKeyframes
    );

    console.log("[RenderTransition] Fades applied successfully");

    const concatListPath = `${tempDir}/concat.txt`;
    const concatList = [
      `file '${songAFadedPath}'`,
      `file '${templateFadedPath}'`,
      `file '${songBFadedPath}'`,
    ].join("\n");
    await Deno.writeTextFile(concatListPath, concatList);

    console.log("[RenderTransition] Concatenating segments...");

    const concatCmd = new Deno.Command("ffmpeg", {
      args: [
        "-f", "concat",
        "-safe", "0",
        "-i", concatListPath,
        "-af", "loudnorm=I=-16:LRA=11:TP=-1.5",
        "-ar", "48000",
        "-y",
        outputPath,
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const concatOutput = await concatCmd.output();
    if (!concatOutput.success) {
      const error = new TextDecoder().decode(concatOutput.stderr);
      console.error("[RenderTransition] Concatenation failed:", error);
      throw new Error(`FFmpeg concatenation failed: ${error.substring(0, 200)}`);
    }

    console.log("[RenderTransition] Concatenation successful");

    const outputFile = await Deno.readFile(outputPath);
    const outputSize = outputFile.byteLength;
    const fileName = `${userId}/${transitionId}-${Date.now()}.wav`;

    console.log("[RenderTransition] Uploading to storage:", {
      fileName,
      size: outputSize,
    });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("transitions")
      .upload(fileName, outputFile, {
        contentType: "audio/wav",
        upsert: true,
      });

    if (uploadError) {
      console.error("[RenderTransition] Upload failed:", uploadError);
      throw new Error(`Failed to upload: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from("transitions")
      .getPublicUrl(fileName);

    const renderDuration = (Date.now() - startTime) / 1000;

    console.log("[RenderTransition] Updating database with output URL");

    const { error: updateError } = await supabase
      .from("transitions")
      .update({
        status: "completed",
        output_url: publicUrlData.publicUrl,
        rendered_at: new Date().toISOString(),
        render_duration_seconds: renderDuration,
        output_file_size: outputSize,
        render_error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transitionId);

    if (updateError) {
      console.error("[RenderTransition] Database update failed:", updateError);
      throw new Error(`Failed to update transition: ${updateError.message}`);
    }

    await Deno.remove(tempDir, { recursive: true });

    console.log(`[RenderTransition] Render complete in ${renderDuration}s`);

    return new Response(
      JSON.stringify({
        success: true,
        transitionId,
        outputUrl: publicUrlData.publicUrl,
        renderDuration,
        fileSize: outputSize,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[RenderTransition] Error:", error);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    if (body.transitionId) {
      await supabase
        .from("transitions")
        .update({
          status: "failed",
          render_error_message: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.transitionId);
    }

    return new Response(
      JSON.stringify({ error: error.message || "Rendering failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function downloadFile(url: string, path: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  await Deno.writeFile(path, new Uint8Array(buffer));
}

async function extractSegment(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number
): Promise<void> {
  const cmd = new Deno.Command("ffmpeg", {
    args: [
      "-i", inputPath,
      "-ss", startTime.toString(),
      "-t", duration.toString(),
      "-ar", "48000",
      "-ac", "2",
      "-y",
      outputPath,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const output = await cmd.output();
  if (!output.success) {
    const error = new TextDecoder().decode(output.stderr);
    throw new Error(`FFmpeg extract failed: ${error.substring(0, 200)}`);
  }
}

async function applyFadeOut(
  inputPath: string,
  outputPath: string,
  duration: number,
  keyframes: Array<{ position: number; value: number }>
): Promise<void> {
  const fadeFilter = buildVolumeFilter(keyframes, duration);

  const cmd = new Deno.Command("ffmpeg", {
    args: [
      "-i", inputPath,
      "-af", fadeFilter,
      "-y",
      outputPath,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const output = await cmd.output();
  if (!output.success) {
    const error = new TextDecoder().decode(output.stderr);
    throw new Error(`FFmpeg fade out failed: ${error.substring(0, 200)}`);
  }
}

async function applyFadeIn(
  inputPath: string,
  outputPath: string,
  duration: number,
  keyframes: Array<{ position: number; value: number }>
): Promise<void> {
  const fadeFilter = buildVolumeFilter(keyframes, duration);

  const cmd = new Deno.Command("ffmpeg", {
    args: [
      "-i", inputPath,
      "-af", fadeFilter,
      "-y",
      outputPath,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const output = await cmd.output();
  if (!output.success) {
    const error = new TextDecoder().decode(output.stderr);
    throw new Error(`FFmpeg fade in failed: ${error.substring(0, 200)}`);
  }
}

async function applyTemplateFades(
  inputPath: string,
  outputPath: string,
  duration: number,
  fadeInKeyframes: Array<{ position: number; value: number }>,
  fadeOutKeyframes: Array<{ position: number; value: number }>
): Promise<void> {
  const fadeInFilter = buildVolumeFilter(fadeInKeyframes, duration);
  const fadeOutFilter = buildVolumeFilter(fadeOutKeyframes, duration);

  const combinedFilter = `${fadeInFilter},${fadeOutFilter}`;

  const cmd = new Deno.Command("ffmpeg", {
    args: [
      "-i", inputPath,
      "-af", combinedFilter,
      "-y",
      outputPath,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const output = await cmd.output();
  if (!output.success) {
    const error = new TextDecoder().decode(output.stderr);
    throw new Error(`FFmpeg template fades failed: ${error.substring(0, 200)}`);
  }
}

function buildVolumeFilter(
  keyframes: Array<{ position: number; value: number }>,
  duration: number
): string {
  const sorted = [...keyframes].sort((a, b) => a.position - b.position);

  const points = sorted.map((kf) => {
    const time = kf.position * duration;
    const db = kf.value > 0 ? 20 * Math.log10(kf.value) : -100;
    return `${time}:${db}`;
  }).join("|");

  return `volume='${points}':eval=frame`;
}
