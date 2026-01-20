import { TemplateData } from '../database';

export interface AudioAnalysisData {
  bpm?: number;
  key?: string;
  genre?: string;
  energy?: number;
  danceability?: number;
  valence?: number;
  loudness?: number;
  confidence?: number;
}

export interface TemplateMatchScore {
  templateId: string;
  template: TemplateData;
  overallScore: number;
  bpmScore: number;
  keyScore: number;
  genreScore: number;
  energyScore: number;
  confidence: number;
  reasoning: {
    bpmMatch: string;
    keyMatch: string;
    genreMatch: string;
    energyMatch: string;
    recommendation: string;
  };
}

const CAMELOT_WHEEL: Record<string, string[]> = {
  '1A': ['1A', '1B', '2A', '12A'],
  '1B': ['1B', '1A', '2B', '12B'],
  '2A': ['2A', '2B', '3A', '1A'],
  '2B': ['2B', '2A', '3B', '1B'],
  '3A': ['3A', '3B', '4A', '2A'],
  '3B': ['3B', '3A', '4B', '2B'],
  '4A': ['4A', '4B', '5A', '3A'],
  '4B': ['4B', '4A', '5B', '3B'],
  '5A': ['5A', '5B', '6A', '4A'],
  '5B': ['5B', '5A', '6B', '4B'],
  '6A': ['6A', '6B', '7A', '5A'],
  '6B': ['6B', '6A', '7B', '5B'],
  '7A': ['7A', '7B', '8A', '6A'],
  '7B': ['7B', '7A', '8B', '6B'],
  '8A': ['8A', '8B', '9A', '7A'],
  '8B': ['8B', '8A', '9B', '7B'],
  '9A': ['9A', '9B', '10A', '8A'],
  '9B': ['9B', '9A', '10B', '8B'],
  '10A': ['10A', '10B', '11A', '9A'],
  '10B': ['10B', '10A', '11B', '9B'],
  '11A': ['11A', '11B', '12A', '10A'],
  '11B': ['11B', '11A', '12B', '10B'],
  '12A': ['12A', '12B', '1A', '11A'],
  '12B': ['12B', '12A', '1B', '11B'],
};

const KEY_TO_CAMELOT: Record<string, string> = {
  'C': '8B', 'Cmaj': '8B', 'C major': '8B',
  'Cmin': '5A', 'C minor': '5A',
  'C#': '3B', 'C#maj': '3B', 'C# major': '3B', 'Db': '3B',
  'C#min': '12A', 'C# minor': '12A', 'Dbmin': '12A',
  'D': '10B', 'Dmaj': '10B', 'D major': '10B',
  'Dmin': '7A', 'D minor': '7A',
  'D#': '5B', 'D#maj': '5B', 'D# major': '5B', 'Eb': '5B',
  'D#min': '2A', 'D# minor': '2A', 'Ebmin': '2A',
  'E': '12B', 'Emaj': '12B', 'E major': '12B',
  'Emin': '9A', 'E minor': '9A',
  'F': '7B', 'Fmaj': '7B', 'F major': '7B',
  'Fmin': '4A', 'F minor': '4A',
  'F#': '2B', 'F#maj': '2B', 'F# major': '2B', 'Gb': '2B',
  'F#min': '11A', 'F# minor': '11A', 'Gbmin': '11A',
  'G': '9B', 'Gmaj': '9B', 'G major': '9B',
  'Gmin': '6A', 'G minor': '6A',
  'G#': '4B', 'G#maj': '4B', 'G# major': '4B', 'Ab': '4B',
  'G#min': '1A', 'G# minor': '1A', 'Abmin': '1A',
  'A': '11B', 'Amaj': '11B', 'A major': '11B',
  'Amin': '8A', 'A minor': '8A',
  'A#': '6B', 'A#maj': '6B', 'A# major': '6B', 'Bb': '6B',
  'A#min': '3A', 'A# minor': '3A', 'Bbmin': '3A',
  'B': '1B', 'Bmaj': '1B', 'B major': '1B',
  'Bmin': '10A', 'B minor': '10A',
};

