// Core Domain Models

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'premium';
  createdAt?: string;
  updatedAt?: string;
  preferences?: {
    defaultBpm?: number;
    preferredGenres?: string[];
    autoSave?: boolean;
    qualityPreset?: 'draft' | 'standard' | 'high' | 'lossless';
  };
}

export interface Upload {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  createdAt: string;
  updatedAt: string;
  // Audio analysis data
  analysis?: {
    duration: number;
    bpm?: number;
    key?: string;
    energy?: number;
    danceability?: number;
    valence?: number;
    loudness?: number;
    waveformData?: number[];
    spectrogramUrl?: string;
  };
  metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
    year?: number;
  };
}

export interface Transition {
  id: string;
  type: 'crossfade' | 'cut' | 'scratch' | 'echo' | 'filter' | 'reverse' | 'stutter' | 'drop';
  startTime: number; // seconds from start of mix
  duration: number; // transition duration in seconds
  parameters: {
    // Crossfade parameters
    curve?: 'linear' | 'exponential' | 'logarithmic' | 'scurve';
    eqMatch?: boolean;
    keyMatch?: boolean;
    
    // Filter parameters
    filterType?: 'lowpass' | 'highpass' | 'bandpass';
    cutoffFreq?: number;
    resonance?: number;
    
    // Echo/Delay parameters
    delayTime?: number;
    feedback?: number;
    wetLevel?: number;
    
    // Scratch parameters
    scratchPattern?: 'baby' | 'forward' | 'backward' | 'chirp' | 'crab';
    scratchSpeed?: number;
    
    // Volume automation
    volumeAutomation?: Array<{
      time: number;
      trackA: number;
      trackB: number;
    }>;
  };
}

export interface TemplatePlacement {
  id: string;
  templateId: string;
  projectId: string;
  startTime: number; // when the template starts in the timeline
  trackARegion: {
    start: number; // seconds into Track A
    end: number;
  };
  trackBRegion: {
    start: number; // seconds into Track B
    end: number;
  };
  parameterOverrides?: {
    [key: string]: any; // Override any template parameter
  };
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'electronic' | 'hip-hop' | 'house' | 'techno' | 'trance' | 'dubstep' | 'ambient' | 'other';
  thumbnail: string;
  duration: number; // template duration in seconds
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  popular: boolean;
  premium: boolean;
  author: string;
  downloads: number;
  rating: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  
  // Template configuration
  parameterSchema: {
    [key: string]: {
      type: 'number' | 'boolean' | 'string' | 'select';
      label: string;
      description?: string;
      default: any;
      min?: number;
      max?: number;
      step?: number;
      options?: string[];
    };
  };
  
  // Transition definitions
  transitions: Transition[];
  
  // Template metadata
  requirements?: {
    minDuration?: number;
    maxDuration?: number;
    bpmRange?: [number, number];
    keyCompatibility?: boolean;
    genreRecommendations?: string[];
  };
  
  // Preview data
  previewUrl?: string;
  demoTrackA?: string;
  demoTrackB?: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: 'draft' | 'processing' | 'completed' | 'error';
  createdAt: string;
  updatedAt: string;
  
  // Timeline configuration
  timeline: {
    duration: number; // total project duration
    bpm: number;
    key?: string;
    trackA: {
      uploadId?: string;
      name?: string;
      url?: string;
      startOffset: number; // where to start playing from the track
      volume: number; // 0-100
      effects?: Array<{
        type: string;
        parameters: any;
        enabled: boolean;
      }>;
    };
    trackB: {
      uploadId?: string;
      name?: string;
      url?: string;
      startOffset: number;
      volume: number;
      effects?: Array<{
        type: string;
        parameters: any;
        enabled: boolean;
      }>;
    };
  };
  
  // Template placements
  templatePlacements: TemplatePlacement[];
  
  // Render configuration
  renderConfig: {
    format: 'mp3' | 'wav' | 'flac';
    quality: 'draft' | 'standard' | 'high' | 'lossless';
    bitrate?: number;
    sampleRate?: number;
    fadeIn?: number;
    fadeOut?: number;
    normalize?: boolean;
    limiter?: boolean;
  };
  
  // Output files
  outputs?: Array<{
    id: string;
    format: string;
    quality: string;
    url: string;
    size: number;
    createdAt: string;
  }>;
  
  // Metadata
  thumbnail?: string;
  tags?: string[];
  isPublic?: boolean;
  collaborators?: string[]; // user IDs
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}

