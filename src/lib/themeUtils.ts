export interface DeckColors {
  from: string;
  to: string;
  primary?: string;
  glow?: string;
}

export interface MixerTheme {
  deckAColors: DeckColors;
  deckBColors: DeckColors;
  presetName?: string;
  isNightclub?: boolean;
  backgroundEffect?: 'none' | 'laser' | 'pulse' | 'scan';
  glowIntensity?: 'low' | 'medium' | 'high';
}

export interface PresetTheme extends MixerTheme {
  id: string;
  name: string;
  description: string;
  category?: 'classic' | 'nightclub';
}

export const getPresetThemes = (): PresetTheme[] => {
  return [
    {
      id: 'cool-blues',
      name: 'Cool Blues',
      description: 'Classic DJ setup with cyan and blue tones',
      category: 'classic',
      deckAColors: { from: '#06b6d4', to: '#3b82f6', primary: '#06b6d4', glow: '#06b6d4' },
      deckBColors: { from: '#3b82f6', to: '#6366f1', primary: '#3b82f6', glow: '#3b82f6' },
      presetName: 'cool-blues'
    },
    {
      id: 'warm-sunset',
      name: 'Warm Sunset',
      description: 'Energetic orange and red gradients',
      category: 'classic',
      deckAColors: { from: '#f97316', to: '#ef4444', primary: '#f97316', glow: '#f97316' },
      deckBColors: { from: '#ef4444', to: '#ec4899', primary: '#ef4444', glow: '#ef4444' },
      presetName: 'warm-sunset'
    },
    {
      id: 'ocean-breeze',
      name: 'Ocean Breeze',
      description: 'Refreshing teal and cyan waves',
      category: 'classic',
      deckAColors: { from: '#14b8a6', to: '#06b6d4', primary: '#14b8a6', glow: '#14b8a6' },
      deckBColors: { from: '#06b6d4', to: '#0ea5e9', primary: '#06b6d4', glow: '#06b6d4' },
      presetName: 'ocean-breeze'
    },
    {
      id: 'forest-green',
      name: 'Forest Green',
      description: 'Natural emerald and teal shades',
      category: 'classic',
      deckAColors: { from: '#10b981', to: '#059669', primary: '#10b981', glow: '#10b981' },
      deckBColors: { from: '#059669', to: '#14b8a6', primary: '#059669', glow: '#059669' },
      presetName: 'forest-green'
    },
    {
      id: 'electric-purple',
      name: 'Electric Purple',
      description: 'Vibrant purple and magenta energy',
      category: 'classic',
      deckAColors: { from: '#a855f7', to: '#9333ea', primary: '#a855f7', glow: '#a855f7' },
      deckBColors: { from: '#9333ea', to: '#d946ef', primary: '#9333ea', glow: '#9333ea' },
      presetName: 'electric-purple'
    },
    {
      id: 'monochrome',
      name: 'Monochrome',
      description: 'Professional slate and gray tones',
      category: 'classic',
      deckAColors: { from: '#64748b', to: '#475569', primary: '#64748b', glow: '#64748b' },
      deckBColors: { from: '#475569', to: '#71717a', primary: '#475569', glow: '#475569' },
      presetName: 'monochrome'
    },
    {
      id: 'laser-pink',
      name: 'Laser Pink',
      description: 'Hot pink neon with magenta glow',
      category: 'nightclub',
      isNightclub: true,
      backgroundEffect: 'laser',
      glowIntensity: 'high',
      deckAColors: { from: '#ff1493', to: '#ff69b4', primary: '#ff1493', glow: '#ff1493' },
      deckBColors: { from: '#ff69b4', to: '#ff00ff', primary: '#ff69b4', glow: '#ff00ff' },
      presetName: 'laser-pink'
    },
    {
      id: 'neon-blue',
      name: 'Neon Blue',
      description: 'Electric blue with cyan laser effects',
      category: 'nightclub',
      isNightclub: true,
      backgroundEffect: 'scan',
      glowIntensity: 'high',
      deckAColors: { from: '#00d4ff', to: '#0080ff', primary: '#00d4ff', glow: '#00d4ff' },
      deckBColors: { from: '#0080ff', to: '#00ffff', primary: '#0080ff', glow: '#00ffff' },
      presetName: 'neon-blue'
    },
    {
      id: 'club-red',
      name: 'Club Red',
      description: 'Deep red with orange fire glow',
      category: 'nightclub',
      isNightclub: true,
      backgroundEffect: 'pulse',
      glowIntensity: 'high',
      deckAColors: { from: '#ff0000', to: '#ff4500', primary: '#ff0000', glow: '#ff0000' },
      deckBColors: { from: '#ff4500', to: '#ff6600', primary: '#ff4500', glow: '#ff6600' },
      presetName: 'club-red'
    },
    {
      id: 'uv-glow',
      name: 'UV Glow',
      description: 'Ultraviolet neon purple effect',
      category: 'nightclub',
      isNightclub: true,
      backgroundEffect: 'laser',
      glowIntensity: 'high',
      deckAColors: { from: '#8b00ff', to: '#9400d3', primary: '#8b00ff', glow: '#8b00ff' },
      deckBColors: { from: '#9400d3', to: '#ba55d3', primary: '#9400d3', glow: '#ba55d3' },
      presetName: 'uv-glow'
    },
    {
      id: 'lime-laser',
      name: 'Lime Laser',
      description: 'Bright green laser show effect',
      category: 'nightclub',
      isNightclub: true,
      backgroundEffect: 'scan',
      glowIntensity: 'high',
      deckAColors: { from: '#00ff00', to: '#32cd32', primary: '#00ff00', glow: '#00ff00' },
      deckBColors: { from: '#32cd32', to: '#7fff00', primary: '#32cd32', glow: '#7fff00' },
      presetName: 'lime-laser'
    }
  ];
};

