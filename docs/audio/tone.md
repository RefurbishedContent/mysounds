# Tone.js Audio Engine Integration

This document outlines how the Tone.js audio engine integrates with DJ Blender for real-time audio processing, crossfading, and recording.

## Overview

The `ToneEngine` component provides a browser-based audio processing foundation that can be integrated into the main DJ Blender timeline for real-time mixing capabilities.

## Architecture

### Canonical Types (`src/types/timeline.ts`)

The system uses canonical timeline types that abstract away database specifics:
- **Project**: Basic project metadata
- **Track**: Audio file references with analysis data
- **Clip**: Timeline segments that define when/how tracks play
- **Transition**: Crossfades and effects between tracks

### Data Adapter (`src/lib/adapters/timelineAdapter.ts`)

Maps your existing Supabase schema to canonical types without database changes:
- `ProjectData` → `Project`
- `UploadResult` + project URLs → `Track[]`
- Track data → `Clip[]` (auto-generated playback segments)
- `TemplatePlacementData` + templates → `Transition[]`

### Timeline Queries (`src/lib/data/timelineQueries.ts`)

Provides read-only access to timeline data:
```typescript
const timelineData = await TimelineQueries.fetchTimelineData(projectId, userId);
// Returns: { project, tracks, clips, transitions }
```

### Tone Scheduler (`src/lib/audio/toneScheduler.ts`)

Manages Tone.js audio graph and scheduling:
- `buildPlayers(tracks)`: Creates Tone.Player instances for each track
- `scheduleClips(clips)`: Schedules when clips start/stop
- `scheduleTransitions(transitions)`: Applies crossfades and effects
- `onTick(callback)`: Real-time transport time updates

## Key Features

- **Real-time Crossfading**: Smooth transitions between two audio tracks
- **Scheduled Automation**: Timeline-based parameter automation using Transport
- **Recording**: Capture mixed output as WAV files
- **Browser-only**: No server-side dependencies for audio processing

## Integration with Supabase

### Replacing Placeholder URLs

The system now automatically uses Supabase data when a projectId is provided:

```typescript
// Project mode - uses real Supabase data
<ToneEngine projectId="123e4567-e89b-12d3-a456-426614174000" cursorSec={45.2} />

// Test mode - uses demo audio
<ToneEngine />
```

### Handling Signed URL Expiration

The TimelineQueries handles URL refresh automatically:

```typescript
// URLs are automatically refreshed when fetching timeline data
const refreshedTracks = await TimelineQueries.refreshTrackUrls(tracks);
```

## Usage Examples

### Testing with Project Data

Navigate to: `/projects/{projectId}/tone` or use query param: `?projectId={projectId}`

```typescript
// Example project IDs (replace with actual from your database)
const projectId = "123e4567-e89b-12d3-a456-426614174000";

// Test URL
http://localhost:5173/?projectId=123e4567-e89b-12d3-a456-426614174000
```

### Integration with Timeline UI

```typescript
// In your timeline component
const handleOpenAudioEngine = () => {
  window.open(`/projects/${project.id}/tone`, '_blank');
};

// Or embed directly
<ToneEngine 
  projectId={project.id}
  cursorSec={currentTimelinePosition}
/>
```

### Real-time Timeline Sync

```typescript
// Register for transport time updates
useEffect(() => {
  const unsubscribe = toneScheduler.onTick((timeSec) => {
    // Update timeline UI playhead
    setTimelinePlayhead(timeSec);
  });

  return unsubscribe;
}, []);
```

## User Gesture Requirements

Web Audio API requires user interaction before starting:

```typescript
const handleInitialize = async () => {
  try {
    // CRITICAL: Must be called from user interaction
    await Tone.start();
    
    // Now safe to create audio nodes
    setupAudioGraph();
  } catch (error) {
    console.error('Failed to start Tone.js:', error);
  }
};
```

## SSR Safety

Ensure Tone.js is only loaded client-side:

```typescript
// Component level
const ToneEngine = React.lazy(() => import('./audio/ToneEngine'));

// Or in useEffect
useEffect(() => {
  const loadTone = async () => {
    if (typeof window === 'undefined') return;
    
    const ToneModule = await import('tone');
    setTone(ToneModule.default || ToneModule);
  };
  
  loadTone();
}, []);
```

## CORS Configuration

For Supabase storage, ensure CORS is configured for audio files:

```sql
-- In Supabase SQL Editor
UPDATE storage.buckets 
SET public = true 
WHERE id = 'audio-uploads';
```

## Browser Compatibility

### Safari Limitations

Safari has stricter audio policies:

```typescript
// Check for Safari and handle accordingly
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

if (isSafari) {
  // Safari requires user interaction for each audio context operation
  // Consider showing additional instructions
}
```

### Mobile Considerations

```typescript
// Check for mobile and adjust accordingly
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

if (isMobile) {
  // Mobile devices may have additional limitations
  // Consider reducing complexity or showing warnings
}
```

## Integration with Timeline