// Sample Template Library
export const SAMPLE_TEMPLATES: Template[] = [
  {
    id: 'club-crossfade-pro',
    name: 'Club Crossfade Pro',
    description: 'Professional club-style crossfade with EQ matching and harmonic mixing. Perfect for house and electronic music with smooth energy transitions.',
    category: 'house',
    thumbnail: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400',
    duration: 32,
    difficulty: 'intermediate',
    popular: true,
    premium: false,
    author: 'DJ ProMix',
    downloads: 15420,
    rating: 4.8,
    tags: ['crossfade', 'club', 'house', 'electronic', 'eq-match'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z',
    parameterSchema: {
      crossfadeDuration: {
        type: 'number',
        label: 'Crossfade Duration',
        description: 'Length of the crossfade in seconds',
        default: 16,
        min: 8,
        max: 32,
        step: 2
      },
      eqMatching: {
        type: 'boolean',
        label: 'EQ Matching',
        description: 'Automatically match EQ between tracks',
        default: true
      },
      curve: {
        type: 'select',
        label: 'Crossfade Curve',
        description: 'Shape of the crossfade transition',
        default: 'scurve',
        options: ['linear', 'exponential', 'logarithmic', 'scurve']
      }
    },
    transitions: [
      {
        id: 'main-crossfade',
        type: 'crossfade',
        startTime: 8,
        duration: 16,
        parameters: {
          curve: 'scurve',
          eqMatch: true,
          keyMatch: false,
          volumeAutomation: [
            { time: 0, trackA: 100, trackB: 0 },
            { time: 8, trackA: 100, trackB: 0 },
            { time: 16, trackA: 50, trackB: 50 },
            { time: 24, trackA: 0, trackB: 100 },
            { time: 32, trackA: 0, trackB: 100 }
          ]
        }
      }
    ],
    requirements: {
      minDuration: 60,
      bpmRange: [120, 140],
      genreRecommendations: ['house', 'electronic', 'progressive']
    }
  },
  {
    id: 'hip-hop-scratch-master',
    name: 'Hip-Hop Scratch Master',
    description: 'Classic turntable scratching techniques with modern precision. Features baby scratch, chirp, and crab patterns for authentic hip-hop mixing.',
    category: 'hip-hop',
    thumbnail: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400',
    duration: 24,
    difficulty: 'advanced',
    popular: false,
    premium: true,
    author: 'Scratch Master Supreme',
    downloads: 8930,
    rating: 4.9,
    tags: ['scratch', 'hip-hop', 'turntable', 'advanced', 'authentic'],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-20T15:30:00Z',
    parameterSchema: {
      scratchPattern: {
        type: 'select',
        label: 'Scratch Pattern',
        description: 'Type of scratch technique to use',
        default: 'baby',
        options: ['baby', 'forward', 'backward', 'chirp', 'crab']
      },
      scratchSpeed: {
        type: 'number',
        label: 'Scratch Speed',
        description: 'Speed of scratch movements (BPM)',
        default: 120,
        min: 80,
        max: 160,
        step: 10
      },
      intensity: {
        type: 'number',
        label: 'Scratch Intensity',
        description: 'How aggressive the scratching is',
        default: 0.7,
        min: 0.1,
        max: 1.0,
        step: 0.1
      }
    },
    transitions: [
      {
        id: 'intro-scratch',
        type: 'scratch',
        startTime: 0,
        duration: 8,
        parameters: {
          scratchPattern: 'baby',
          scratchSpeed: 120,
          volumeAutomation: [
            { time: 0, trackA: 100, trackB: 0 },
            { time: 8, trackA: 80, trackB: 20 }
          ]
        }
      },
      {
        id: 'main-scratch',
        type: 'scratch',
        startTime: 8,
        duration: 12,
        parameters: {
          scratchPattern: 'chirp',
          scratchSpeed: 140,
          volumeAutomation: [
            { time: 8, trackA: 80, trackB: 20 },
            { time: 14, trackA: 50, trackB: 50 },
            { time: 20, trackA: 20, trackB: 80 }
          ]
        }
      },
      {
        id: 'outro-cut',
        type: 'cut',
        startTime: 20,
        duration: 4,
        parameters: {
          volumeAutomation: [
            { time: 20, trackA: 20, trackB: 80 },
            { time: 24, trackA: 0, trackB: 100 }
          ]
        }
      }
    ],
    requirements: {
      minDuration: 45,
      bpmRange: [80, 160],
      genreRecommendations: ['hip-hop', 'rap', 'breakbeat']
    }
  },
  {
    id: 'electronic-drop-builder',
    name: 'Electronic Drop Builder',
    description: 'Build massive electronic drops with tension, filter sweeps, and explosive releases. Perfect for EDM, dubstep, and festival tracks.',
    category: 'electronic',
    thumbnail: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400',
    duration: 48,
    difficulty: 'intermediate',
    popular: true,
    premium: false,
    author: 'ElectroBeats Producer',
    downloads: 12750,
    rating: 4.7,
    tags: ['drop', 'buildup', 'electronic', 'edm', 'festival'],
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-25T09:15:00Z',
    parameterSchema: {
      buildupDuration: {
        type: 'number',
        label: 'Buildup Duration',
        description: 'Length of tension buildup before drop',
        default: 16,
        min: 8,
        max: 24,
        step: 2
      },
      filterSweep: {
        type: 'boolean',
        label: 'Filter Sweep',
        description: 'Add high-pass filter sweep during buildup',
        default: true
      },
      dropIntensity: {
        type: 'number',
        label: 'Drop Intensity',
        description: 'How explosive the drop is',
        default: 0.9,
        min: 0.5,
        max: 1.0,
        step: 0.1
      }
    },
    transitions: [
      {
        id: 'buildup-phase',
        type: 'filter',
        startTime: 0,
        duration: 16,
        parameters: {
          filterType: 'highpass',
          cutoffFreq: 200,
          resonance: 0.8,
          volumeAutomation: [
            { time: 0, trackA: 100, trackB: 0 },
            { time: 8, trackA: 90, trackB: 10 },
            { time: 14, trackA: 70, trackB: 30 },
            { time: 16, trackA: 0, trackB: 0 }
          ]
        }
      },
      {
        id: 'drop-moment',
        type: 'cut',
        startTime: 16,
        duration: 2,
        parameters: {
          volumeAutomation: [
            { time: 16, trackA: 0, trackB: 0 },
            { time: 18, trackA: 0, trackB: 100 }
          ]
        }
      },
      {
        id: 'post-drop',
        type: 'crossfade',
        startTime: 18,
        duration: 30,
        parameters: {
          curve: 'linear',
          volumeAutomation: [
            { time: 18, trackA: 0, trackB: 100 },
            { time: 48, trackA: 0, trackB: 100 }
          ]
        }
      }
    ],
    requirements: {
      minDuration: 90,
      bpmRange: [128, 150],
      genreRecommendations: ['electronic', 'edm', 'dubstep', 'progressive']
    }
  },
  {
    id: 'techno-industrial-cut',
    name: 'Techno Industrial Cut',
    description: 'Hard, precise cuts with industrial edge. Features aggressive transitions, stutter effects, and mechanical precision for underground techno.',
    category: 'techno',
    thumbnail: 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=400',
    duration: 20,
    difficulty: 'advanced',
    popular: false,
    premium: true,
    author: 'Underground Collective',
    downloads: 6840,
    rating: 4.6,
    tags: ['techno', 'industrial', 'hard', 'underground', 'stutter'],
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-01-28T18:45:00Z',
    parameterSchema: {
      cutPrecision: {
        type: 'number',
        label: 'Cut Precision',
        description: 'How sharp and precise the cuts are',
        default: 0.95,
        min: 0.7,
        max: 1.0,
        step: 0.05
      },
      stutterRate: {
        type: 'select',
        label: 'Stutter Rate',
        description: 'Rate of stutter effects',
        default: '1/16',
        options: ['1/8', '1/16', '1/32', '1/64']
      },
      industrialFX: {
        type: 'boolean',
        label: 'Industrial FX',
        description: 'Add mechanical sound effects',
        default: true
      }
    },
    transitions: [
      {
        id: 'stutter-intro',
        type: 'stutter',
        startTime: 0,
        duration: 4,
        parameters: {
          volumeAutomation: [
            { time: 0, trackA: 100, trackB: 0 },
            { time: 4, trackA: 100, trackB: 0 }
          ]
        }
      },
      {
        id: 'hard-cut',
        type: 'cut',
        startTime: 4,
        duration: 0.1,
        parameters: {
          volumeAutomation: [
            { time: 4, trackA: 100, trackB: 0 },
            { time: 4.1, trackA: 0, trackB: 100 }
          ]
        }
      },
      {
        id: 'industrial-phase',
        type: 'filter',
        startTime: 4.1,
        duration: 15.9,
        parameters: {
          filterType: 'bandpass',
          cutoffFreq: 1000,
          resonance: 0.9,
          volumeAutomation: [
            { time: 4.1, trackA: 0, trackB: 100 },
            { time: 20, trackA: 0, trackB: 100 }
          ]
        }
      }
    ],
    requirements: {
      minDuration: 30,
      bpmRange: [130, 150],
      genreRecommendations: ['techno', 'industrial', 'minimal']
    }
  },
  {
    id: 'trance-euphoric-journey',
    name: 'Trance Euphoric Journey',
    description: 'Emotional trance mixing with long builds, euphoric breakdowns, and uplifting progressions. Perfect for progressive and uplifting trance.',
    category: 'trance',
    thumbnail: 'https://images.pexels.com/photos/1677710/pexels-photo-1677710.jpeg?auto=compress&cs=tinysrgb&w=400',
    duration: 90,
    difficulty: 'intermediate',
    popular: true,
    premium: true,
    author: 'Euphoric Sounds',
    downloads: 9650,
    rating: 4.9,
    tags: ['trance', 'euphoric', 'progressive', 'uplifting', 'emotional'],
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-02-01T14:20:00Z',
    parameterSchema: {
      buildupLength: {
        type: 'number',
        label: 'Buildup Length',
        description: 'Duration of emotional buildup',
        default: 32,
        min: 16,
        max: 48,
        step: 4
      },
      breakdownIntensity: {
        type: 'number',
        label: 'Breakdown Intensity',
        description: 'How dramatic the breakdown is',
        default: 0.8,
        min: 0.3,
        max: 1.0,
        step: 0.1
      },
      keyMatching: {
        type: 'boolean',
        label: 'Harmonic Mixing',
        description: 'Match keys for harmonic transitions',
        default: true
      }
    },
    transitions: [
      {
        id: 'intro-blend',
        type: 'crossfade',
        startTime: 0,
        duration: 16,
        parameters: {
          curve: 'exponential',
          keyMatch: true,
          volumeAutomation: [
            { time: 0, trackA: 100, trackB: 0 },
            { time: 16, trackA: 80, trackB: 20 }
          ]
        }
      },
      {
        id: 'emotional-buildup',
        type: 'filter',
        startTime: 16,
        duration: 32,
        parameters: {
          filterType: 'highpass',
          cutoffFreq: 100,
          resonance: 0.6,
          volumeAutomation: [
            { time: 16, trackA: 80, trackB: 20 },
            { time: 32, trackA: 60, trackB: 40 },
            { time: 48, trackA: 20, trackB: 80 }
          ]
        }
      },
      {
        id: 'euphoric-release',
        type: 'crossfade',
        startTime: 48,
        duration: 42,
        parameters: {
          curve: 'scurve',
          keyMatch: true,
          volumeAutomation: [
            { time: 48, trackA: 20, trackB: 80 },
            { time: 70, trackA: 5, trackB: 95 },
            { time: 90, trackA: 0, trackB: 100 }
          ]
        }
      }
    ],
    requirements: {
      minDuration: 120,
      bpmRange: [128, 138],
      keyCompatibility: true,
      genreRecommendations: ['trance', 'progressive', 'uplifting']
    }
  },
  {
    id: 'ambient-flow-meditation',
    name: 'Ambient Flow Meditation',
    description: 'Gentle, seamless transitions for ambient and downtempo music. Creates flowing soundscapes with natural evolution and peaceful progressions.',
    category: 'ambient',
    thumbnail: 'https://images.pexels.com/photos/1389429/pexels-photo-1389429.jpeg?auto=compress&cs=tinysrgb&w=400',
    duration: 120,
    difficulty: 'beginner',
    popular: false,
    premium: false,
    author: 'Peaceful Progressions',
    downloads: 4320,
    rating: 4.5,
    tags: ['ambient', 'chill', 'meditation', 'peaceful', 'flow'],
    createdAt: '2024-01-06T00:00:00Z',
    updatedAt: '2024-02-05T11:30:00Z',
    parameterSchema: {
      flowDuration: {
        type: 'number',
        label: 'Flow Duration',
        description: 'Length of the gentle transition',
        default: 60,
        min: 30,
        max: 120,
        step: 10
      },
      atmosphericBlend: {
        type: 'boolean',
        label: 'Atmospheric Blend',
        description: 'Add atmospheric reverb during transition',
        default: true
      },
      naturalEvolution: {
        type: 'number',
        label: 'Natural Evolution',
        description: 'How organic the transition feels',
        default: 0.8,
        min: 0.3,
        max: 1.0,
        step: 0.1
      }
    },
    transitions: [
      {
        id: 'gentle-introduction',
        type: 'crossfade',
        startTime: 0,
        duration: 30,
        parameters: {
          curve: 'logarithmic',
          volumeAutomation: [
            { time: 0, trackA: 100, trackB: 0 },
            { time: 30, trackA: 90, trackB: 10 }
          ]
        }
      },
      {
        id: 'atmospheric-blend',
        type: 'crossfade',
        startTime: 30,
        duration: 60,
        parameters: {
          curve: 'linear',
          volumeAutomation: [
            { time: 30, trackA: 90, trackB: 10 },
            { time: 60, trackA: 50, trackB: 50 },
            { time: 90, trackA: 10, trackB: 90 }
          ]
        }
      },
      {
        id: 'peaceful-resolution',
        type: 'crossfade',
        startTime: 90,
        duration: 30,
        parameters: {
          curve: 'exponential',
          volumeAutomation: [
            { time: 90, trackA: 10, trackB: 90 },
            { time: 120, trackA: 0, trackB: 100 }
          ]
        }
      }
    ],
    requirements: {
      minDuration: 180,
      bpmRange: [60, 100],
      genreRecommendations: ['ambient', 'chillout', 'downtempo', 'meditation']
    }
  }
];