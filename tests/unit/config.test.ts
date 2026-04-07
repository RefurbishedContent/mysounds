import { describe, it, expect } from 'vitest';
import { config } from '../../src/lib/config';

describe('config', () => {
  it('exports supabase url and key', () => {
    expect(config.supabase).toHaveProperty('url');
    expect(config.supabase).toHaveProperty('anonKey');
  });

  it('functions base url is derived from supabase url', () => {
    expect(config.functions.baseUrl).toContain('/functions/v1');
  });

  it('storage bucket is audio-uploads', () => {
    expect(config.storage.audioBucket).toBe('audio-uploads');
  });

  it('max file size is 200MB', () => {
    expect(config.storage.maxFileSizeBytes).toBe(200 * 1024 * 1024);
  });

  it('allowed mime types include OGG and AIFF', () => {
    expect(config.storage.allowedMimeTypes).toContain('audio/ogg');
    expect(config.storage.allowedMimeTypes).toContain('audio/x-aiff');
    expect(config.storage.allowedMimeTypes).toContain('audio/aiff');
  });

  it('allowed mime types include all original formats', () => {
    expect(config.storage.allowedMimeTypes).toContain('audio/mpeg');
    expect(config.storage.allowedMimeTypes).toContain('audio/wav');
    expect(config.storage.allowedMimeTypes).toContain('audio/flac');
    expect(config.storage.allowedMimeTypes).toContain('audio/aac');
  });
});
