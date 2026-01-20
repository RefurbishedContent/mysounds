import { supabase } from '../supabase';
import { databaseService } from '../database';
import { storageService } from '../storage';
import { TimelineData } from '../../types/timeline';
import { TimelineAdapter } from '../adapters/timelineAdapter';

/**
 * Timeline data queries using existing Supabase schema
 * Provides read-only access to timeline data for audio engine
 */
export class TimelineQueries {
  /**
   * Fetch complete timeline data for a project
   */
  static async fetchTimelineData(projectId: string, userId: string): Promise<TimelineData | null> {
    try {
      // Fetch project data
      const project = await this.fetchProject(projectId, userId);
      if (!project) return null;

      // Fetch related data in parallel
      const [uploads, templatePlacements, templates] = await Promise.all([
        this.fetchProjectUploads(projectId, userId),
        this.fetchTemplatePlacements(projectId),
        this.fetchTemplatesMap(projectId)
      ]);

      // Map to canonical types
      return TimelineAdapter.mapTimelineData(
        project,
        uploads,
        templatePlacements,
        templates
      );
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
      return null;
    }
  }

  /**
   * Fetch project by ID
   */
  static async fetchProject(projectId: string, userId: string) {
    // For demo/testing, return mock data if projectId is 'demo'
    if (projectId === 'demo') {
      return {
        id: 'demo',
        name: 'Demo Project',
        description: 'Sample project for testing Tone.js integration',
        duration: 180,
        bpm: 128,
        status: 'draft' as const,
        trackAUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        trackBUrl: 'https://file-examples.com/storage/fe68c1266b6667068c2dab4/2017/11/file_example_MP3_700KB.mp3',
        trackAName: 'Demo Track A',
        trackBName: 'Demo Track B',
        templatePlacements: [{
          id: 'demo-placement',
          templateId: 'demo-template',
          startTime: 60,
          trackARegion: { start: 50, end: 80 },
          trackBRegion: { start: 0, end: 30 },
          parameterOverrides: { crossfadeDuration: 16 }
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    return await databaseService.getProject(projectId, userId);
  }

  /**
   * Fetch tracks for a project (mapped from project URLs and uploads)
   */
  static async fetchTracks(projectId: string, userId: string) {
    const project = await this.fetchProject(projectId, userId);
    if (!project) return [];

    const uploads = await this.fetchProjectUploads(projectId, userId);
    return TimelineAdapter.mapTracks(project, uploads);
  }

  /**
   * Fetch clips for a project (mapped from tracks)
   */
  static async fetchClips(projectId: string, userId: string) {
    const tracks = await this.fetchTracks(projectId, userId);
    return TimelineAdapter.mapClips(tracks);
  }

  /**
   * Fetch transitions for a project (mapped from template placements)
   */
  static async fetchTransitions(projectId: string, userId: string) {
    const project = await this.fetchProject(projectId, userId);
    if (!project) return [];

    const [uploads, templatePlacements, templates] = await Promise.all([
      this.fetchProjectUploads(projectId, userId),
      this.fetchTemplatePlacements(projectId),
      this.fetchTemplatesMap(projectId)
    ]);

    const tracks = TimelineAdapter.mapTracks(project, uploads);
    return TimelineAdapter.mapTransitions(project, templatePlacements, templates, tracks);
  }

  /**
   * Fetch uploads associated with a project
   */
  private static async fetchProjectUploads(projectId: string, userId: string) {
    // For demo project, return mock uploads
    if (projectId === 'demo') {
      return [
        {
          id: 'demo-upload-a',
          url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
          path: 'demo/track-a.m4a',
          metadata: {
            filename: 'Demo Track A',
            size: 1024000,
            mimeType: 'audio/mp4',
            duration: 120,
            analysis: {
              bpm: 128,
              key: 'C major',
              energy: 0.8
            }
          }
        },
        {
          id: 'demo-upload-b',
          url: 'https://file-examples.com/storage/fe68c1266b6667068c2dab4/2017/11/file_example_MP3_700KB.mp3',
          path: 'demo/track-b.mp3',
          metadata: {
            filename: 'Demo Track B',
            size: 2048000,
            mimeType: 'audio/mpeg',
            duration: 95,
            analysis: {
              bpm: 132,
              key: 'A minor',
              energy: 0.9
            }
          }
        }
      ];
    }
    
    try {
      // Get all user uploads and filter by those used in the project
      const uploads = await storageService.getUserUploads(userId);
      
      // For now, we'll return all uploads since we don't have direct upload IDs in projects
      // In production, you might want to add upload_id fields to projects table
      return uploads;
    } catch (error) {
      console.error('Failed to fetch project uploads:', error);
      return [];
    }
  }

  /**
   * Fetch template placements for a project
   */
  private static async fetchTemplatePlacements(projectId: string) {
    // For demo project, return mock placements
    if (projectId === 'demo') {
      return [{
        id: 'demo-placement',
        templateId: 'demo-template',
        startTime: 60,
        trackARegion: { start: 50, end: 80 },
        trackBRegion: { start: 0, end: 30 },
        parameterOverrides: { crossfadeDuration: 16 }
      }];
    }
    
    try {
      // Since template_placements table doesn't exist in the schema, 
      // check if template placements are stored in project_data jsonb field
      const { data: project, error } = await supabase
        .from('projects')
        .select('project_data, template_id')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Failed to fetch project for template placements:', error);
        return [];
      }

      const placements = [];

      // Check if there's a single template assigned to the project
      if (project.template_id) {
        // Single template assignment
        placements.push({
          id: `placement-${project.template_id}`,
          templateId: project.template_id,
          startTime: 0, // Default start time
          trackARegion: { start: 0, end: 30 },
          trackBRegion: { start: 0, end: 30 },
          parameterOverrides: {}
        });
      }

      // Check if template placements are in project_data
      if (project.project_data?.templatePlacements) {
        placements.push(...project.project_data.templatePlacements);
      }

      return placements;
    } catch (error) {
      console.error('Failed to fetch template placements:', error);
      return [];
    }
  }

  /**
   * Fetch templates used in a project
   */
  private static async fetchTemplatesMap(projectId: string): Promise<Map<string, any>> {
    // For demo project, return mock template
    if (projectId === 'demo') {
      const mockTemplate = {
        id: 'demo-template',
        name: 'Demo Crossfade',
        description: 'Sample crossfade template for testing',
        category: 'house',
        duration: 30,
        difficulty: 'beginner',
        author: 'Demo Author',
        templateData: {
          transitions: [{
            id: 'demo-transition',
            type: 'crossfade',
            startTime: 0,
            duration: 30,
            parameters: {
              volumeAutomation: [
                { time: 0, trackA: 100, trackB: 0 },
                { time: 15, trackA: 50, trackB: 50 },
                { time: 30, trackA: 0, trackB: 100 }
              ]
            }
          }]
        }
      };
      
      return new Map([['demo-template', mockTemplate]]);
    }
    
    try {
      // Get template ID from project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('template_id, project_data')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return new Map();
      }

      const templateIds: string[] = [];
      
      // Add single template if assigned
      if (project.template_id) {
        templateIds.push(project.template_id);
      }

      // Add templates from project_data placements
      if (project.project_data?.templatePlacements) {
        project.project_data.templatePlacements.forEach((placement: any) => {
          if (placement.templateId && !templateIds.includes(placement.templateId)) {
            templateIds.push(placement.templateId);
          }
        });
      }

      if (templateIds.length === 0) {
        return new Map();
      }

      // Fetch template data
      const { data: templates, error: templatesError } = await supabase
        .from('templates')
        .select('*')
        .in('id', templateIds);

      if (templatesError || !templates) {
        console.error('Failed to fetch templates:', templatesError);
        return new Map();
      }

      // Convert to Map
      const templateMap = new Map();
      templates.forEach(template => {
        templateMap.set(template.id, {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          duration: template.duration,
          difficulty: template.difficulty,
          author: template.author,
          templateData: template.template_data,
          parameterSchema: template.template_data?.parameterSchema || {},
          transitions: template.template_data?.transitions || []
        });
      });

      return templateMap;
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      return new Map();
    }
  }

  /**
   * Refresh signed URLs for tracks
   */
  static async refreshTrackUrls(tracks: Track[]): Promise<Track[]> {
    const refreshPromises = tracks.map(async (track) => {
      try {
        // Try to refresh URL if it's a Supabase signed URL
        if (track.url.includes('supabase') && track.url.includes('token=')) {
          // Extract upload info and refresh
          // This is a simplified approach - in production you'd store upload IDs
          const uploads = await storageService.getUserUploads('current-user');
          const matchingUpload = uploads.find(upload => 
            upload.metadata.filename === track.name ||
            upload.url === track.url
          );
          
          if (matchingUpload) {
            const refreshedUrl = await storageService.refreshUrl(matchingUpload.id);
            if (refreshedUrl) {
              return { ...track, url: refreshedUrl };
            }
          }
        }
        
        return track;
      } catch (error) {
        console.warn(`Failed to refresh URL for track ${track.name}:`, error);
        return track;
      }
    });

    return await Promise.all(refreshPromises);
  }

  /**
   * Get project timeline bounds
   */
  static async getProjectBounds(projectId: string, userId: string): Promise<{
    startSec: number;
    endSec: number;
    totalDuration: number;
  } | null> {
    const timelineData = await this.fetchTimelineData(projectId, userId);
    if (!timelineData) return null;

    return TimelineAdapter.getTimelineBounds(timelineData);
  }

  /**
   * Check if project has audio content ready for playback
   */
  static async isProjectPlayable(projectId: string, userId: string): Promise<{
    isPlayable: boolean;
    missingElements: string[];
  }> {
    const missingElements: string[] = [];

    try {
      const project = await this.fetchProject(projectId, userId);
      if (!project) {
        return { isPlayable: false, missingElements: ['Project not found'] };
      }

      // Check for audio tracks
      if (!project.trackAUrl && !project.trackBUrl) {
        missingElements.push('No audio tracks uploaded');
      } else if (!project.trackAUrl) {
        missingElements.push('Track A not uploaded');
      } else if (!project.trackBUrl) {
        missingElements.push('Track B not uploaded');
      }

      // Check for template placements
      const placements = await this.fetchTemplatePlacements(projectId);
      if (placements.length === 0) {
        missingElements.push('No mixing templates placed');
      }

      return {
        isPlayable: missingElements.length === 0,
        missingElements
      };
    } catch (error) {
      console.error('Failed to check project playability:', error);
      return {
        isPlayable: false,
        missingElements: ['Failed to check project status']
      };
    }
  }

  /**
   * Get playback-ready timeline data with URL validation
   */
  static async getPlaybackData(projectId: string, userId: string): Promise<{
    timelineData: TimelineData | null;
    isReady: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const timelineData = await this.fetchTimelineData(projectId, userId);
      if (!timelineData) {
        return {
          timelineData: null,
          isReady: false,
          errors: ['Failed to load timeline data']
        };
      }

      // Validate track URLs
      const urlValidation = await Promise.all(
        timelineData.tracks.map(async (track) => {
          try {
            // Quick HEAD request to check if URL is accessible
            const response = await fetch(track.url, { method: 'HEAD' });
            return { trackId: track.id, valid: response.ok };
          } catch {
            return { trackId: track.id, valid: false };
          }
        })
      );

      // Collect invalid URLs
      const invalidTracks = urlValidation.filter(v => !v.valid);
      if (invalidTracks.length > 0) {
        errors.push(`Invalid audio URLs for tracks: ${invalidTracks.map(t => t.trackId).join(', ')}`);
      }

      // Check minimum requirements
      if (timelineData.tracks.length === 0) {
        errors.push('No audio tracks available');
      }

      if (timelineData.clips.length === 0) {
        errors.push('No audio clips to play');
      }

      return {
        timelineData,
        isReady: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        timelineData: null,
        isReady: false,
        errors: [`Failed to prepare playback data: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}