To integrate with the main DJ Blender timeline:

### 1. Connect to Template System

```typescript
// Apply template parameters to Tone.js
const applyTemplateParameters = (template: TemplateData, placement: TemplatePlacement) => {
  const overrides = placement.parameterOverrides || {};
  
  // Apply crossfade curve
  if (overrides.crossfadeCurve && crossFadeRef.current) {
    // Set crossfade curve based on template parameter
    crossFadeRef.current.fade.exponentialRampTo(overrides.crossfadeTarget, overrides.crossfadeDuration);
  }
  
  // Apply volume automation
  if (template.transitions) {
    template.transitions.forEach(transition => {
      if (transition.parameters.volumeAutomation) {
        scheduleVolumeAutomation(transition);
      }
    });
  }
};
```

### 2. Sync with Timeline Playback

```typescript
// Sync Transport with timeline current time
const syncWithTimeline = (timelineCurrentTime: number) => {
  if (Tone.Transport) {
    Tone.Transport.seconds = timelineCurrentTime;
  }
};
```

### 3. Export Integration

```typescript
// Connect to render system
const startRender = async (duration: number) => {
  const recorder = new Tone.Recorder();
  Tone.getDestination().connect(recorder);
  
  recorder.start();
  
  // Play timeline
  Tone.Transport.start();
  
  // Wait for duration
  await new Promise(resolve => setTimeout(resolve, duration * 1000));
  
  // Stop and get recording
  const recording = await recorder.stop();
  
  return recording; // Blob that can be uploaded to Supabase
};
```

## Database Schema Mapping

The adapter maps your existing schema without changes:

### Projects → Timeline
- `projects.track1_url` → `Track` with ID "track-a-{projectId}"
- `projects.track2_url` → `Track` with ID "track-b-{projectId}"
- Track URLs become `Clip` entries with full-duration playback

### Template Placements → Transitions
- `template_placements` → `Transition[]`
- `template_data.transitions.volumeAutomation` → Tone.js gain automation
- `parameter_overrides` applied to template parameters

### Example Timeline Data Structure

```json
{
  "project": { "id": "...", "name": "Summer Mix", "bpm": 128 },
  "tracks": [
    { "id": "track-a-...", "url": "signed-url-1", "duration": 245.3 },
    { "id": "track-b-...", "url": "signed-url-2", "duration": 198.7 }
  ],
  "clips": [
    { "id": "clip-track-a", "startSec": 0, "durationSec": 245.3 },
    { "id": "clip-track-b", "startSec": 200, "durationSec": 198.7 }
  ],
  "transitions": [
    { 
      "id": "placement-1", 
      "type": "crossfade", 
      "startSec": 180, 
      "durationSec": 30,
      "parameters": { "volumeAutomation": [...] }
    }
  ]
}
```

## Troubleshooting

### Common Issues

1. **"AudioContext was not allowed to start"**
   - Ensure `await Tone.start()` is called from a user interaction
   - Check that the button click handler is properly async

2. **"Failed to load audio"**
   - Verify Supabase signed URLs are valid and not expired
   - Check CORS configuration in Supabase
   - Ensure audio files are accessible

3. **"Window is not defined" (SSR)**
   - Use dynamic imports with `{ ssr: false }`
   - Check that Tone.js import is inside useEffect or user interaction

4. **Silent playback**
   - Check browser autoplay policies
   - Verify volume levels (Tone uses gain values, not 0-100)
   - Ensure audio context is in "running" state

### Debug Information

The component provides debug information including:
- Audio context state
- Sample rate
- Transport state
- Player connection status

Use this information to diagnose issues during development.

## Performance Considerations

- **Memory Management**: Dispose of Tone.js objects when no longer needed
- **Audio File Caching**: Consider implementing audio buffer caching for frequently used tracks
- **Mobile Performance**: Limit concurrent audio processing on mobile devices
- **Latency**: Use Tone.js's built-in latency compensation for accurate timing

## Next Steps

1. ✅ **Integrated with Supabase data** - Project mode reads real timeline data
2. ✅ **Connected to timeline and template system** - Uses existing schema via adapters
3. Add proper error handling and recovery
4. Implement progress indicators for long operations
5. Connect to main timeline UI for cursor sync
6. Add mobile optimization and Safari compatibility
7. Integrate with the main render/export pipeline

## Real-time Visualization

The ToneEngine includes real-time waveform visualization using Canvas and Tone.Analyser:

### Features

- **Waveform Display**: 256-sample waveform analysis at ~60fps
- **Frequency Overlay**: Visual frequency spectrum overlay
- **Performance Toggle**: Enable/disable for better performance on low-end devices
- **Automatic Pause**: Stops drawing when audio is stopped

### Implementation

```typescript
// Create analyser
const analyser = new Tone.Analyser('waveform', 256);
crossFade.connect(analyser);

// Canvas rendering loop
const drawWaveform = () => {
  if (!isPlaying || !visualizationEnabled) return;
  
  analyser.getValue(waveformData);
  
  // Clear and draw waveform
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // ... render waveform data
  
  requestAnimationFrame(drawWaveform);
};
```

