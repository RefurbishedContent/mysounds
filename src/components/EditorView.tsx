import React, { useState, useRef } from 'react';
import { useEffect } from 'react';
import { ArrowLeft, Save, Download, Share, Settings, Layers, Music, Zap, AlertTriangle, CheckCircle, X, Wifi, WifiOff, Cloud, CloudOff, Crown, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { TemplatePlacement } from '../types';
import { databaseService, ProjectData, TemplateData } from '../lib/database';
import { storageService, UploadResult } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import { analyticsService, activityLogger } from '../lib/analytics';
import CreditsIndicator from './CreditsIndicator';
import UpsellDialog from './UpsellDialog';
import AudioUploader from './AudioUploader';
import Timeline from './Timeline';
import TemplateGallery from './TemplateGallery';
import TemplateInspector from './TemplateInspector';
import RenderDialog from './RenderDialog';
import OnboardingOverlay from './OnboardingOverlay';

interface EditorViewProps {
  projectId?: string;
  template?: TemplateData;
  onBack: () => void;
  onSave: (project: Partial<ProjectData>) => void;
}

const EditorView: React.FC<EditorViewProps> = ({ projectId, template, onBack, onSave }) => {
  const { user, credits } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [projectName, setProjectName] = useState(
    projectId ? 'Summer Vibes Mix' : 'New Project'
  );
  const [tracksUploaded, setTracksUploaded] = useState(false);
  const [uploadedTracks, setUploadedTracks] = useState<{
    trackA?: UploadResult;
    trackB?: UploadResult;
  }>({});
  const [templatePlacements, setTemplatePlacements] = useState<TemplatePlacement[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<TemplatePlacement | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [templateMap, setTemplateMap] = useState<Map<string, TemplateData>>(new Map());
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(!!projectId);
  const [error, setError] = useState<string | null>(null);
  const [showRenderDialog, setShowRenderDialog] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Autosave state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Header collapse state
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Template gallery collapse state
  const [isGalleryCollapsed, setIsGalleryCollapsed] = useState(false);

  // Calculate max duration from uploaded tracks
  const maxDuration = React.useMemo(() => {
    if (!uploadedTracks.trackA || !uploadedTracks.trackB) return 300; // 5 minutes default
    
    const trackADuration = uploadedTracks.trackA.metadata.duration || 0;
    const trackBDuration = uploadedTracks.trackB.metadata.duration || 0;
    
    return Math.max(trackADuration, trackBDuration);
  }, [uploadedTracks.trackA, uploadedTracks.trackB]);

  // Validation state helper
  const validateProjectState = () => {
    return validationErrors.length === 0 && uploadedTracks.trackA && uploadedTracks.trackB;
  };

  // Debounced autosave
  const autosaveTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Compute validation errors without updating state
  const computeValidationErrors = React.useCallback(() => {
    const errors: string[] = [];
    
    if (!uploadedTracks.trackA) {
      errors.push('Track A is required for mixing');
    }
    
    if (!uploadedTracks.trackB) {
      errors.push('Track B is required for mixing');
    }
    
    if (uploadedTracks.trackA && uploadedTracks.trackB) {
      const trackADuration = uploadedTracks.trackA.metadata.duration || 0;
      const trackBDuration = uploadedTracks.trackB.metadata.duration || 0;
      
      if (trackADuration < 30) {
        errors.push('Track A must be at least 30 seconds long');
      }
      
      if (trackBDuration < 30) {
        errors.push('Track B must be at least 30 seconds long');
      }
      
      if (Math.abs(trackADuration - trackBDuration) > 300) {
        errors.push('Track duration difference should not exceed 5 minutes for optimal mixing');
      }
    }
    
    return errors;
  }, [uploadedTracks.trackA, uploadedTracks.trackB]);

  // Update validation errors when dependencies change
  useEffect(() => {
    const newErrors = computeValidationErrors();
    const hasChanged = 
      newErrors.length !== validationErrors.length ||
      !newErrors.every((error, index) => error === validationErrors[index]);
    
    if (hasChanged) {
      setValidationErrors(newErrors);
    }
  }, [computeValidationErrors, validationErrors]);

  // Check if user needs onboarding
  useEffect(() => {
    if (user && !projectId && !template) {
      const completed = localStorage.getItem(`onboarding_completed_${user.id}`);
      if (!completed) {
        setShowOnboarding(true);
      } else {
        setOnboardingCompleted(true);
      }
    }
  }, [user, projectId, template]);

  // Load existing project if editing
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId || !user) return;
      
      try {
        setLoading(true);
        const projectData = await databaseService.getProject(projectId, user.id);
        
        if (!projectData) {
          setError('Project not found');
          return;
        }
        
        setProject(projectData);
        setProjectName(projectData.name);
        setTemplatePlacements(projectData.templatePlacements);
        
        // Reconstruct track data from stored project info
        const tracks: { trackA?: UploadResult; trackB?: UploadResult } = {};
        
        if (projectData.trackAUrl && projectData.trackAName) {
          tracks.trackA = {
            id: `project-track-a-${projectData.id}`,
            url: projectData.trackAUrl,
            path: projectData.trackAName,
            metadata: {
              filename: projectData.trackAName,
              size: 0, // Size not stored, but not critical for playback
              mimeType: 'audio/mpeg', // Default, could be improved
              duration: projectData.duration || 0
            }
          };
        }
        
        if (projectData.trackBUrl && projectData.trackBName) {
          tracks.trackB = {
            id: `project-track-b-${projectData.id}`,
            url: projectData.trackBUrl,
            path: projectData.trackBName,
            metadata: {
              filename: projectData.trackBName,
              size: 0, // Size not stored, but not critical for playback
              mimeType: 'audio/mpeg', // Default, could be improved
              duration: projectData.duration || 0
            }
          };
        }
        
        if (tracks.trackA || tracks.trackB) {
          setUploadedTracks(tracks);
          setTracksUploaded(!!(tracks.trackA && tracks.trackB));
        }
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
        console.error('Failed to load project:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, user]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Autosave function
  const performAutosave = React.useCallback(async () => {
    if (!user || !hasUnsavedChanges || !isOnline) return;
    
    try {
      setIsSaving(true);
      setSaveError(null);
      
      if (project) {
        // Update existing project
        await databaseService.updateProject(project.id, user.id, {
          name: projectName,
          trackAName: uploadedTracks.trackA?.metadata.filename,
          trackBName: uploadedTracks.trackB?.metadata.filename,
          trackAUrl: uploadedTracks.trackA?.url,
          trackBUrl: uploadedTracks.trackB?.url,
          duration: Math.max(
            uploadedTracks.trackA?.metadata.duration || 0,
            uploadedTracks.trackB?.metadata.duration || 0
          ),
          status: 'draft'
        });
      } else if (uploadedTracks.trackA || uploadedTracks.trackB) {
        // Create new project if we have tracks
        const newProject = await databaseService.createProject(user.id, {
          name: projectName,
          description: 'DJ Mix Project'
        });
        
        // Update the new project with track data
        if (uploadedTracks.trackA || uploadedTracks.trackB) {
          await databaseService.updateProject(newProject.id, user.id, {
            trackAName: uploadedTracks.trackA?.metadata.filename,
            trackBName: uploadedTracks.trackB?.metadata.filename,
            trackAUrl: uploadedTracks.trackA?.url,
            trackBUrl: uploadedTracks.trackB?.url,
            duration: Math.max(
              uploadedTracks.trackA?.metadata.duration || 0,
              uploadedTracks.trackB?.metadata.duration || 0
            )
          });
        }
        
        setProject(newProject);
      }
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Autosave failed');
      console.error('Autosave failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [user, hasUnsavedChanges, isOnline, project, projectName, uploadedTracks]);

  // Debounced autosave trigger
  const triggerAutosave = React.useCallback(() => {
    setHasUnsavedChanges(true);
    
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    
    autosaveTimeoutRef.current = setTimeout(() => {
      performAutosave();
    }, 2000); // 2 second debounce
  }, [performAutosave]);

  // Cleanup autosave timeout
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      // Cleanup playback interval
      if ((window as any).playbackInterval) {
        clearInterval((window as any).playbackInterval);
        (window as any).playbackInterval = null;
      }
    };
  }, []);

  // Clear toast after delay
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Auto-collapse header and gallery on scroll down
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      const scrollThreshold = 50;
      const galleryScrollThreshold = 200;

      if (currentScrollY > scrollThreshold && currentScrollY > lastScrollY.current) {
        // Scrolling down
        setIsHeaderCollapsed(true);
        if (currentScrollY > galleryScrollThreshold) {
          setIsGalleryCollapsed(true);
        }
      } else if (currentScrollY < lastScrollY.current && currentScrollY < scrollThreshold) {
        // Scrolling up near top
        setIsHeaderCollapsed(false);
        setIsGalleryCollapsed(false);
      }

      lastScrollY.current = currentScrollY;
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize new project state
  useEffect(() => {
    if (!projectId && !project && !loading) {
      // This is a new project, set initial state
      setProjectName('New Project');
      setUploadedTracks({});
      setTracksUploaded(false);
      setTemplatePlacements([]);
      setSelectedPlacement(null);
      setShowInspector(false);
      setError(null);
    }
  }, [projectId, project, loading]);

  // Validate template placement
  const validateTemplatePlacement = (placement: TemplatePlacement, template: TemplateData): string | null => {
    if (!uploadedTracks.trackA || !uploadedTracks.trackB) {
      return 'Both tracks must be uploaded before placing templates';
    }
    
    const trackADuration = uploadedTracks.trackA.metadata.duration || 0;
    const trackBDuration = uploadedTracks.trackB.metadata.duration || 0;
    const overlapDuration = Math.min(trackADuration, trackBDuration);
    
    // Check if placement fits within track overlap
    if (placement.startTime + template.duration > overlapDuration) {
      return `Template extends beyond track overlap (${Math.floor(overlapDuration)}s available)`;
    }
    
    // Check template requirements
    if (template.templateData?.requirements) {
      const req = template.templateData.requirements;
      
      if (req.minDuration && template.duration < req.minDuration) {
        return `Template requires minimum ${req.minDuration}s duration`;
      }
      
      if (req.maxDuration && template.duration > req.maxDuration) {
        return `Template exceeds maximum ${req.maxDuration}s duration`;
      }
      
      // Check BPM compatibility if analysis is available
      const trackAAnalysis = uploadedTracks.trackA.metadata.analysis;
      const trackBAnalysis = uploadedTracks.trackB.metadata.analysis;
      
      if (req.bpmRange && (trackAAnalysis?.bpm || trackBAnalysis?.bpm)) {
        const bpm = trackAAnalysis?.bpm || trackBAnalysis?.bpm;
        if (bpm && (bpm < req.bpmRange[0] || bpm > req.bpmRange[1])) {
          return `Template BPM range (${req.bpmRange[0]}-${req.bpmRange[1]}) doesn't match track BPM (${bpm})`;
        }
      }
    }
    
    // Check for overlapping placements
    const overlapping = templatePlacements.find(existing => 
      existing.id !== placement.id &&
      !(placement.startTime + template.duration <= existing.startTime || 
        placement.startTime >= existing.trackARegion.end)
    );
    
    if (overlapping) {
      return 'Template overlaps with existing placement';
    }
    
    return null;
  };

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToastMessage({ type, message });
  };

  const handlePlayPause = () => {
    if (validationErrors.length > 0) {
      showToast('error', 'Please upload both tracks before playing');
      return;
    }
    
    // Simple audio playback simulation for now
    if (!isPlaying) {
      // Start playback
      setIsPlaying(true);
      
      // Simulate playback with timer
      const playbackInterval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 0.1;
          if (newTime >= maxDuration) {
            setIsPlaying(false);
            clearInterval(playbackInterval);
            return 0;
          }
          return newTime;
        });
      }, 100);
      
      // Store interval for cleanup
      (window as any).playbackInterval = playbackInterval;
      
      // Mark as played for onboarding
      const playedMarker = document.createElement('div');
      playedMarker.setAttribute('data-onboarding', 'has-played');
      playedMarker.style.display = 'none';
      document.body.appendChild(playedMarker);
      
      showToast('success', 'Playing mix preview');
    } else {
      // Stop playback
      setIsPlaying(false);
      if ((window as any).playbackInterval) {
        clearInterval((window as any).playbackInterval);
        (window as any).playbackInterval = null;
      }
    }
  };

  const handleStop = () => {
    if ((window as any).playbackInterval) {
      clearInterval((window as any).playbackInterval);
      (window as any).playbackInterval = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (time: number) => {
    if ((window as any).playbackInterval) {
      clearInterval((window as any).playbackInterval);
      (window as any).playbackInterval = null;
    }
    setCurrentTime(time);
    
    // Resume playback if it was playing
    if (isPlaying) {
      const playbackInterval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 0.1;
          if (newTime >= maxDuration) {
            setIsPlaying(false);
            clearInterval(playbackInterval);
            return 0;
          }
          return newTime;
        });
      }, 100);
      (window as any).playbackInterval = playbackInterval;
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      if (project) {
        // Update existing project
        const updatedProject = await databaseService.updateProject(project.id, user.id, {
          name: projectName,
          trackAName: uploadedTracks.trackA?.metadata.filename,
          trackBName: uploadedTracks.trackB?.metadata.filename,
          trackAUrl: uploadedTracks.trackA?.url,
          trackBUrl: uploadedTracks.trackB?.url,
          status: 'draft'
        });
        
        onSave(updatedProject);
      } else {
        // Create new project
        const newProject = await databaseService.createProject(user.id, {
          name: projectName,
          trackAUploadId: uploadedTracks.trackA?.id,
          trackBUploadId: uploadedTracks.trackB?.id
        });
        
        onSave(newProject);
      }
    } catch (err) {
      console.error('Failed to save project:', err);
      // Could show error toast here
    }
  };

  const handleTracksReady = (trackA: UploadResult, trackB: UploadResult) => {
    setUploadedTracks({ trackA, trackB });
    setTracksUploaded(true);
    triggerAutosave();
    showToast('success', 'Both tracks uploaded successfully! You can now start mixing.');
    
    // Update project with track information if this is an existing project
    if (project && user) {
      databaseService.updateProject(project.id, user.id, {
        trackAName: trackA.metadata.filename,
        trackBName: trackB.metadata.filename,
        trackAUrl: trackA.url,
        trackBUrl: trackB.url,
        duration: Math.max(trackA.metadata.duration || 0, trackB.metadata.duration || 0)
      }).catch(console.error);
    }
    
    // Track successful upload milestone
    if (user) {
      analyticsService.trackMilestone('tracks_uploaded', {
        trackADuration: trackA.metadata.duration,
        trackBDuration: trackB.metadata.duration,
        trackASize: trackA.metadata.size,
        trackBSize: trackB.metadata.size,
        totalSize: trackA.metadata.size + trackB.metadata.size
      }, user.id);
    }
  };

  const handleAddTemplatePlacement = (placement: TemplatePlacement) => {
    const template = templateMap.get(placement.templateId);
    if (!template) {
      showToast('error', 'Template not found');
      return;
    }
    
    const validationError = validateTemplatePlacement(placement, template);
    if (validationError) {
      showToast('error', validationError);
      return;
    }
    
    setTemplatePlacements(prev => [...prev, placement]);
    triggerAutosave();
    showToast('success', `${template.name} template added to timeline`);
    
    // Mark template as placed for onboarding
    const placedMarker = document.createElement('div');
    placedMarker.setAttribute('data-onboarding', 'template-placed');
    placedMarker.style.display = 'none';
    document.body.appendChild(placedMarker);
    
    // Track analytics
    if (user) {
      analyticsService.trackFeature('template', 'placed', {
        templateId: template.id,
        templateName: template.name,
        templateCategory: template.category,
        placementTime: placement.startTime
      }, user.id);
      
      activityLogger.logTemplate('placed', template.id, user.id, {
        templateName: template.name,
        projectId: project?.id,
        startTime: placement.startTime,
        duration: template.duration
      });
    }
  };

  const handleSelectPlacement = (placement: TemplatePlacement) => {
    setSelectedPlacement(placement);
    setShowInspector(true);
  };

  const handleUpdatePlacement = (updatedPlacement: TemplatePlacement) => {
    const template = templateMap.get(updatedPlacement.templateId);
    if (!template) return;
    
    const validationError = validateTemplatePlacement(updatedPlacement, template);
    if (validationError) {
      showToast('error', validationError);
      return;
    }
    
    setTemplatePlacements(prev => 
      prev.map(p => p.id === updatedPlacement.id ? updatedPlacement : p)
    );
    setSelectedPlacement(updatedPlacement);
    triggerAutosave();
    showToast('success', 'Template placement updated');
  };

  const handleSelectTemplate = (template: TemplateData) => {
    // Add template to map for audio engine
    setTemplateMap(prev => new Map(prev).set(template.id, template));
    
    // Track template selection
    if (user) {
      analyticsService.trackFeature('template', 'selected', {
        templateId: template.id,
        templateName: template.name,
        templateCategory: template.category,
        templateDifficulty: template.difficulty
      }, user.id);
    }
  };

  const handleRemovePlacement = () => {
    if (selectedPlacement) {
      const template = templateMap.get(selectedPlacement.templateId);
      setTemplatePlacements(prev => 
        prev.filter(p => p.id !== selectedPlacement.id)
      );
      setSelectedPlacement(null);
      setShowInspector(false);
      triggerAutosave();
      showToast('success', `${template?.name || 'Template'} removed from timeline`);
      
      // Track template removal
      if (user) {
        analyticsService.trackFeature('template', 'removed', {
          templateId: selectedPlacement.templateId,
          templateName: template?.name,
          placementDuration: selectedPlacement.trackARegion.end - selectedPlacement.trackARegion.start
        }, user.id);
        
        activityLogger.logTemplate('removed', selectedPlacement.templateId, user.id, {
          templateName: template?.name,
          projectId: project?.id,
          startTime: selectedPlacement.startTime
        });
      }
    }
  };

  const handleCloseInspector = () => {
    setShowInspector(false);
    setSelectedPlacement(null);
  };

  // Handle project name changes
  const handleProjectNameChange = (newName: string) => {
    setProjectName(newName);
    triggerAutosave();
  };

  // Format last saved time
  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get save status indicator
  const getSaveStatusIndicator = () => {
    if (!isOnline) {
      return (
        <div className="flex items-center space-x-2 text-red-400">
          <WifiOff size={16} />
          <span className="text-sm">Offline</span>
        </div>
      );
    }
    
    if (isSaving) {
      return (
        <div className="flex items-center space-x-2 text-blue-400">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Saving...</span>
        </div>
      );
    }
    
    if (saveError) {
      return (
        <div className="flex items-center space-x-2 text-red-400">
          <CloudOff size={16} />
          <span className="text-sm">Save failed</span>
        </div>
      );
    }
    
    if (hasUnsavedChanges) {
      return (
        <div className="flex items-center space-x-2 text-yellow-400">
          <Cloud size={16} />
          <span className="text-sm">Unsaved changes</span>
        </div>
      );
    }
    
    if (lastSaved) {
      return (
        <div className="flex items-center space-x-2 text-green-400">
          <CheckCircle size={16} />
          <span className="text-sm">Saved {formatLastSaved(lastSaved)}</span>
        </div>
      );
    }
    
    return null;
  };

  const handleExportClick = async () => {
    if (!user) return;
    
    // Check validation first
    if (validationErrors.length > 0 || templatePlacements.length === 0) {
      showToast('error', 'Please upload tracks and add templates before exporting');
      return;
    }
    
    // Check credits
    try {
      const creditsCheck = await databaseService.checkCreditsForRender(user.id, 1);
      
      if (!creditsCheck.hasCredits) {
        setShowUpsell(true);
        return;
      }
      
      // Show low credits warning but allow export
      if (creditsCheck.creditsRemaining <= 2) {
        showToast('warning', `Only ${creditsCheck.creditsRemaining} credits remaining after this export`);
      }
      
      setShowRenderDialog(true);
      
      // Track export initiation
      if (user) {
        analyticsService.trackMilestone('export_initiated', {
          projectId: project?.id,
          templateCount: templatePlacements.length,
          creditsRemaining: creditsCheck.creditsRemaining
        }, user.id);
      }
    } catch (err) {
      showToast('error', 'Failed to check credit balance');
    }
  };
  
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto shadow-lg shadow-cyan-500/50"></div>
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-red-900/50 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-400 text-2xl">⚠</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Error Loading Project</h3>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`border-b border-gray-700 transition-all duration-300 ${isHeaderCollapsed ? 'h-12' : 'p-6'}`}>
        {isHeaderCollapsed ? (
          /* Collapsed Header */
          <div className="flex items-center justify-between h-full px-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="text-sm text-gray-400 font-medium truncate max-w-[200px]">{projectName}</span>
              <div className="text-xs">{getSaveStatusIndicator()}</div>
            </div>

            <div className="flex items-center space-x-2">
              <CreditsIndicator showDetails={false} />

              <button
                onClick={handleExportClick}
                disabled={validationErrors.length > 0 || templatePlacements.length === 0 || !credits}
                className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 text-white text-sm rounded-lg font-medium transition-all duration-200 flex items-center space-x-1.5 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 disabled:opacity-50 disabled:hover:shadow-none"
              >
                <Zap size={14} />
                <span>Export</span>
              </button>

              <button
                onClick={() => setIsHeaderCollapsed(false)}
                className="px-3 py-1.5 bg-green-600/10 hover:bg-green-600/20 border border-green-600/30 hover:border-green-500/50 text-green-500/80 hover:text-green-400 rounded-lg text-xs font-medium transition-all duration-200 shadow-sm shadow-green-500/20 hover:shadow-md hover:shadow-green-500/30 flex items-center space-x-1.5"
                title="Exit focus mode"
              >
                <ChevronDown size={16} />
                <span>EXPAND</span>
              </button>
            </div>
          </div>
        ) : (
          /* Expanded Header */
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => handleProjectNameChange(e.target.value)}
                  className="text-xl font-semibold text-white bg-transparent border-none outline-none focus:bg-gray-800 rounded px-2 py-1 transition-all duration-200"
                />
                <p className="text-gray-400 text-sm">
                  {template ? `Using ${template.name} template` : project ? 'Editing project' : 'New project'}
                </p>
              </div>

              {/* Save Status Indicator */}
              <div className="ml-4">
                {getSaveStatusIndicator()}
              </div>

              {/* Credits Indicator */}
              <div className="ml-4">
                <CreditsIndicator showDetails={true} />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Export Button */}
              <button
                onClick={handleExportClick}
                disabled={validationErrors.length > 0 || templatePlacements.length === 0 || !credits}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105 disabled:opacity-50 disabled:hover:shadow-none disabled:hover:scale-100"
              >
                <Zap size={16} />
                <span>
                  {validationErrors.length > 0
                    ? 'Upload Tracks'
                    : templatePlacements.length === 0
                    ? 'Add Templates'
                    : credits?.creditsRemaining === 0
                    ? 'Upgrade Required'
                    : 'Export'
                  }
                </span>
              </button>

              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200">
                <Share size={20} />
              </button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200">
                <Settings size={20} />
              </button>

              {/* Collapse Button - PROMINENT */}
              <button
                onClick={() => setIsHeaderCollapsed(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600/30 to-emerald-600/30 hover:from-green-600/40 hover:to-emerald-600/40 border-2 border-green-500 hover:border-green-400 text-green-400 rounded-lg font-bold transition-all duration-200 shadow-lg shadow-green-500/60 hover:shadow-green-400/80 hover:shadow-2xl animate-pulse flex items-center space-x-2"
                title="Minimize header for focus mode"
              >
                <ChevronUp size={20} className="animate-bounce" />
                <span className="text-sm">FOCUS MODE</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-yellow-900/30 border-b border-yellow-600/50 p-4 shadow-lg shadow-yellow-500/10">
          <div className="flex items-start space-x-3">
            <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-yellow-300 font-medium mb-2">Project Setup Required</h4>
              <ul className="text-yellow-200 text-sm space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Save Error Banner */}
      {saveError && (
        <div className="bg-red-900/30 border-b border-red-700 p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-red-300 font-medium mb-1">Autosave Failed</h4>
              <p className="text-red-200 text-sm">{saveError}</p>
              <button
                onClick={() => {
                  setSaveError(null);
                  performAutosave();
                }}
                className="mt-2 px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-sm transition-all duration-200 hover:shadow-lg hover:shadow-red-500/30"
              >
                Retry Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {!tracksUploaded ? (
          /* Upload Interface */
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <AudioUploader onTracksReady={handleTracksReady} />
            </div>
          </div>
        ) : (
          /* Main Editor */
          <div className="flex flex-col min-h-full">
            {/* Timeline Section */}
            <div className={`h-[500px] ${
              validationErrors.length > 0 ? 'opacity-50' : ''
            }`}>
              <Timeline
                trackA={uploadedTracks.trackA || null}
                trackB={uploadedTracks.trackB || null}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onStop={handleStop}
                currentTime={currentTime}
                onSeek={handleSeek}
                templatePlacements={templatePlacements}
                onAddTemplatePlacement={handleAddTemplatePlacement}
                onSelectPlacement={handleSelectPlacement}
                selectedPlacement={selectedPlacement}
                templates={templateMap}
              />
            </div>

            {/* Template Gallery Section - Below Timeline */}
            {!validationErrors.length && (
              <div className={`bg-[#232323] border-t border-[#2a2a2a] relative transition-all duration-300 ${isGalleryCollapsed ? 'h-16' : ''}`}>
                {isGalleryCollapsed ? (
                  /* Collapsed State */
                  <div className="h-full px-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 rounded-lg border border-cyan-500/30">
                        <Layers size={16} className="text-cyan-400" />
                      </div>
                      <span className="text-white text-sm font-medium">Transition Templates</span>
                    </div>
                    <button
                      onClick={() => setIsGalleryCollapsed(false)}
                      className="px-4 py-2 bg-green-600/10 hover:bg-green-600/20 border border-green-600/30 hover:border-green-500/50 text-green-500/80 hover:text-green-400 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm shadow-green-500/20 hover:shadow-md hover:shadow-green-500/30 flex items-center space-x-2"
                      title="Expand template gallery"
                    >
                      <ChevronDown size={18} />
                      <span>EXPAND TEMPLATES</span>
                    </button>
                  </div>
                ) : (
                  /* Expanded State */
                  <div className="px-6 py-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 rounded-lg border border-cyan-500/30">
                          <Layers size={20} className="text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">Transition Templates</h3>
                          <p className="text-gray-400 text-sm">Drag templates to the Transitions & Effects track above to blend your tracks</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setShowInspector(!showInspector)}
                          className="px-4 py-2 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 hover:border-cyan-400/50 text-cyan-400 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/20"
                        >
                          {showInspector ? 'Hide Inspector' : 'Show Inspector'}
                        </button>
                        <button
                          onClick={() => setIsGalleryCollapsed(true)}
                          className="px-4 py-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:from-green-600/30 hover:to-emerald-600/30 border-2 border-green-500 hover:border-green-400 text-green-400 rounded-lg text-sm font-bold transition-all duration-200 shadow-lg shadow-green-500/50 hover:shadow-green-400/70 hover:shadow-xl flex items-center space-x-2"
                          title="Minimize template gallery"
                        >
                          <ChevronUp size={18} />
                          <span>MINIMIZE</span>
                        </button>
                      </div>
                    </div>
                    <div className="pb-4">
                      <TemplateGallery
                        onSelectTemplate={handleSelectTemplate}
                        compact={false}
                        trackA={uploadedTracks.trackA || null}
                        trackB={uploadedTracks.trackB || null}
                      />
                    </div>
                  </div>
                )}

                {/* Floating Right Panel - Template Inspector */}
                {showInspector && selectedPlacement && (
                  (() => {
                    const template = templateMap.get(selectedPlacement.templateId);
                    return template ? (
                      <div className="absolute top-0 right-0 bottom-0 w-96 bg-gray-900 border-l border-gray-700 animate-slide-in-right overflow-y-auto">
                        <TemplateInspector
                          data-onboarding="inspector"
                          template={template}
                          placement={selectedPlacement}
                          onClose={handleCloseInspector}
                          onUpdatePlacement={handleUpdatePlacement}
                          onRemovePlacement={handleRemovePlacement}
                          showTips={!onboardingCompleted}
                        />
                      </div>
                    ) : null;
                  })()
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Render Dialog */}
      {showRenderDialog && (
        <RenderDialog
          projectId={projectId || 'current-project'}
          projectName={projectName}
          onClose={() => setShowRenderDialog(false)}
        />
      )}
      
      {/* Upsell Dialog */}
      {showUpsell && (
        <UpsellDialog
          onClose={() => setShowUpsell(false)}
          trigger={credits?.creditsRemaining === 0 ? 'no_credits' : 'low_credits'}
        />
      )}
      
      {/* Onboarding Overlay */}
      {showOnboarding && (
        <OnboardingOverlay
          onComplete={() => {
            setShowOnboarding(false);
            setOnboardingCompleted(true);
            
            // Track onboarding completion
            if (user) {
              analyticsService.trackMilestone('onboarding_completed', {
                completionTime: Date.now(),
                skipped: false
              }, user.id);
            }
          }}
          onSkip={() => {
            setShowOnboarding(false);
            setOnboardingCompleted(true);
            
            // Track onboarding skip
            if (user) {
              analyticsService.trackMilestone('onboarding_skipped', {
                skipTime: Date.now(),
                currentStep: 0
              }, user.id);
            }
          }}
        />
      )}
      
      {/* Toast Notifications */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-2xl border ${
            toastMessage.type === 'success'
              ? 'bg-green-900/90 border-green-600/50 text-green-100 shadow-green-500/30'
              : toastMessage.type === 'error'
              ? 'bg-red-900/90 border-red-600/50 text-red-100 shadow-red-500/30'
              : 'bg-yellow-900/90 border-yellow-600/50 text-yellow-100 shadow-yellow-500/30'
          }`}>
            {toastMessage.type === 'success' && <CheckCircle size={20} />}
            {toastMessage.type === 'error' && <AlertTriangle size={20} />}
            {toastMessage.type === 'warning' && <AlertTriangle size={20} />}
            <span className="text-sm font-medium">{toastMessage.message}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-current hover:opacity-70 transition-opacity duration-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorView;