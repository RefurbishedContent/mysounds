import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { RenderRequest, RenderConfig, AudioTrack, TemplatePlacement } from './types.ts';
import { AudioProcessor } from './audioProcessor.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

let renderStartTime: number;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    renderStartTime = Date.now();
    const { jobId, projectId, userId, format, quality }: RenderRequest = await req.json();
    
    // Log render start
    await logActivity(userId, 'render_started', {
      jobId,
      projectId,
      format,
      quality,
      timestamp: new Date().toISOString()
    });
    
    // Consume credits before starting render
    const { data: creditsConsumed, error: creditsError } = await supabase.rpc('consume_credits_for_render', {
      user_id_param: userId,
      render_job_id_param: jobId,
      credits_needed: 1
    });
    
    if (creditsError || !creditsConsumed) {
      throw new Error('Insufficient credits or failed to consume credits');
    }
    
    // Update job status to processing
    await updateJobStatus(jobId, 'processing', 0, 'Starting render process...');
    
    // Fetch project data
    const project = await fetchProjectData(projectId, userId);
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Fetch audio tracks
    await updateJobStatus(jobId, 'processing', 10, 'Fetching audio tracks...');
    const tracks = await fetchAudioTracks(project);
    
    // Fetch template placements
    await updateJobStatus(jobId, 'processing', 20, 'Loading template placements...');
    const placements = await fetchTemplatePlacements(projectId);
    
    // Generate render config
    const renderConfig = generateRenderConfig(format, quality);
    
    // Process audio
    await updateJobStatus(jobId, 'processing', 30, 'Processing audio tracks...');
    const processedAudio = await processAudioTracks(tracks, placements, renderConfig, (progress) => {
      updateJobStatus(jobId, 'processing', 30 + (progress * 0.5), `Processing audio: ${Math.round(progress)}%`);
    });
    
    // Apply master effects
    await updateJobStatus(jobId, 'processing', 80, 'Applying master effects...');
    const masteredAudio = await applyMasterEffects(processedAudio, renderConfig);
    
    // Export files
    await updateJobStatus(jobId, 'processing', 90, 'Exporting files...');
    const outputUrls = await exportAudioFiles(masteredAudio, renderConfig, jobId);
    
    // Update job completion
    await updateJobStatus(jobId, 'completed', 100, 'Render completed successfully', outputUrls);
    
    // Log successful render completion
    await logActivity(userId, 'render_completed', {
      jobId,
      projectId,
      format,
      quality,
      outputUrls,
      processingTime: Date.now() - renderStartTime
    });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId,
        outputUrls 
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
    
  } catch (error) {
    console.error('Render error:', error);
    
    // Update job with error
    if (req.body) {
      try {
        const { jobId } = await req.json();
        
        // Refund credits for failed render
        await supabase.rpc('refund_credits_for_failed_render', {
          user_id_param: userId,
          render_job_id_param: jobId
        });
        
        await updateJobStatus(
          jobId, 
          'failed', 
          0, 
          `Render failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        
        // Log render failure
        await logActivity(userId, 'render_failed', {
          jobId,
          projectId,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime: Date.now() - renderStartTime
        });
      } catch (e) {
        console.error('Failed to update error state:', e);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Render failed' 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});

async function updateJobStatus(
  jobId: string, 
  status: string, 
  progress: number, 
  message: string,
  outputUrls?: { outputUrl?: string; losslessUrl?: string }
) {
  const updateData: any = {
    status,
    progress,
    processing_logs: Deno.env.get('SUPABASE_DB_URL') ? 
      `jsonb_insert(processing_logs, '{-1}', '{"timestamp": "${new Date().toISOString()}", "message": "${message}"}')` :
      JSON.stringify([{ timestamp: new Date().toISOString(), message }]),
    updated_at: new Date().toISOString()
  };
  
  if (status === 'processing' && progress === 0) {
    updateData.started_at = new Date().toISOString();
  }
  
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
    if (outputUrls) {
      updateData.output_url = outputUrls.outputUrl;
      updateData.lossless_url = outputUrls.losslessUrl;
    }
  }
  
  if (status === 'failed') {
    updateData.error_message = message;
  }
  
  const { error } = await supabase
    .from('render_jobs')
    .update(updateData)
    .eq('id', jobId);
    
  if (error) {
    console.error('Failed to update job status:', error);
  }
}

async function fetchProjectData(projectId: string, userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      template_placements(*)
    `)
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();
    
  if (error) {
    throw new Error(`Failed to fetch project: ${error.message}`);
  }
  
  return data;
}

async function fetchAudioTracks(project: any): Promise<AudioTrack[]> {
  const tracks: AudioTrack[] = [];
  
  // Fetch Track A
  if (project.track1_url) {
    tracks.push({
      id: 'trackA',
      url: project.track1_url,
      startOffset: 0,
      volume: 1.0,
      analysis: project.track1_analysis
    });
  }
  
  // Fetch Track B
  if (project.track2_url) {
    tracks.push({
      id: 'trackB',
      url: project.track2_url,
      startOffset: 0,
      volume: 1.0,
      analysis: project.track2_analysis
    });
  }
  
  return tracks;
}

async function fetchTemplatePlacements(projectId: string): Promise<TemplatePlacement[]> {
  const { data, error } = await supabase
    .from('template_placements')
    .select(`
      *,
      template:templates(*)
    `)
    .eq('project_id', projectId);
    
  if (error) {
    throw new Error(`Failed to fetch template placements: ${error.message}`);
  }
  
  return data.map((placement: any) => ({
    id: placement.id,
    templateId: placement.template_id,
    startTime: placement.start_time,
    duration: placement.template.duration,
    trackARegion: {
      start: placement.track_a_start,
      end: placement.track_a_end
    },
    trackBRegion: {
      start: placement.track_b_start,
      end: placement.track_b_end
    },
    parameters: placement.parameter_overrides || {},
    transitions: placement.template.template_data?.transitions || []
  }));
}

function generateRenderConfig(format: string, quality: string): RenderConfig {
  const configs = {
    draft: { sampleRate: 44100, bitDepth: 16, bitrate: 128, normalize: false },
    standard: { sampleRate: 44100, bitDepth: 16, bitrate: 320, normalize: true },
    high: { sampleRate: 48000, bitDepth: 24, bitrate: 320, normalize: true },
    lossless: { sampleRate: 48000, bitDepth: 24, normalize: true }
  };
  
  const config = configs[quality as keyof typeof configs] || configs.standard;
  
  return {
    ...config,
    fadeIn: 0,
    fadeOut: 0
  };
}

async function processAudioTracks(
  tracks: AudioTrack[],
  placements: TemplatePlacement[],
  config: RenderConfig,
  onProgress: (progress: number) => void
): Promise<ArrayBuffer> {
  const processor = new AudioProcessor(config);

  const totalDuration = Math.max(
    ...tracks.map(track => track.analysis?.duration || 240)
  );

  const channels = await processor.mixTracks(tracks, placements, totalDuration, onProgress);

  if (config.normalize) {
    onProgress(85);
    processor.normalize(channels);
  }

  if (config.fadeIn > 0 || config.fadeOut > 0) {
    onProgress(90);
    processor.applyFades(channels, config.fadeIn, config.fadeOut);
  }

  onProgress(95);
  const audioBuffer = processor.encodeWAV(channels, config.sampleRate, config.bitDepth);

  return audioBuffer;
}

async function applyMasterEffects(audioBuffer: ArrayBuffer, config: RenderConfig): Promise<ArrayBuffer> {
  return audioBuffer;
}

async function exportAudioFiles(
  audioBuffer: ArrayBuffer, 
  config: RenderConfig, 
  jobId: string
): Promise<{ outputUrl?: string; losslessUrl?: string }> {
  const results: { outputUrl?: string; losslessUrl?: string } = {};
  
  // Export main format
  const mainFileName = `render-${jobId}.${config.bitrate ? 'mp3' : 'wav'}`;
  const mainFileUrl = await uploadToStorage(audioBuffer, mainFileName);
  results.outputUrl = mainFileUrl;
  
  // Export lossless if not already lossless
  if (config.bitrate) {
    const losslessFileName = `render-${jobId}-lossless.wav`;
    const losslessUrl = await uploadToStorage(audioBuffer, losslessFileName);
    results.losslessUrl = losslessUrl;
  }
  
  return results;
}

async function uploadToStorage(audioBuffer: ArrayBuffer, fileName: string): Promise<string> {
  // Upload to Supabase storage
  const { data, error } = await supabase.storage
    .from('renders')
    .upload(`renders/${fileName}`, audioBuffer, {
      contentType: fileName.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav',
      cacheControl: '3600'
    });
    
  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('renders')
    .getPublicUrl(`renders/${fileName}`);
    
  return urlData.publicUrl;
}
async function logActivity(
  userId: string,
  eventType: string,
  eventData: any
) {
  try {
    const { error } = await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_event_type: eventType,
      p_event_data: eventData,
      p_session_id: `server_${Date.now()}`
    });
    
    if (error) {
      console.warn('Activity logging failed:', error);
    }
  } catch (error) {
    console.warn('Activity logging error:', error);
  }
}