export class TemplateMatcher {
  calculateBPMScore(
    trackBPM: number,
    templateBPMMin?: number,
    templateBPMMax?: number,
    flexibility: number = 0.1
  ): number {
    if (!templateBPMMin || !templateBPMMax) {
      return 50;
    }

    const flexRange = (templateBPMMax - templateBPMMin) * flexibility;
    const minWithFlex = templateBPMMin - flexRange;
    const maxWithFlex = templateBPMMax + flexRange;

    if (trackBPM >= templateBPMMin && trackBPM <= templateBPMMax) {
      return 100;
    }

    if (trackBPM >= minWithFlex && trackBPM <= maxWithFlex) {
      const distance = trackBPM < templateBPMMin
        ? templateBPMMin - trackBPM
        : trackBPM - templateBPMMax;
      const maxDistance = flexRange;
      return Math.max(0, 100 - (distance / maxDistance) * 50);
    }

    const halfBPM = trackBPM / 2;
    const doubleBPM = trackBPM * 2;

    if ((halfBPM >= minWithFlex && halfBPM <= maxWithFlex) ||
        (doubleBPM >= minWithFlex && doubleBPM <= maxWithFlex)) {
      return 70;
    }

    return 0;
  }

  calculateKeyScore(trackKey: string, templateKeys?: string[]): number {
    if (!trackKey || !templateKeys || templateKeys.length === 0) {
      return 50;
    }

    const trackCamelot = KEY_TO_CAMELOT[trackKey];
    if (!trackCamelot) {
      return 50;
    }

    const compatibleKeys = CAMELOT_WHEEL[trackCamelot] || [];

    for (const templateKey of templateKeys) {
      const templateCamelot = KEY_TO_CAMELOT[templateKey];
      if (!templateCamelot) continue;

      if (templateCamelot === trackCamelot) {
        return 100;
      }

      if (compatibleKeys.includes(templateCamelot)) {
        return 85;
      }
    }

    return 30;
  }

  calculateGenreScore(trackGenre: string, templateCategory: string, templateGenreTags?: any): number {
    if (!trackGenre) {
      return 50;
    }

    const normalizedTrackGenre = trackGenre.toLowerCase().trim();
    const normalizedCategory = templateCategory.toLowerCase().trim();

    if (normalizedTrackGenre === normalizedCategory) {
      return 100;
    }

    if (templateGenreTags && typeof templateGenreTags === 'object') {
      const genreWeights = templateGenreTags as Record<string, number>;
      for (const [genre, weight] of Object.entries(genreWeights)) {
        if (normalizedTrackGenre === genre.toLowerCase().trim()) {
          return Math.min(100, 80 + (weight * 20));
        }
      }
    }

    const crossGenreCompatibility: Record<string, string[]> = {
      'house': ['electronic', 'techno', 'progressive'],
      'techno': ['house', 'electronic', 'minimal'],
      'trance': ['progressive', 'electronic', 'uplifting'],
      'dubstep': ['electronic', 'bass', 'drum and bass'],
      'hip-hop': ['rap', 'r&b', 'trap'],
      'electronic': ['house', 'techno', 'trance', 'ambient'],
      'ambient': ['electronic', 'chillout', 'downtempo'],
    };

    const compatibleGenres = crossGenreCompatibility[normalizedTrackGenre] || [];
    if (compatibleGenres.includes(normalizedCategory)) {
      return 60;
    }

    return 20;
  }

  calculateEnergyScore(
    trackEnergy: number,
    templateEnergyMin?: number,
    templateEnergyMax?: number
  ): number {
    if (trackEnergy === undefined || templateEnergyMin === undefined || templateEnergyMax === undefined) {
      return 50;
    }

    if (trackEnergy >= templateEnergyMin && trackEnergy <= templateEnergyMax) {
      return 100;
    }

    const buffer = 0.15;
    const minWithBuffer = Math.max(0, templateEnergyMin - buffer);
    const maxWithBuffer = Math.min(1, templateEnergyMax + buffer);

    if (trackEnergy >= minWithBuffer && trackEnergy <= maxWithBuffer) {
      const distance = trackEnergy < templateEnergyMin
        ? templateEnergyMin - trackEnergy
        : trackEnergy - templateEnergyMax;
      return Math.max(0, 100 - (distance / buffer) * 30);
    }

    return 30;
  }

