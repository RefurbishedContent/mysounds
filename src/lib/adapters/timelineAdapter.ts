import { ProjectData, TemplateData, TemplatePlacementData } from '../database';
import { UploadResult } from '../storage';
import { Project, Track, Clip, Transition, TimelineData } from '../../types/timeline';

/**
 * Adapter to map current Supabase schema to canonical timeline types
 * This provides a clean interface for the audio engine without changing the database
 */
export class TimelineAdapter {
  /**
   * Map ProjectData to canonical Project type
   */
  static mapProject(projectData: ProjectData): Project {
    return {
      id: projectData.id,
      name: projectData.name,
      description: projectData.description,
      duration: projectData.duration,
      bpm: projectData.bpm,
      status: projectData.status,
      createdAt: projectData.createdAt,
      updatedAt: projectData.updatedAt
    };
  }

  /**
   * Map uploaded audio files to canonical Track types
   */
  static mapTracks(projectData: ProjectData, uploads: UploadResult[]): Track[] {
    const tracks: Track[] = [];

    // Map Track A if available
    if (projectData.trackAUrl && projectData.trackAName) {
      const upload = uploads.find(u => u.url === projectData.trackAUrl);
      tracks.push({
        id: `track-a-${projectData.id}`,
        projectId: projectData.id,
        name: projectData.trackAName,
        url: projectData.trackAUrl,
        mimeType: upload?.metadata.mimeType || 'audio/mpeg',
        duration: upload?.metadata.duration || projectData.duration,
        analysis: upload?.metadata.analysis ? {
          bpm: upload.metadata.analysis.bpm,
          key: upload.metadata.analysis.key,
          energy: upload.metadata.analysis.energy,
          loudness: upload.metadata.analysis.loudness,
          beatGrid: upload.metadata.analysis.waveformData
        } : undefined
      });
    }

    // Map Track B if available
    if (projectData.trackBUrl && projectData.trackBName) {
      const upload = uploads.find(u => u.url === projectData.trackBUrl);
      tracks.push({
        id: `track-b-${projectData.id}`,
        projectId: projectData.id,
        name: projectData.trackBName,
        url: projectData.trackBUrl,
        mimeType: upload?.metadata.mimeType || 'audio/mpeg',
        duration: upload?.metadata.duration || projectData.duration,
        analysis: upload?.metadata.analysis ? {
          bpm: upload.metadata.analysis.bpm,
          key: upload.metadata.analysis.key,
          energy: upload.metadata.analysis.energy,
          loudness: upload.metadata.analysis.loudness,
          beatGrid: upload.metadata.analysis.waveformData
        } : undefined
      });
    }

    return tracks;
  }

  /**
   * Map track data to timeline clips
   * Each track becomes a clip that plays from start to end
   */
  static mapClips(tracks: Track[]): Clip[] {
    return tracks.map((track, index) => ({
      id: `clip-${track.id}`,
      trackId: track.id,
      projectId: track.projectId,
      startSec: index === 0 ? 0 : (tracks[0]?.duration || 0), // Track A starts at 0, Track B starts after Track A
      offsetSec: 0, // Start from beginning of audio file
      durationSec: track.duration,
      volume: 1.0,
      effects: []
    }));
  }

  /**
   * Map template placements to canonical Transition types
   */
  static mapTransitions(
    projectData: ProjectData,
    templatePlacements: TemplatePlacementData[],
    templates: Map<string, TemplateData>,
    tracks: Track[]
  ): Transition[] {
    const transitions: Transition[] = [];

    templatePlacements.forEach(placement => {
      const template = templates.get(placement.templateId);
      if (!template) return;

      const trackA = tracks.find(t => t.id.includes('track-a'));
      const trackB = tracks.find(t => t.id.includes('track-b'));
      
      if (!trackA || !trackB) return;

      // Create transition from template data
      const transition: Transition = {
        id: placement.id,
        projectId: projectData.id,
        type: this.mapTransitionType(template.category),
        startSec: placement.startTime,
        durationSec: template.duration,
        trackAId: trackA.id,
        trackBId: trackB.id,
        templateId: template.id,
        parameters: this.mapTransitionParameters(template, placement)
      };

      transitions.push(transition);
    });

    return transitions;
  }