export const getNightclubThemes = (): PresetTheme[] => {
  return getPresetThemes().filter(theme => theme.category === 'nightclub');
};

export const getClassicThemes = (): PresetTheme[] => {
  return getPresetThemes().filter(theme => theme.category === 'classic');
};

export const validateHexColor = (color: string): boolean => {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
};

export const getColorBrightness = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
};

export const validateThemeColors = (theme: MixerTheme): { valid: boolean; error?: string } => {
  const colors = [
    theme.deckAColors.from,
    theme.deckAColors.to,
    theme.deckBColors.from,
    theme.deckBColors.to
  ];

  for (const color of colors) {
    if (!validateHexColor(color)) {
      return { valid: false, error: `Invalid color format: ${color}` };
    }
  }

  const deckABrightness = (getColorBrightness(theme.deckAColors.from) + getColorBrightness(theme.deckAColors.to)) / 2;
  const deckBBrightness = (getColorBrightness(theme.deckBColors.from) + getColorBrightness(theme.deckBColors.to)) / 2;

  if (Math.abs(deckABrightness - deckBBrightness) < 10) {
    return {
      valid: false,
      error: 'Deck colors are too similar. Choose colors with more contrast for better visibility.'
    };
  }

  return { valid: true };
};

export const applyThemeToGradient = (colors: DeckColors): string => {
  return `linear-gradient(to right, ${colors.from}, ${colors.to})`;
};

export const parseThemeFromMetadata = (metadata: any): MixerTheme | null => {
  if (!metadata?.theme) return null;

  const theme = metadata.theme;
  if (!theme.deckA || !theme.deckB) return null;

  return {
    deckAColors: theme.deckA,
    deckBColors: theme.deckB,
    presetName: theme.presetName
  };
};

export const formatThemeForStorage = (theme: MixerTheme): any => {
  return {
    theme: {
      deckA: theme.deckAColors,
      deckB: theme.deckBColors,
      presetName: theme.presetName
    }
  };
};

export const getDefaultTheme = (): MixerTheme => {
  return {
    deckAColors: { from: '#06b6d4', to: '#3b82f6' },
    deckBColors: { from: '#3b82f6', to: '#6366f1' },
    presetName: 'cool-blues'
  };
};