  matchTemplates(
    trackAAnalysis: AudioAnalysisData,
    trackBAnalysis: AudioAnalysisData,
    templates: TemplateData[]
  ): TemplateMatchScore[] {
    const avgBPM = ((trackAAnalysis.bpm || 0) + (trackBAnalysis.bpm || 0)) / 2;
    const avgEnergy = ((trackAAnalysis.energy || 0) + (trackBAnalysis.energy || 0)) / 2;

    const trackAKey = trackAAnalysis.key;
    const trackBKey = trackBAnalysis.key;

    const matches: TemplateMatchScore[] = templates.map(template => {
      const bpmScore = this.calculateBPMScore(
        avgBPM,
        template.templateData?.bpm_min,
        template.templateData?.bpm_max,
        template.templateData?.bpm_flexibility
      );

      const keyScoreA = trackAKey ? this.calculateKeyScore(trackAKey, template.templateData?.compatible_keys) : 50;
      const keyScoreB = trackBKey ? this.calculateKeyScore(trackBKey, template.templateData?.compatible_keys) : 50;
      const keyScore = (keyScoreA + keyScoreB) / 2;

      const genreScoreA = trackAAnalysis.genre
        ? this.calculateGenreScore(trackAAnalysis.genre, template.category, template.templateData?.genre_tags)
        : 50;
      const genreScoreB = trackBAnalysis.genre
        ? this.calculateGenreScore(trackBAnalysis.genre, template.category, template.templateData?.genre_tags)
        : 50;
      const genreScore = (genreScoreA + genreScoreB) / 2;

      const energyScore = this.calculateEnergyScore(
        avgEnergy,
        template.templateData?.energy_min,
        template.templateData?.energy_max
      );

      const weights = {
        bpm: 0.35,
        key: 0.25,
        genre: 0.25,
        energy: 0.15,
      };

      const overallScore =
        bpmScore * weights.bpm +
        keyScore * weights.key +
        genreScore * weights.genre +
        energyScore * weights.energy;

      const avgConfidence = ((trackAAnalysis.confidence || 0.7) + (trackBAnalysis.confidence || 0.7)) / 2;

      const reasoning = this.generateReasoning(
        bpmScore,
        keyScore,
        genreScore,
        energyScore,
        trackAAnalysis,
        trackBAnalysis,
        template
      );

      return {
        templateId: template.id,
        template,
        overallScore: Math.round(overallScore),
        bpmScore: Math.round(bpmScore),
        keyScore: Math.round(keyScore),
        genreScore: Math.round(genreScore),
        energyScore: Math.round(energyScore),
        confidence: Math.round(avgConfidence * 100) / 100,
        reasoning,
      };
    });

    return matches.sort((a, b) => b.overallScore - a.overallScore);
  }

  private generateReasoning(
    bpmScore: number,
    keyScore: number,
    genreScore: number,
    energyScore: number,
    trackAAnalysis: AudioAnalysisData,
    trackBAnalysis: AudioAnalysisData,
    template: TemplateData
  ): TemplateMatchScore['reasoning'] {
    const bpmMatch = bpmScore >= 90
      ? 'Perfect BPM match'
      : bpmScore >= 70
      ? 'Good BPM compatibility'
      : bpmScore >= 50
      ? 'Moderate BPM match'
      : 'BPM may require adjustment';

    const keyMatch = keyScore >= 90
      ? 'Excellent harmonic compatibility'
      : keyScore >= 70
      ? 'Compatible keys for smooth mixing'
      : keyScore >= 50
      ? 'Keys are mixable with adjustment'
      : 'Key compatibility is limited';

    const genreMatch = genreScore >= 90
      ? 'Perfect genre match'
      : genreScore >= 70
      ? 'Compatible genres'
      : genreScore >= 50
      ? 'Cross-genre mixing possible'
      : 'Genre styles differ significantly';

    const energyMatch = energyScore >= 90
      ? 'Energy levels perfectly aligned'
      : energyScore >= 70
      ? 'Good energy transition'
      : energyScore >= 50
      ? 'Moderate energy compatibility'
      : 'Energy levels require careful blending';

    const overallScore = (bpmScore + keyScore + genreScore + energyScore) / 4;
    let recommendation = '';

    if (overallScore >= 85) {
      recommendation = `Highly recommended! This template is an excellent match for your tracks. ${bpmMatch} and ${keyMatch.toLowerCase()}.`;
    } else if (overallScore >= 70) {
      recommendation = `Good choice! This template works well with your tracks. ${bpmMatch} with ${genreMatch.toLowerCase()}.`;
    } else if (overallScore >= 50) {
      recommendation = `Workable option. This template can be used, though some adjustments may be needed. ${bpmMatch}.`;
    } else {
      recommendation = `This template may not be the best fit. Consider templates with better BPM and genre compatibility.`;
    }

    return {
      bpmMatch,
      keyMatch,
      genreMatch,
      energyMatch,
      recommendation,
    };
  }

  getBestMatch(matches: TemplateMatchScore[]): TemplateMatchScore | null {
    if (matches.length === 0) return null;
    return matches[0];
  }

  getTopMatches(matches: TemplateMatchScore[], count: number = 3): TemplateMatchScore[] {
    return matches.slice(0, Math.min(count, matches.length));
  }
}

export const templateMatcher = new TemplateMatcher();
