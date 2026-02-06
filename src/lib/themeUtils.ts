export interface DeckColors {
  from: string;
  to: string;
}

export interface MixerTheme {
  deckAColors: DeckColors;
  deckBColors: DeckColors;
  presetName?: string;
}

export interface PresetTheme extends MixerTheme {
  id: string;
  name: string;
  description: string;
}

export const getPresetThemes = (): PresetTheme[] => {
  return [
    {
      id: 'cool-blues',
      name: 'Cool Blues',
      description: 'Classic DJ setup with cyan and blue tones',
      deckAColors: { from: '#06b6d4', to: '#3b82f6' },
      deckBColors: { from: '#3b82f6', to: '#6366f1' },
      presetName: 'cool-blues'
    },
    {
      id: 'warm-sunset',
      name: 'Warm Sunset',
      description: 'Energetic orange and red gradients',
      deckAColors: { from: '#f97316', to: '#ef4444' },
      deckBColors: { from: '#ef4444', to: '#ec4899' },
      presetName: 'warm-sunset'
    },
    {
      id: 'ocean-breeze',
      name: 'Ocean Breeze',
      description: 'Refreshing teal and cyan waves',
      deckAColors: { from: '#14b8a6', to: '#06b6d4' },
      deckBColors: { from: '#06b6d4', to: '#0ea5e9' },
      presetName: 'ocean-breeze'
    },
    {
      id: 'forest-green',
      name: 'Forest Green',
      description: 'Natural emerald and teal shades',
      deckAColors: { from: '#10b981', to: '#059669' },
      deckBColors: { from: '#059669', to: '#14b8a6' },
      presetName: 'forest-green'
    },
    {
      id: 'electric-purple',
      name: 'Electric Purple',
      description: 'Vibrant purple and magenta energy',
      deckAColors: { from: '#a855f7', to: '#9333ea' },
      deckBColors: { from: '#9333ea', to: '#d946ef' },
      presetName: 'electric-purple'
    },
    {
      id: 'monochrome',
      name: 'Monochrome',
      description: 'Professional slate and gray tones',
      deckAColors: { from: '#64748b', to: '#475569' },
      deckBColors: { from: '#475569', to: '#71717a' },
      presetName: 'monochrome'
    }
  ];
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
