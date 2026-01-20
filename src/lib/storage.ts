import { supabase } from './supabase';
import { activityLogger } from './analytics';

export interface UploadResult {
  id: string;
  url: string;
  path: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  analysis?: AudioAnalysis;
  metadata: {
    filename: string;
    size: number;
    mimeType: string;
    duration?: number;
    analysis?: AudioAnalysis;
  };
}

export interface AudioAnalysis {
  duration: number;
  bpm?: number;
  key?: string;
  energy?: number;
  danceability?: number;
  valence?: number;
  loudness?: number;
  spectrogramUrl?: string;
  waveformData?: number[];
}

class StorageService {
  private readonly BUCKET_NAME = 'audio-uploads';
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly ALLOWED_TYPES = [
    'audio/mpeg',
    'audio/wav', 
    'audio/flac',
    'audio/mp4',
    'audio/aac',
    'audio/x-m4a'
  ];

  /**
   * Upload an audio file to Supabase storage
   */
  async uploadAudioFile(
    file: File, 
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    // Validate file
    this.validateFile(file);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    try {
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error(`Storage bucket '${this.BUCKET_NAME}' not found. Please create this bucket in your Supabase project's Storage section before uploading files.`);
        }
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      // Analyze audio file
      const analysis = await this.analyzeAudioFile(file);

      // Create upload record in database
      const { data: uploadRecord, error: dbError } = await supabase
        .from('uploads')
        .insert({
          user_id: userId,
          filename: fileName,
          original_name: file.name,
          mime_type: file.type,
          size: file.size,
          url: urlData.publicUrl,
          status: 'processing',
          analysis: analysis
        })
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from(this.BUCKET_NAME).remove([fileName]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Trigger background analysis
      this.triggerBackgroundAnalysis(uploadRecord.id, urlData.publicUrl);

      // Log upload start
      await activityLogger.logUpload('started', uploadRecord.id, userId, {
        filename: file.name,
        size: file.size,
        mimeType: file.type
      });

      return {
        id: uploadRecord.id,
        url: urlData.publicUrl,
        path: fileName,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        status: 'processing',
        analysis: analysis,
        metadata: {
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          duration: analysis.duration,
          analysis: analysis
        }
      };

    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Trigger background audio analysis
   */
  private async triggerBackgroundAnalysis(uploadId: string, audioUrl: string): Promise<void> {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-audio`;
      
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      // Fire and forget - don't wait for analysis to complete
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          uploadId,
          audioUrl
        })
      });
      
      if (response.ok) {
        // Log successful analysis trigger
        await activityLogger.logActivity('upload_analysis_started', {
          uploadId,
          audioUrl
        });
      }
      
    } catch (error) {
      console.error('Failed to trigger background analysis:', error);
    }
  }

  /**
   * Get upload by ID with fresh URL
   */
  async getUpload(uploadId: string): Promise<UploadResult | null> {
    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (error || !data) {
      return null;
    }

    // Generate fresh signed URL for security
    const { data: urlData } = await supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(data.filename, 3600); // 1 hour expiry

    return {
      id: data.id,
      url: urlData?.signedUrl || data.url,
      path: data.filename,
      originalName: data.original_name,
      mimeType: data.mime_type || 'audio/mpeg',
      size: data.size,
      status: data.status || 'ready',
      analysis: data.analysis,
      metadata: {
        filename: data.original_name,
        size: data.size,
        mimeType: data.mime_type || 'audio/mpeg',
        duration: data.analysis?.duration,
        analysis: data.analysis
      }
    };
  }

  /**
   * Get user's uploads
   */
  async getUserUploads(userId: string): Promise<UploadResult[]> {
    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch uploads: ${error.message}`);
    }

    return data.map(upload => ({
      id: upload.id,
      url: upload.url,
      path: upload.filename,
      originalName: upload.original_name,
      mimeType: upload.mime_type || 'audio/mpeg',
      size: upload.size,
      status: upload.status || 'ready',
      analysis: upload.analysis,
      metadata: {
        filename: upload.original_name,
        size: upload.size,
        mimeType: upload.mime_type || 'audio/mpeg',
        duration: upload.analysis?.duration,
        analysis: upload.analysis
      }
    }));
  }

  /**
   * Get upload analysis status
   */
  async getUploadAnalysis(uploadId: string): Promise<{
    status: 'uploading' | 'processing' | 'ready' | 'error';
    analysis?: any;
  } | null> {
    const { data, error } = await supabase
      .from('uploads')
      .select('status, analysis')
      .eq('id', uploadId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      status: data.status,
      analysis: data.analysis
    };
  }

  /**
   * Subscribe to upload analysis updates
   */
  subscribeToAnalysisUpdates(
    uploadId: string, 
    callback: (status: string, analysis?: any) => void
  ) {
    return supabase
      .channel(`upload-${uploadId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'uploads',
          filter: `id=eq.${uploadId}`
        },
        (payload) => {
          callback(payload.new.status, payload.new.analysis);
        }
      )
      .subscribe();
  }

  /**
   * Delete upload and file
   */
  async deleteUpload(uploadId: string, userId: string): Promise<void> {
    // Get upload record
    const { data: upload, error: fetchError } = await supabase
      .from('uploads')
      .select('filename')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !upload) {
      throw new Error('Upload not found');
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([upload.filename]);

    if (storageError) {
      console.warn('Failed to delete file from storage:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('uploads')
      .delete()
      .eq('id', uploadId)
      .eq('user_id', userId);

    if (dbError) {
      throw new Error(`Failed to delete upload record: ${dbError.message}`);
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): void {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large: ${Math.round(file.size / 1024 / 1024)}MB (max: 100MB)`);
    }

    if (file.size === 0) {
      throw new Error('File is empty');
    }
  }

  /**
   * Analyze audio file for metadata
   */
  private async analyzeAudioFile(file: File): Promise<AudioAnalysis> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      const cleanup = () => {
        URL.revokeObjectURL(url);
      };

      audio.addEventListener('loadedmetadata', () => {
        const analysis: AudioAnalysis = {
          duration: audio.duration || 0
        };
        
        cleanup();
        resolve(analysis);
      });
      
      audio.addEventListener('error', () => {
        cleanup();
        resolve({ duration: 0 });
      });
      
      audio.src = url;
    });
  }

  /**
   * Refresh expired URL
   */
  async refreshUrl(uploadId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('uploads')
      .select('filename')
      .eq('id', uploadId)
      .single();

    if (error || !data) {
      return null;
    }

    const { data: urlData } = await supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(data.filename, 3600);

    return urlData?.signedUrl || null;
  }
}

export const storageService = new StorageService();