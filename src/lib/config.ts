export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL as string,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  },
  functions: {
    baseUrl: `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1`,
  },
  storage: {
    audioBucket: 'audio-uploads',
    maxFileSizeBytes: 200 * 1024 * 1024,
    allowedMimeTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/flac',
      'audio/mp4',
      'audio/aac',
      'audio/x-m4a',
      'audio/ogg',
      'audio/x-aiff',
      'audio/aiff',
    ],
  },
} as const;
