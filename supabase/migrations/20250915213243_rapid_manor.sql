/*
  # Seed sample templates

  1. Sample Data
    - Insert sample templates for different categories and difficulties
    - Include popular and premium templates
    - Use realistic data that matches our UI

  2. Notes
    - This provides initial content for the template gallery
    - Templates include various genres and difficulty levels
    - Some templates are marked as popular or premium for testing
*/

INSERT INTO templates (
  name,
  description,
  category,
  thumbnail_url,
  duration,
  difficulty,
  is_popular,
  is_premium,
  author,
  downloads,
  rating,
  template_data
) VALUES
  (
    'Club Crossfade',
    'Smooth transitions perfect for dance floors with professional EQ matching',
    'house',
    'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400',
    30,
    'beginner',
    true,
    false,
    'DJ ProMix',
    15420,
    4.8,
    '{"transition_type": "crossfade", "eq_matching": true, "beat_sync": true}'
  ),
  (
    'Hip-Hop Scratch',
    'Classic scratch techniques with modern flair and beat matching',
    'hip-hop',
    'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400',
    45,
    'advanced',
    false,
    true,
    'Scratch Master',
    8930,
    4.9,
    '{"scratch_patterns": ["baby_scratch", "forward_scratch"], "beat_juggling": true}'
  ),
  (
    'Electronic Drop',
    'Build-ups and drops for electronic music with perfect timing',
    'electronic',
    'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400',
    60,
    'intermediate',
    true,
    false,
    'ElectroBeats',
    12750,
    4.7,
    '{"buildup_duration": 16, "drop_style": "hard", "filter_sweeps": true}'
  ),
  (
    'Techno Transition',
    'Industrial techno mixing with heavy bass and precise cuts',
    'techno',
    'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=400',
    40,
    'intermediate',
    false,
    true,
    'TechnoMaster',
    6840,
    4.6,
    '{"cut_style": "hard", "bass_emphasis": true, "industrial_fx": true}'
  ),
  (
    'Trance Journey',
    'Euphoric trance mixing with emotional build-ups and releases',
    'trance',
    'https://images.pexels.com/photos/1677710/pexels-photo-1677710.jpeg?auto=compress&cs=tinysrgb&w=400',
    90,
    'advanced',
    true,
    true,
    'TranceVibes',
    9650,
    4.9,
    '{"emotional_curve": "euphoric", "breakdown_length": 32, "uplifting": true}'
  ),
  (
    'Ambient Flow',
    'Gentle ambient transitions for chill and downtempo music',
    'ambient',
    'https://images.pexels.com/photos/1389429/pexels-photo-1389429.jpeg?auto=compress&cs=tinysrgb&w=400',
    120,
    'beginner',
    false,
    false,
    'ChillMaster',
    4320,
    4.5,
    '{"fade_type": "gentle", "reverb_tails": true, "atmospheric": true}'
  ),
  (
    'Dubstep Wobble',
    'Heavy dubstep drops with signature wobble bass transitions',
    'dubstep',
    'https://images.pexels.com/photos/1644888/pexels-photo-1644888.jpeg?auto=compress&cs=tinysrgb&w=400',
    35,
    'advanced',
    true,
    false,
    'BassDropper',
    11200,
    4.6,
    '{"wobble_intensity": "heavy", "drop_timing": "half_time", "sub_bass": true}'
  ),
  (
    'Progressive House',
    'Long-form progressive house mixing with gradual energy builds',
    'house',
    'https://images.pexels.com/photos/1587927/pexels-photo-1587927.jpeg?auto=compress&cs=tinysrgb&w=400',
    180,
    'intermediate',
    false,
    true,
    'ProgressivePro',
    7890,
    4.7,
    '{"energy_curve": "gradual", "breakdown_style": "melodic", "build_length": 64}'
  );