### Performance Considerations

- **Canvas Size**: Fixed at 600x200 for optimal performance
- **Sample Rate**: 256 samples provides good visual detail without excessive CPU usage
- **Toggle Control**: Users can disable visualization on slower devices
- **Memory Management**: Properly dispose of analyser on cleanup

### Usage

The visualization automatically starts when audio playback begins and can be toggled on/off via the UI control. It shows both the current waveform (purple) and frequency spectrum (pink) for comprehensive audio monitoring.

The visualization provides immediate visual feedback for audio mixing operations and enhances the professional feel of the DJ Blender interface. It's optimized for performance while providing rich visual information about the audio signal.

## Timeline Editor Tools

The ToneEngine includes incremental timeline editing tools with feature flags for development:

### Tool 1: Transport + Playhead ✅

**Features:**
- **Time Ruler**: Shows time markers with dynamic intervals based on zoom level
- **Draggable Playhead**: Click and drag to scrub through timeline
- **Timeline Click Seeking**: Click anywhere on timeline to jump to that position
- **Zoom Controls**: Zoom in/out with visual feedback (10% to 500%)
- **Transport Integration**: Syncs with Tone.Transport.seconds for accurate playback

**Implementation:**
```typescript
// Enable/disable via feature flag
const ENABLE_TRANSPORT_TOOLS = true;

// Timeline calculations
const pixelsPerSecond = 50 * timelineZoom;
const timeToPixels = (timeSec: number) => timeSec * pixelsPerSecond;
const pixelsToTime = (pixels: number) => pixels / pixelsPerSecond;

// Playhead dragging
const handlePlayheadMouseDown = (e: React.MouseEvent) => {
  // Sets up mouse event listeners for smooth dragging
  // Updates Tone.Transport.seconds in real-time
};
```

**Usage:**
- **Initialize Audio** first to enable transport
- **Drag playhead** to scrub through audio
- **Click timeline** to jump to specific times
- **Use zoom controls** to adjust timeline detail level
- **"Preview from Cursor"** jumps to external cursor position (for timeline UI integration)

### Tool 2-7: Coming Soon

Additional tools will be added incrementally:
- **Tool 2**: Clip Move + Snap
- **Tool 3**: Trim (In/Out handles)
- **Tool 4**: Crossfade Editor
- **Tool 5**: Track Automation
- **Tool 6**: Markers/Regions
- **Tool 7**: Persist to Supabase

## Export to Supabase Storage

The ToneEngine includes full mix export capability that records the complete timeline and uploads to Supabase Storage.

### Features

- **Full Timeline Recording**: Records entire mix from start to finish using project duration
- **Supabase Integration**: Uploads WAV files to `audio-uploads` bucket
- **Database Tracking**: Creates records in `mixdowns` table for mix management
- **Progress Feedback**: Real-time progress indicator during export
- **Automatic Download**: Downloads file locally while uploading to cloud
- **Duration Control**: Configurable export length (1-300 seconds)

### Implementation

```typescript
// Start export recording
const exportRecorder = new Tone.Recorder();
Tone.getDestination().connect(exportRecorder);
exportRecorder.start();

// Play timeline from start
if (timelineData) {
  toneScheduler.play();
  await new Promise(resolve => setTimeout(resolve, exportDuration * 1000));
  toneScheduler.stop();
}

// Get recording and upload
const recording = await exportRecorder.stop();
await uploadToSupabase(recording);
```

### Database Schema

The export feature uses a dedicated `mixdowns` table:

```sql
CREATE TABLE mixdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  url text NOT NULL,
  filename text NOT NULL,
  duration numeric NOT NULL,
  file_size integer NOT NULL,
  format text DEFAULT 'wav',
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Supabase Storage Integration

Files are uploaded to the `audio-uploads` bucket with the path structure:
```
mixdowns/{projectId}/{timestamp}.wav
```

The integration handles:
- **Automatic upload** to configured Supabase storage bucket
- **Public URL generation** for file access
- **Metadata recording** in database for tracking
- **Error handling** with user feedback
- **Progress tracking** during long exports

### Usage in Production

To use with real project data:

```typescript
// Load project and export
<ToneEngine projectId="your-project-uuid" />

// The component will:
// 1. Load timeline data from Supabase
// 2. Build audio graph from uploaded tracks
// 3. Apply template transitions
// 4. Record full mix and upload to storage
```

### Error Handling

The export system includes comprehensive error handling:
- **Storage permissions**: Validates bucket access
- **File size limits**: Handles large recordings gracefully  
- **Network issues**: Retries and user feedback
- **Audio context**: Proper cleanup and error recovery

### Performance Considerations

- **Memory Usage**: Large exports use streaming where possible
- **Progress Feedback**: Real-time progress prevents user confusion
- **Concurrent Exports**: Only one export allowed at a time
- **Cleanup**: Proper disposal of recorder instances after use