  /**
   * Map template category to transition type
   */
  private static mapTransitionType(category: string): Transition['type'] {
    const categoryMap: Record<string, Transition['type']> = {
      'house': 'crossfade',
      'electronic': 'crossfade',
      'trance': 'crossfade',
      'ambient': 'crossfade',
      'hip-hop': 'scratch',
      'techno': 'cut',
      'dubstep': 'drop'
    };

    return categoryMap[category] || 'crossfade';
  }

  /**
   * Map template parameters to transition parameters
   */
  private static mapTransitionParameters(
    template: TemplateData,
    placement: TemplatePlacementData
  ): Transition['parameters'] {
    const templateData = template.templateData || {};
    const overrides = placement.parameterOverrides || {};

    // Base parameters from template
    const baseParams = {
      curve: templateData.curve || 'scurve',
      eqMatch: templateData.eqMatching ?? true,
      keyMatch: templateData.keyMatching ?? false,
    };

    // Generate volume automation from template transitions
    let volumeAutomation: Array<{
      timeSec: number;
      trackAGain: number;
      trackBGain: number;
    }> = [];

    if (templateData.transitions) {
      templateData.transitions.forEach((transition: any) => {
        if (transition.parameters?.volumeAutomation) {
          volumeAutomation = transition.parameters.volumeAutomation.map((point: any) => ({
            timeSec: point.time,
            trackAGain: point.trackA / 100, // Convert percentage to 0-1
            trackBGain: point.trackB / 100
          }));
        }
      });
    }

    // Default volume automation if none provided
    if (volumeAutomation.length === 0) {
      volumeAutomation = [
        { timeSec: 0, trackAGain: 1.0, trackBGain: 0.0 },
        { timeSec: template.duration / 2, trackAGain: 0.5, trackBGain: 0.5 },
        { timeSec: template.duration, trackAGain: 0.0, trackBGain: 1.0 }
      ];
    }

    return {
      ...baseParams,
      ...overrides, // Apply user overrides
      volumeAutomation
    };
  }

  /**
   * Convert complete database state to canonical timeline data
   */
  static mapTimelineData(
    projectData: ProjectData,
    uploads: UploadResult[],
    templatePlacements: TemplatePlacementData[],
    templates: Map<string, TemplateData>
  ): TimelineData {
    const project = this.mapProject(projectData);
    const tracks = this.mapTracks(projectData, uploads);
    const clips = this.mapClips(tracks);
    const transitions = this.mapTransitions(projectData, templatePlacements, templates, tracks);

    return {
      project,
      tracks,
      clips,
      transitions
    };
  }

  /**
   * Calculate timeline boundaries
   */
  static getTimelineBounds(timelineData: TimelineData): {
    startSec: number;
    endSec: number;
    totalDuration: number;
  } {
    let minStart = Infinity;
    let maxEnd = 0;

    // Check clips
    timelineData.clips.forEach(clip => {
      minStart = Math.min(minStart, clip.startSec);
      maxEnd = Math.max(maxEnd, clip.startSec + clip.durationSec);
    });

    // Check transitions
    timelineData.transitions.forEach(transition => {
      minStart = Math.min(minStart, transition.startSec);
      maxEnd = Math.max(maxEnd, transition.startSec + transition.durationSec);
    });

    // Default bounds if no content
    if (!isFinite(minStart)) minStart = 0;
    if (maxEnd === 0) maxEnd = 300; // 5 minutes default

    return {
      startSec: minStart,
      endSec: maxEnd,
      totalDuration: maxEnd - minStart
    };
  }

  /**
   * Find active elements at a given time
   */
  static getActiveElementsAtTime(timelineData: TimelineData, timeSec: number): {
    activeClips: Clip[];
    activeTransitions: Transition[];
  } {
    const activeClips = timelineData.clips.filter(clip => 
      timeSec >= clip.startSec && timeSec < clip.startSec + clip.durationSec
    );

    const activeTransitions = timelineData.transitions.filter(transition =>
      timeSec >= transition.startSec && timeSec < transition.startSec + transition.durationSec
    );

    return { activeClips, activeTransitions };
  }
}