/*
  # Add "Tester 1" Template
  
  1. Changes
    - Insert new template record into templates table
    - Template Name: "Tester 1"
    - Category: Electronic
    - Duration: 12 seconds (Medium)
    - Difficulty: Beginner
    - Audio URL: Stored in template_data jsonb field
  
  2. Template Details
    - Author: System
    - Initial downloads: 0
    - Initial rating: 0
    - Not marked as popular or premium
    - Includes audio preview URL in template_data
    - Appropriate BPM range for electronic music
    - Energy levels set for electronic genre
*/

INSERT INTO templates (
  name,
  description,
  category,
  duration,
  difficulty,
  author,
  thumbnail_url,
  is_popular,
  is_premium,
  downloads,
  rating,
  usage_count,
  bpm_min,
  bpm_max,
  bpm_flexibility,
  energy_min,
  energy_max,
  genre_tags,
  mood_tags,
  transition_style,
  template_data
) VALUES (
  'Tester 1',
  'A beginner-friendly electronic template featuring smooth transitions and medium duration. Perfect for learning the basics of electronic music mixing.',
  'electronic',
  12,
  'beginner',
  'System',
  'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg',
  false,
  false,
  0,
  0,
  0,
  120,
  130,
  0.1,
  0.6,
  0.8,
  '{"electronic": 1.0, "house": 0.7, "techno": 0.5}'::jsonb,
  ARRAY['energetic', 'uplifting', 'modern'],
  'crossfade',
  '{
    "previewUrl": "https://yuotfcbbzrsdpxohoiks.supabase.co/storage/v1/object/public/template-audio/Tester%201.mp3",
    "audioFormat": "mp3",
    "transitionType": "crossfade",
    "fadeInDuration": 2,
    "fadeOutDuration": 2,
    "crossfadeDuration": 4,
    "description": "Medium-length electronic template with smooth crossfade transitions"
  }'::jsonb
)
ON CONFLICT DO NOTHING;