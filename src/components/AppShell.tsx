import React, { useState, useEffect, useRef } from 'react';
import { Home, Music, Disc3, Headphones, Settings, Folder, AudioWaveform as Waveform, Sliders, FileAudio, User, Bell, Search, Menu, X, Activity, HelpCircle, Plus, Sparkles, Wand2, Video, Mic, Grid3X3, Clock, Share2, ListMusic, Zap, Brain, FlaskConical, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { useIsMobile } from '../hooks/useIsMobile';
import { TemplateData, databaseService } from '../lib/database';
import CreditsIndicator from './CreditsIndicator';
import TransitionsList from './TransitionsList';
import TemplateGallery from './TemplateGallery';
import EditorView from './EditorView';
import TemplateManager from './TemplateManager';
import LibraryView from './LibraryView';
import MixerView from './MixerView';
import PreviewView from './PreviewView';
import FilesView from './FilesView';
import TransitionEditorView from './TransitionEditorView';
import TransitionEditorWrapper from './TransitionEditorWrapper';
import TransitionCreator from './TransitionCreator';
import ProfileView from './ProfileView';
import AIFusionView from './AIFusionView';
import LabsView from './LabsView';
import MobileBottomNav, { MobileNavView } from './MobileBottomNav';
import ProjectCreationWizard from './ProjectCreationWizard';
import { UploadResult } from '../lib/storage';

type AppView = 'home' | 'create-with-ai' | 'ai-design' | 'ai-video' | 'ai-voice' | 'all-tools' | 'templates' | 'recent-projects' | 'share-schedule' | 'create-transition' | 'editor' | 'template-manager' | 'library' | 'mixer' | 'preview' | 'files' | 'transition-editor' | 'transitions' | 'playlists' | 'profile' | 'project-wizard';

interface MenuItem {
  id: string;
  icon: any;
  label: string;
  view?: AppView;
  action?: () => void;
  comingSoon?: boolean;
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

const AppShell: React.FC = () => {
  const { user, signOut } = useAuth();
  const onboarding = useOnboarding();
  const isMobile = useIsMobile();
  const [currentView, setCurrentView] = useState<AppView>('library');
  const [mobileNavView, setMobileNavView] = useState<MobileNavView>('library');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | undefined>();
  const [editingProjectId, setEditingProjectId] = useState<string | undefined>();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isTopBarVisible, setIsTopBarVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const scrollTimeoutRef = useRef<number | null>(null);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [transitionSongA, setTransitionSongA] = useState<UploadResult | undefined>();
  const [transitionSongB, setTransitionSongB] = useState<UploadResult | undefined>();
  const [editingTransitionId, setEditingTransitionId] = useState<string | undefined>();

  const handleCreateNew = () => {
    setCurrentView('project-wizard');
  };

  const menuSections: MenuSection[] = [
    {
      items: [
        { id: 'home', icon: Home, label: 'Home', view: 'home' },
      ]
    },
    {
      title: 'Labs',
      items: [
        { id: 'transitions', icon: Waveform, label: 'Transitions', view: 'transitions' },
        { id: 'mixer', icon: Sliders, label: 'Mixer', view: 'mixer' },
      ]
    },
    {
      title: 'Library',
      items: [
        { id: 'library', icon: Music, label: 'My Music', view: 'library' },
        { id: 'playlists', icon: ListMusic, label: 'Playlists', view: 'playlists' },
      ]
    },
    {
      title: 'AI Fusion',
      items: [
        { id: 'smart-blend', icon: Sparkles, label: 'Smart Blend', view: 'library' },
        { id: 'auto-transition', icon: Wand2, label: 'Auto Transition', view: 'library' },
        { id: 'ai-mashup', icon: Music, label: 'AI Mashup', comingSoon: true },
        { id: 'voice-enhance', icon: Mic, label: 'Voice Enhancement', comingSoon: true },
        { id: 'mood-analysis', icon: Brain, label: 'Mood Analysis', comingSoon: true },
        { id: 'beat-match', icon: Zap, label: 'Beat Matching', comingSoon: true },
      ]
    },
    {
      title: 'Templates & projects',
      items: [
        { id: 'templates', icon: FileAudio, label: 'Templates', view: 'templates' },
        { id: 'recent-projects', icon: Clock, label: 'Recent projects', view: 'recent-projects' },
        { id: 'share-schedule', icon: Share2, label: 'Share and schedule', view: 'share-schedule' },
      ]
    },
    ...(user?.plan === 'admin' ? [{
      title: 'Admin',
      items: [
        { id: 'template-manager', icon: Settings, label: 'Template Manager', view: 'template-manager' as AppView }
      ]
    }] : [])
  ];

  const handleCreateProject = () => {
    // Create new project in database
    if (user) {
      databaseService.createProject(user.id, {
        name: 'New Project'
      }).then((project) => {
        setEditingProjectId(project.id);
        setSelectedTemplate(undefined);
        setCurrentView('editor');
      }).catch(console.error);
    }
  };

  const handleCreateProjectFromTemplate = () => {
    setSelectedTemplate(undefined);
    setEditingProjectId(undefined);
    setCurrentView('editor');
  };

  const handleOpenProject = (projectId: string) => {
    setEditingProjectId(projectId);
    setSelectedTemplate(undefined);
    setCurrentView('editor');
  };

  const handleSelectTemplate = (template: TemplateData) => {
    setSelectedTemplate(template);
    setEditingProjectId(undefined);
    setCurrentView('editor');
  };

  const handleBackToProjects = () => {
    setCurrentView('recent-projects');
    setSelectedTemplate(undefined);
    setEditingProjectId(undefined);
  };

  const handleSaveProject = (project: any) => {
    console.log('Saving project:', project);
    setCurrentView('recent-projects');
  };

  const handleCreateNewTransition = () => {
    setCurrentView('create-transition');
  };

  const handleTransitionSaved = () => {
    setCurrentView('recent-projects');
  };

  const handleBackToTransitions = () => {
    setCurrentView('recent-projects');
  };

  const handleCreateTransitionWithSong = (song: UploadResult) => {
    setTransitionSongA(song);
    setCurrentView('create-transition');
  };

  const handleEditTransition = (transitionId: string) => {
    setEditingTransitionId(transitionId);
    setCurrentView('transition-editor');
  };

  const handleMobileNavigation = (view: MobileNavView) => {
    setMobileNavView(view);

    switch (view) {
      case 'ai-fusion':
        setCurrentView('create-with-ai');
        break;
      case 'labs':
        setCurrentView('transitions');
        break;
      case 'library':
        setCurrentView('library');
        break;
      case 'templates':
        setCurrentView('templates');
        break;
      case 'profile':
        setCurrentView('profile');
        break;
    }
  };

  const handleAIToolSelect = (tool: string) => {
    setCurrentView(tool as AppView);
  };

  const handleLabToolSelect = (tool: string) => {
    setCurrentView(tool as AppView);
  };

  const handleWizardComplete = (projectType: 'transition' | 'mixer', projectData: any) => {
    if (projectType === 'transition') {
      setTransitionSongA(projectData.songA);
      setTransitionSongB(projectData.songB);
      setEditingTransitionId(projectData.transitionId);
      setCurrentView('transition-editor');
    } else if (projectType === 'mixer') {
      setCurrentView('mixer');
    }
  };

  const handleWizardCancel = () => {
    setCurrentView('library');
  };

  // Sync mobile nav view with current view
  useEffect(() => {
    if (!isMobile) return;

    if (currentView === 'create-with-ai' || currentView === 'ai-design' || currentView === 'ai-video' || currentView === 'ai-voice') {
      setMobileNavView('ai-fusion');
    } else if (currentView === 'transitions' || currentView === 'mixer' || currentView === 'transition-editor' || currentView === 'create-transition') {
      setMobileNavView('labs');
    } else if (currentView === 'library' || currentView === 'files' || currentView === 'playlists') {
      setMobileNavView('library');
    } else if (currentView === 'templates' || currentView === 'template-manager') {
      setMobileNavView('templates');
    } else if (currentView === 'profile') {
      setMobileNavView('profile');
    }
  }, [currentView, isMobile]);

  // Handle scroll to hide/show top bar
  useEffect(() => {
    const mainContent = document.querySelector('.main-content-scroll');
    if (!mainContent) return;

    const handleScroll = () => {
      const scrollY = mainContent.scrollTop;
      const scrollDifference = scrollY - lastScrollYRef.current;

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Debounce the scroll state change
      scrollTimeoutRef.current = window.setTimeout(() => {
        // Hide top bar if scrolling down and past threshold
        if (scrollY > 80 && scrollDifference > 0) {
          setIsTopBarVisible(false);
        }
        // Show top bar if scrolling up or near top
        else if (scrollY < 30 || scrollDifference < 0) {
          setIsTopBarVisible(true);
        }

        lastScrollYRef.current = scrollY;
      }, 100); // Debounce by 100ms
    };

    mainContent.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      mainContent.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return (
          <div className="h-full flex flex-col p-4">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/50">
                  <Music size={32} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Welcome to MySounds.ai
                </h1>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Create seamless transitions between your songs using AI-powered templates.
                  Upload your music library and start blending tracks like a pro.
                </p>
                <button
                  onClick={() => setCurrentView('library')}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        );
      case 'create-with-ai':
        return isMobile ? (
          <AIFusionView onSelectTool={handleAIToolSelect} />
        ) : (
          <LibraryView onCreateTransitionWithSong={handleCreateTransitionWithSong} />
        );
      case 'transitions':
        return isMobile ? (
          <LabsView onSelectTool={handleLabToolSelect} />
        ) : (
          <TransitionsList onCreateNew={handleCreateNewTransition} onEditTransition={handleEditTransition} />
        );
      case 'recent-projects':
        return <TransitionsList onCreateNew={handleCreateNewTransition} onEditTransition={handleEditTransition} />;
      case 'share-schedule':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto">
                <Share2 size={24} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">Coming Soon</h2>
              <p className="text-sm text-gray-400">Share and schedule your transitions</p>
            </div>
          </div>
        );
      case 'create-transition':
        return (
          <TransitionCreator
            onBack={handleBackToTransitions}
            onSave={handleTransitionSaved}
            initialSongA={transitionSongA}
          />
        );
      case 'transition-editor':
        return editingTransitionId ? (
          <TransitionEditorWrapper
            transitionId={editingTransitionId}
            onBack={() => setCurrentView('transitions')}
            onSave={() => setCurrentView('transitions')}
          />
        ) : null;
      case 'templates':
        return (
          <TemplateGallery 
            onSelectTemplate={handleSelectTemplate}
          />
        );
      case 'editor':
        return (
          <EditorView
            projectId={editingProjectId}
            template={selectedTemplate}
            onBack={handleBackToProjects}
            onSave={handleSaveProject}
          />
        );
      case 'template-manager':
        return <TemplateManager />;
      case 'library':
      case 'files':
        return <LibraryView onCreateTransitionWithSong={handleCreateTransitionWithSong} />;
      case 'playlists':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <ListMusic size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Coming Soon</h2>
              <p className="text-gray-400">Playlist management feature is under development</p>
            </div>
          </div>
        );
      case 'mixer':
        return <MixerView />;
      case 'preview':
        return <PreviewView />;
      case 'profile':
        return (
          <ProfileView
            onShowTutorial={() => {
              onboarding.resetOnboarding();
              setCurrentView('editor');
            }}
          />
        );
      case 'project-wizard':
        return (
          <ProjectCreationWizard
            onComplete={handleWizardComplete}
            onCancel={handleWizardCancel}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto">
                <Music size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Coming Soon</h2>
              <p className="text-gray-400">This feature is under development</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Top Bar - Hidden on Mobile */}
      <div className={`bg-gray-800 border-b border-gray-700 px-3 sm:px-4 py-2 sm:py-3 flex-shrink-0 transition-transform duration-500 ease-in-out ${isTopBarVisible ? 'translate-y-0' : '-translate-y-full'} ${isMobile ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          {/* Left Section */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200 md:hidden"
            >
              <Menu size={20} />
            </button>

            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200 hidden md:block"
            >
              <Menu size={20} />
            </button>

            {/* Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <div className="w-5 h-5 bg-gradient-to-br from-white to-cyan-100 rounded-sm opacity-90"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  MySounds.ai
                </h1>
                <p className="text-xs text-gray-500">AI-Powered Song Fusion</p>
              </div>
            </div>
          </div>

          {/* Center Section - Search */}
          <div className="flex-1 max-w-md mx-4 sm:mx-8 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                placeholder="Search fusions, AI templates..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Credits Indicator */}
            <CreditsIndicator />
            
            <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200 relative hidden sm:block">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 pl-3 border-l border-gray-600 hover:bg-gray-700 rounded-lg p-2 transition-all duration-200"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user?.plan} Account</p>
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md shadow-cyan-500/20">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <User size={16} className="text-white" />
                  )}
                </div>
              </button>

              {/* User Menu */}
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-[100]">
                  <div className="py-1">
                    <a href="#" className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200">
                      <User size={16} />
                      <span>Profile</span>
                    </a>
                    <a href="#" className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200">
                      <Settings size={16} />
                      <span>Settings</span>
                    </a>
                    <hr className="border-gray-600 my-1" />
                    <button
                      onClick={signOut}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200"
                    >
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Hidden on Mobile (bottom nav replaces it) */}
        <div className={`
          bg-gray-800 border-r border-gray-700 transition-all duration-300 ease-in-out relative
          ${isMobile ? 'hidden' : ''}
          md:translate-x-0
          md:relative inset-y-0 left-0 z-50
          md:w-auto
          ${isSidebarCollapsed ? 'md:w-16' : 'md:w-64'}
        `}>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex absolute -right-3 top-6 z-50 w-6 h-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-full items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={14} className="text-gray-300" />
            ) : (
              <ChevronLeft size={14} className="text-gray-300" />
            )}
          </button>

          <div className="h-full flex flex-col">
            {/* Mobile Close Button */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Menu</h2>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation */}
            <nav className={`flex-1 px-3 py-4 space-y-6 overflow-y-auto ${isSidebarCollapsed ? 'md:overflow-hidden' : ''}`}>
              {/* Create New Button */}
              {!isSidebarCollapsed && (
                <button
                  onClick={handleCreateNew}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50"
                >
                  <Plus size={20} />
                  <span>Create new</span>
                </button>
              )}

              {/* Menu Sections */}
              {menuSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="space-y-1">
                  {section.title && !isSidebarCollapsed && (
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {section.title}
                    </h3>
                  )}
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.view === currentView;
                    const isDisabled = item.comingSoon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (isDisabled) return;
                          if (item.view) {
                            setCurrentView(item.view);
                            setIsMobileSidebarOpen(false);
                          } else if (item.action) {
                            item.action();
                            setIsMobileSidebarOpen(false);
                          }
                        }}
                        disabled={isDisabled}
                        className={`
                          w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200
                          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                          ${isActive && !isDisabled
                            ? 'bg-gray-700 text-white font-medium'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                          }
                          justify-start md:${isSidebarCollapsed ? 'justify-center' : 'justify-start'}
                        `}
                        title={isSidebarCollapsed ? item.label : undefined}
                      >
                        <Icon size={20} className="flex-shrink-0" />
                        <span className={`ml-3 flex-1 text-left ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                          {item.label}
                        </span>
                        {item.comingSoon && !isSidebarCollapsed && (
                          <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-500">
                            Soon
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-gray-700">
              <button
                onClick={() => {
                  onboarding.resetOnboarding();
                  setCurrentView('editor');
                  setShowUserMenu(false);
                  setIsMobileSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200 mb-2
                  justify-start md:${isSidebarCollapsed ? 'justify-center' : 'justify-start'}
                `}
                title={isSidebarCollapsed ? 'Show Tutorial' : undefined}
              >
                <HelpCircle size={20} className="flex-shrink-0" />
                <span className={`ml-3 font-medium ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                  Show Tutorial
                </span>
              </button>
              <button className={`
                w-full flex items-center px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200
                justify-start md:${isSidebarCollapsed ? 'justify-center' : 'justify-start'}
              `}
              title={isSidebarCollapsed ? 'Settings' : undefined}>
                <Settings size={20} className="flex-shrink-0" />
                <span className={`ml-3 font-medium ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                  Settings
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full flex flex-col min-w-0">
          <div className={`flex-1 overflow-y-auto overflow-x-hidden main-content-scroll ${isMobile ? 'pb-20' : ''}`} style={{ WebkitOverflowScrolling: 'touch' }}>
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav
          currentView={mobileNavView}
          onNavigate={handleMobileNavigation}
        />
      )}

      {/* Floating Action Buttons - visible when top bar is hidden on desktop only */}
      {!isTopBarVisible && !isMobile && (
        <>
          {/* Floating Menu Button - Desktop */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="fixed top-4 left-4 z-50 w-12 h-12 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-full shadow-2xl shadow-cyan-500/50 flex items-center justify-center text-white hover:scale-110 transition-transform duration-200"
          >
            <Menu size={20} />
          </button>

          {/* Floating Search Button */}
          <button
            onClick={() => setShowSearchOverlay(true)}
            className="fixed top-4 right-4 z-50 w-12 h-12 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-full shadow-2xl shadow-cyan-500/50 flex items-center justify-center text-white hover:scale-110 transition-transform duration-200"
          >
            <Search size={20} />
          </button>
        </>
      )}

      {/* Global Search Overlay */}
      {showSearchOverlay && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4"
          onClick={() => setShowSearchOverlay(false)}
        >
          <div
            className="w-full max-w-2xl bg-gray-800 rounded-2xl border border-gray-600 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects, templates, files..."
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-12 pr-4 py-4 bg-gray-700 border border-gray-600 rounded-xl text-white text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Quick Actions</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setCurrentView('projects');
                      setShowSearchOverlay(false);
                    }}
                    className="flex items-center space-x-3 p-3 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors duration-200"
                  >
                    <Disc3 size={20} className="text-cyan-400" />
                    <span className="text-white text-sm">My Projects</span>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentView('templates');
                      setShowSearchOverlay(false);
                    }}
                    className="flex items-center space-x-3 p-3 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors duration-200"
                  >
                    <FileAudio size={20} className="text-cyan-400" />
                    <span className="text-white text-sm">Templates</span>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentView('library');
                      setShowSearchOverlay(false);
                    }}
                    className="flex items-center space-x-3 p-3 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors duration-200"
                  >
                    <Music size={20} className="text-cyan-400" />
                    <span className="text-white text-sm">Library</span>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentView('mixer');
                      setShowSearchOverlay(false);
                    }}
                    className="flex items-center space-x-3 p-3 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors duration-200"
                  >
                    <Sliders size={20} className="text-cyan-400" />
                    <span className="text-white text-sm">Mixer</span>
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowSearchOverlay(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppShell;