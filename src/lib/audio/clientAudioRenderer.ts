import * as Tone from 'tone';
import { supabase } from '../supabase';

export interface RenderProgress {
  stage: 'loading' | 'processing' | 'fading' | 'uploading' | 'complete';
  progress: number;
  message: string;
}

export interface TransitionRenderParams {
  songAUrl: string;
  songBUrl: string;
  templateUrl: string;
  songAStart: number;
  songAEnd: number;
  songBStart: number;
  songBEnd: number;
  songAKeyframes: Array<{ time: number; volume: number }>;
  songBKeyframes: Array<{ time: number; volume: number }>;
  templateDuration: number;
  transitionId: string;
  onProgress?: (progress: RenderProgress) => void;
}

export class ClientAudioRenderer {
  private abortController: AbortController | null = null;

  async renderTransition(params: TransitionRenderParams): Promise<string> {
    this.abortController = new AbortController();
    const {
      songAUrl,
      songBUrl,
      templateUrl,
      songAStart,
      songAEnd,
      songBStart,
      songBEnd,
      songAKeyframes,
      songBKeyframes,
      templateDuration,
      transitionId,
      onProgress
    } = params;

    try {
      if (!songAUrl) {
        throw new Error('Song A URL is missing');
      }
      if (!songBUrl) {
        throw new Error('Song B URL is missing');
      }
      if (!templateUrl) {
        throw new Error('Template URL is missing');
      }

      onProgress?.({ stage: 'loading', progress: 0, message: 'Loading audio files...' });

      console.log('Loading audio files:', { songAUrl, songBUrl, templateUrl });

      let songABuffer: AudioBuffer;
      let songBBuffer: AudioBuffer;
      let templateBuffer: AudioBuffer;

      try {
        onProgress?.({ stage: 'loading', progress: 10, message: 'Loading Song A...' });
        songABuffer = await this.loadAudioBuffer(songAUrl);

        onProgress?.({ stage: 'loading', progress: 20, message: 'Loading Song B...' });
        songBBuffer = await this.loadAudioBuffer(songBUrl);

        onProgress?.({ stage: 'loading', progress: 30, message: 'Loading template audio...' });
        templateBuffer = await this.loadAudioBuffer(templateUrl);
      } catch (loadError: any) {
        console.error('Audio loading failed:', loadError);
        throw new Error(`Failed to load audio files: ${loadError.message}`);
      }

      onProgress?.({ stage: 'loading', progress: 33, message: 'Audio files loaded' });

      const sampleRate = songABuffer.sampleRate;
      const totalDuration = templateDuration;

      onProgress?.({ stage: 'processing', progress: 40, message: 'Processing audio segments...' });

      const offlineContext = new OfflineAudioContext(2, totalDuration * sampleRate, sampleRate);

      const songADuration = songAEnd - songAStart;
      const songBDuration = songBEnd - songBStart;

      const songASource = offlineContext.createBufferSource();
      songASource.buffer = this.extractSegment(songABuffer, songAStart, songAEnd, sampleRate);

      const songAGain = offlineContext.createGain();
      songASource.connect(songAGain);
      songAGain.connect(offlineContext.destination);

      this.applyKeyframes(songAGain.gain, songAKeyframes, 0);
      songASource.start(0);

      onProgress?.({ stage: 'processing', progress: 55, message: 'Adding template audio...' });

      const templateSource = offlineContext.createBufferSource();
      templateSource.buffer = templateBuffer;
      templateSource.connect(offlineContext.destination);
      templateSource.start(0);

      onProgress?.({ stage: 'fading', progress: 70, message: 'Applying fade transitions...' });

      const songBOffset = totalDuration - songBDuration;
      const songBSource = offlineContext.createBufferSource();
      songBSource.buffer = this.extractSegment(songBBuffer, songBStart, songBEnd, sampleRate);

      const songBGain = offlineContext.createGain();
      songBSource.connect(songBGain);
      songBGain.connect(offlineContext.destination);

      this.applyKeyframes(songBGain.gain, songBKeyframes, songBOffset);
      songBSource.start(songBOffset);

      onProgress?.({ stage: 'fading', progress: 85, message: 'Rendering final audio...' });

      const renderedBuffer = await offlineContext.startRendering();

      onProgress?.({ stage: 'uploading', progress: 90, message: 'Converting to WAV...' });

      const wavBlob = this.bufferToWave(renderedBuffer);

      onProgress?.({ stage: 'uploading', progress: 95, message: 'Uploading to storage...' });

      const fileName = `transition_${transitionId}_${Date.now()}.wav`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('transitions')
        .upload(fileName, wavBlob, {
          contentType: 'audio/wav',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('transitions')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      await supabase
        .from('transitions')
        .update({
          output_url: publicUrl,
          render_duration: totalDuration,
          file_size: wavBlob.size
        })
        .eq('id', transitionId);

      onProgress?.({ stage: 'complete', progress: 100, message: 'Rendering complete!' });

      return publicUrl;
    } catch (error) {
      console.error('Render error:', error);
      throw error;
    }
  }

  private async loadAudioBuffer(url: string): Promise<AudioBuffer> {
    try {
      if (!url) {
        throw new Error('Audio URL is undefined or empty');
      }

      let arrayBuffer: ArrayBuffer;

      // Check if it's a public Supabase URL - these can be fetched directly
      if (url.includes('/object/public/')) {
        // Public URLs don't need authentication, just fetch directly
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        arrayBuffer = await response.arrayBuffer();
      } else if (url.includes('supabase') && url.includes('/storage/')) {
        // Private Supabase URLs need to use the SDK download method
        // Extract bucket and file path from private storage URLs
        const urlParts = new URL(url);
        const pathParts = urlParts.pathname.split('/').filter(p => p);

        // Find the bucket name (comes after 'storage' and version)
        const storageIndex = pathParts.indexOf('storage');
        if (storageIndex !== -1 && pathParts.length > storageIndex + 2) {
          const bucket = pathParts[storageIndex + 1];
          const filePath = pathParts.slice(storageIndex + 2).join('/');

          const { data, error } = await supabase.storage
            .from(bucket)
            .download(filePath);

          if (error) {
            console.error('Supabase download error:', error);
            throw new Error(`Failed to download from Supabase: ${error.message}`);
          }

          if (!data) {
            throw new Error('No data received from Supabase storage');
          }

          arrayBuffer = await data.arrayBuffer();
        } else {
          // Fallback to direct fetch
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          arrayBuffer = await response.arrayBuffer();
        }
      } else {
        // Regular URLs - just fetch directly
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        arrayBuffer = await response.arrayBuffer();
      }

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Empty audio file received');
      }

      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      return audioBuffer;
    } catch (error: any) {
      console.error('Failed to load audio buffer from:', url, error);
      throw new Error(`Audio loading failed: ${error.message}`);
    }
  }

  private extractSegment(
    buffer: AudioBuffer,
    startTime: number,
    endTime: number,
    sampleRate: number
  ): AudioBuffer {
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    const segmentLength = endSample - startSample;

    const audioContext = new AudioContext();
    const segmentBuffer = audioContext.createBuffer(
      buffer.numberOfChannels,
      segmentLength,
      sampleRate
    );

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const sourceData = buffer.getChannelData(channel);
      const targetData = segmentBuffer.getChannelData(channel);

      for (let i = 0; i < segmentLength; i++) {
        const sourceIndex = startSample + i;
        if (sourceIndex < sourceData.length) {
          targetData[i] = sourceData[sourceIndex];
        }
      }
    }

    return segmentBuffer;
  }

  private applyKeyframes(
    gainParam: AudioParam,
    keyframes: Array<{ time: number; volume: number }>,
    timeOffset: number
  ): void {
    if (keyframes.length === 0) return;

    keyframes.forEach((kf, index) => {
      const time = kf.time + timeOffset;
      const linearVolume = kf.volume;

      if (index === 0) {
        gainParam.setValueAtTime(linearVolume, time);
      } else {
        gainParam.linearRampToValueAtTime(linearVolume, time);
      }
    });
  }

  private bufferToWave(buffer: AudioBuffer): Blob {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    const sampleRate = buffer.sampleRate;
    const numChannels = numberOfChannels;

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i];
        const int16 = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
        view.setInt16(offset, int16, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  abort(): void {
    this.abortController?.abort();
  }
}

export const clientAudioRenderer = new ClientAudioRenderer();
