import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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

    console.log(`[ExportBlend] Starting export for blend ${blendId}`);
    const startTime = Date.now();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: transition, error: transitionError } = await supabase
      .from("transitions")
      .select("*")
      .eq("id", config.transitionId)
      .single();

    if (transitionError || !transition) {
      throw new Error("Transition not found");
    }

    const useNewWorkflow = !transition.output_url && transition.metadata?.templateAudioUrl;

    if (!transition.output_url && !useNewWorkflow) {
      throw new Error("Transition has neither rendered audio nor template metadata. Please configure the transition first.");
    }

    if (useNewWorkflow) {
      console.log(`[ExportBlend] Using new workflow with template audio from metadata`);
    } else {
      console.log(`[ExportBlend] Using legacy workflow with pre-rendered transition from: ${transition.output_url}`);
    }

    const { data: songA, error: songAError } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", config.songAId)
      .single();

    const { data: songB, error: songBError } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", config.songBId)
      .single();

    if (songAError || !songA || songBError || !songB) {
      throw new Error("Failed to fetch song data");
    }

    console.log(`[ExportBlend] Processing songs:`, {
      songA: songA.original_name,
      songB: songB.original_name,
    });

    const songAClipStart = transition.song_a_clip_start || 18;
    const songBClipEnd = transition.song_b_clip_end || 12;
    const songBDuration = songB.analysis?.duration || 0;

    const tempDir = await Deno.makeTempDir();
    console.log(`[ExportBlend] Created temp directory: ${tempDir}`);

    const songAPath = `${tempDir}/song_a.mp3`;
    const songBPath = `${tempDir}/song_b.mp3`;
    const transitionPath = `${tempDir}/transition.wav`;
    const outputPath = `${tempDir}/blend.${config.format}`;

    console.log(`[ExportBlend] Downloading audio files...`);

    if (useNewWorkflow) {
      const templateAudioUrl = transition.metadata.templateAudioUrl;
      console.log(`[ExportBlend] Downloading template audio from: ${templateAudioUrl}`);

      await Promise.all([
        downloadFile(songA.url, songAPath),
        downloadFile(songB.url, songBPath),
        downloadFile(templateAudioUrl, transitionPath),
      ]);
    } else {
      await Promise.all([
        downloadFile(songA.url, songAPath),
        downloadFile(songB.url, songBPath),
        downloadFile(transition.output_url, transitionPath),
      ]);
    }

    console.log(`[ExportBlend] Audio files downloaded successfully`);

    const songABeginningPath = `${tempDir}/song_a_beginning.wav`;
    const songBEndingPath = `${tempDir}/song_b_ending.wav`;

    console.log(`[ExportBlend] Extracting segments...`);

    let songADuration, songBStartTime, songBRemaining;

    if (useNewWorkflow) {
      songADuration = transition.song_a_marker_point - songAClipStart;
      songBStartTime = transition.song_b_marker_point;
      songBRemaining = songBDuration - songBStartTime;

      console.log(`[ExportBlend] New workflow segments:`);
      console.log(`[ExportBlend] Song A: ${songAClipStart}s to ${transition.song_a_marker_point}s (${songADuration}s)`);
      console.log(`[ExportBlend] Template: full duration from metadata`);
      console.log(`[ExportBlend] Song B: ${songBStartTime}s to end (${songBRemaining}s)`);

      await Promise.all([
        extractSegment(songAPath, songABeginningPath, songAClipStart, songADuration),
        extractSegment(songBPath, songBEndingPath, songBStartTime, songBRemaining),
      ]);
    } else {
      console.log(`[ExportBlend] Legacy workflow segments:`);
      console.log(`[ExportBlend] Song A: 0 to ${songAClipStart}s`);
      console.log(`[ExportBlend] Transition: pre-rendered segment`);
      console.log(`[ExportBlend] Song B: ${songBClipEnd}s to end`);

      songBRemaining = songBDuration - songBClipEnd;

      await Promise.all([
        extractSegment(songAPath, songABeginningPath, 0, songAClipStart),
        extractSegment(songBPath, songBEndingPath, songBClipEnd, songBRemaining),
      ]);
    }

    console.log(`[ExportBlend] Segments extracted successfully`);

    let songAFadedPath = songABeginningPath;
    let transitionFadedPath = transitionPath;
    let songBFadedPath = songBEndingPath;

    if (useNewWorkflow && transition.metadata?.blenderOutput) {
      console.log(`[ExportBlend] Applying fade effects from metadata...`);

      const blenderOutput = transition.metadata.blenderOutput;

      if (blenderOutput.songASegment?.keyframes?.length > 0) {
        songAFadedPath = `${tempDir}/song_a_faded.wav`;
        await applyVolumeKeyframes(songABeginningPath, songAFadedPath, blenderOutput.songASegment.keyframes, songADuration);
      }

      if (blenderOutput.templateSegment?.fadeInKeyframes?.length > 0 || blenderOutput.templateSegment?.fadeOutKeyframes?.length > 0) {
        transitionFadedPath = `${tempDir}/transition_faded.wav`;
        await applyTemplateFades(
          transitionPath,
          transitionFadedPath,
          blenderOutput.templateSegment.fadeInKeyframes || [],
          blenderOutput.templateSegment.fadeOutKeyframes || [],
          blenderOutput.templateSegment.duration
        );
      }

      if (blenderOutput.songBSegment?.keyframes?.length > 0) {
        songBFadedPath = `${tempDir}/song_b_faded.wav`;
        await applyVolumeKeyframes(songBEndingPath, songBFadedPath, blenderOutput.songBSegment.keyframes, songBRemaining);
      }

      console.log(`[ExportBlend] Fade effects applied successfully`);
    }

    const concatListPath = `${tempDir}/concat.txt`;
    const concatList = [
      `file '${songAFadedPath}'`,
      `file '${transitionFadedPath}'`,
      `file '${songBFadedPath}'`,
    ].join("\n");
    await Deno.writeTextFile(concatListPath, concatList);

    console.log(`[ExportBlend] Concatenating segments...`);

    let filterChain = "";
    const filters = [];

    if (config.fadeIn > 0) {
      filters.push(`afade=t=in:st=0:d=${config.fadeIn}`);
    }

    if (config.fadeOut > 0) {
      const totalDuration = useNewWorkflow
        ? (songADuration + config.transitionDuration + songBRemaining)
        : (songAClipStart + config.transitionDuration + songBRemaining);
      const fadeOutStart = totalDuration - config.fadeOut;
      filters.push(`afade=t=out:st=${fadeOutStart}:d=${config.fadeOut}`);
    }

    if (config.normalize) {
      filters.push("loudnorm=I=-16:LRA=11:TP=-1.5");
    }

    if (filters.length > 0) {
      filterChain = filters.join(",");
    }

    const ffmpegArgs = [
      "-f", "concat",
      "-safe", "0",
      "-i", concatListPath,
    ];

    if (filterChain) {
      ffmpegArgs.push("-af", filterChain);
    }

    ffmpegArgs.push(
      "-ar", config.sampleRate.toString(),
      "-y",
      outputPath
    );

    const concatCmd = new Deno.Command("ffmpeg", {
      args: ffmpegArgs,
      stdout: "piped",
      stderr: "piped",
    });

    const concatOutput = await concatCmd.output();
    if (!concatOutput.success) {
      const error = new TextDecoder().decode(concatOutput.stderr);
      console.error(`[ExportBlend] Concatenation failed:`, error);
      throw new Error(`FFmpeg concatenation failed: ${error.substring(0, 200)}`);
    }

    console.log(`[ExportBlend] Concatenation successful`);

    const outputFile = await Deno.readFile(outputPath);
    const outputSize = outputFile.byteLength;

    const { data: blendData } = await supabase
      .from("blends")
      .select("user_id, filename")
      .eq("id", blendId)
      .single();

    if (!blendData) {
      throw new Error("Blend record not found");
    }

    const fileName = blendData.filename;

    console.log(`[ExportBlend] Uploading to storage:`, {
      fileName,
      size: outputSize,
      format: config.format,
    });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("blends")
      .upload(fileName, outputFile, {
        contentType: `audio/${config.format}`,
        upsert: true,
      });

    if (uploadError) {
      console.error(`[ExportBlend] Upload failed:`, uploadError);
      throw new Error(`Failed to upload: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from("blends")
      .getPublicUrl(fileName);

    const processingTime = (Date.now() - startTime) / 1000;

    console.log(`[ExportBlend] Updating blend record with output URL`);

    const { error: updateError } = await supabase
      .from("blends")
      .update({
        status: "completed",
        url: publicUrlData.publicUrl,
        file_size: outputSize,
        updated_at: new Date().toISOString(),
      })
      .eq("id", blendId);

    if (updateError) {
      console.error(`[ExportBlend] Database update failed:`, updateError);
      throw new Error(`Failed to update blend: ${updateError.message}`);
    }

    await Deno.remove(tempDir, { recursive: true });

    console.log(`[ExportBlend] Export complete in ${processingTime}s`);

    return new Response(
      JSON.stringify({
        success: true,
        blendId,
        url: publicUrlData.publicUrl,
        fileSize: outputSize,
        processingTime,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("[ExportBlend] Error:", error);

    const body = await req.json().catch(() => ({}));
    if (body.blendId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from("blends")
        .update({
          status: "failed",
          export_settings: {
            error: error.message,
            failedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.blendId);
    }

    return new Response(
      JSON.stringify({
        error: error.message || "Export failed",
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

async function applyVolumeKeyframes(
  inputPath: string,
  outputPath: string,
  keyframes: Array<{ position: number; value: number }>,
  duration: number
): Promise<void> {
  if (!keyframes || keyframes.length === 0) {
    await Deno.copyFile(inputPath, outputPath);
    return;
  }

  const volumeExpression = keyframes
    .map((kf, idx) => {
      const timeInSeconds = (kf.position / 100) * duration;
      const volumeDb = 20 * Math.log10(kf.value);
      return `'if(lt(t,${timeInSeconds}),${volumeDb},${volumeDb})'`;
    })
    .join(":");

  const volumeFilter = `volume=${keyframes.map((kf, idx) => {
    const timeInSeconds = (kf.position / 100) * duration;
    const nextTime = idx < keyframes.length - 1
      ? (keyframes[idx + 1].position / 100) * duration
      : duration;
    const volumeDb = 20 * Math.log10(Math.max(0.001, kf.value));
    return `'if(between(t,${timeInSeconds},${nextTime}),${volumeDb})'`;
  }).join(":")}:eval=frame`;

  const simpleVolume = keyframes.map((kf, idx) => {
    const nextKf = keyframes[idx + 1];
    if (!nextKf) return null;

    const startTime = (kf.position / 100) * duration;
    const endTime = (nextKf.position / 100) * duration;
    const startVol = Math.max(0.001, kf.value);
    const endVol = Math.max(0.001, nextKf.value);

    return `afade=t=custom:st=${startTime}:d=${endTime - startTime}:curve=exp`;
  }).filter(Boolean).join(",");

  const avgVolume = keyframes.reduce((sum, kf) => sum + kf.value, 0) / keyframes.length;
  const volumeDb = 20 * Math.log10(Math.max(0.001, avgVolume));

  const cmd = new Deno.Command("ffmpeg", {
    args: [
      "-i", inputPath,
      "-af", `volume=${volumeDb}dB`,
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
    console.error(`[ExportBlend] Volume keyframe application failed:`, error);
    throw new Error(`FFmpeg volume keyframe failed: ${error.substring(0, 200)}`);
  }
}

async function applyTemplateFades(
  inputPath: string,
  outputPath: string,
  fadeInKeyframes: Array<{ position: number; value: number }>,
  fadeOutKeyframes: Array<{ position: number; value: number }>,
  duration: number
): Promise<void> {
  if ((!fadeInKeyframes || fadeInKeyframes.length === 0) &&
      (!fadeOutKeyframes || fadeOutKeyframes.length === 0)) {
    await Deno.copyFile(inputPath, outputPath);
    return;
  }

  const filters = [];

  if (fadeInKeyframes && fadeInKeyframes.length > 0) {
    const avgFadeInVol = fadeInKeyframes.reduce((sum, kf) => sum + kf.value, 0) / fadeInKeyframes.length;
    const fadeInDb = 20 * Math.log10(Math.max(0.001, avgFadeInVol));
    filters.push(`afade=t=in:st=0:d=0.5`);
  }

  if (fadeOutKeyframes && fadeOutKeyframes.length > 0) {
    const avgFadeOutVol = fadeOutKeyframes.reduce((sum, kf) => sum + kf.value, 0) / fadeOutKeyframes.length;
    const fadeOutDb = 20 * Math.log10(Math.max(0.001, avgFadeOutVol));
    const fadeOutStart = Math.max(0, duration - 0.5);
    filters.push(`afade=t=out:st=${fadeOutStart}:d=0.5`);
  }

  const cmd = new Deno.Command("ffmpeg", {
    args: [
      "-i", inputPath,
      "-af", filters.join(","),
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
    console.error(`[ExportBlend] Template fade application failed:`, error);
    throw new Error(`FFmpeg template fade failed: ${error.substring(0, 200)}`);
  }
}

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
