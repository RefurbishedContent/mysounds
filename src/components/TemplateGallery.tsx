import React, { useState, useRef, useEffect as useReactEffect } from 'react';
import { useEffect } from 'react';
import { Search, Filter, Star, Download, Play, Crown, Heart, Eye, GripVertical, X, ChevronLeft, ChevronRight, Zap, TrendingUp, Award, Music } from 'lucide-react';
import { databaseService, TemplateData } from '../lib/database';
import { UploadResult } from '../lib/storage';
import TemplateIcon from './TemplateIcon';

interface TemplateGalleryProps {
  onSelectTemplate: (template: TemplateData) => void;
  compact?: boolean;
  onDragStart?: (template: TemplateData, e: React.DragEvent) => void;
  trackA?: UploadResult | null;
  trackB?: UploadResult | null;
  durationFilter?: 'short' | 'medium' | 'long';
  selectedTemplateId?: string;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  onSelectTemplate,
  compact = false,
  onDragStart,
  trackA,
  trackB,
  durationFilter,
  selectedTemplateId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedDurations, setSelectedDurations] = useState<string[]>([]);
  const [selectedBPMRanges, setSelectedBPMRanges] = useState<string[]>([]);
  const [selectedEnergyLevels, setSelectedEnergyLevels] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('');
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const scrollIntervalRef = useRef<number | null>(null);

  const categories = ['electronic', 'hip-hop', 'house', 'techno', 'trance', 'dubstep', 'ambient'];
  const difficulties = ['beginner', 'intermediate', 'advanced'];
  const durations = ['short', 'medium', 'long'];
  const bpmRanges = ['slow', 'moderate', 'fast', 'very-fast'];
  const energyLevels = ['chill', 'balanced', 'energetic', 'peak'];
  const moods = ['smooth', 'aggressive', 'melodic', 'dark', 'uplifting', 'groovy', 'intense'];
  const styles = ['crossfade', 'cut', 'echo', 'slam', 'build', 'scratch'];
  const sortOptions = ['popular', 'rating', 'downloads', 'newest'];

  // Load templates from database
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const templatesData = await databaseService.getTemplates();
        setTemplates(templatesData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load templates');
        console.error('Failed to load templates:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  // Handle scroll for minimizing header (listen to parent scroll)
  useEffect(() => {
    const scrollContainer = document.querySelector('.main-content-scroll');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      setIsScrolled(scrollTop > 20);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const getDurationSize = (duration: number): 'short' | 'medium' | 'long' => {
    if (duration >= 4 && duration <= 8) return 'short';
    if (duration > 8 && duration <= 15) return 'medium';
    return 'long';
  };

  const getBPMRange = (bpm: number): string => {
    if (bpm < 90) return 'slow';
    if (bpm >= 90 && bpm < 120) return 'moderate';
    if (bpm >= 120 && bpm < 140) return 'fast';
    return 'very-fast';
  };

  const getEnergyLevel = (energy: number): string => {
    if (energy < 0.3) return 'chill';
    if (energy >= 0.3 && energy < 0.6) return 'balanced';
    if (energy >= 0.6 && energy < 0.85) return 'energetic';
    return 'peak';
  };

  const toggleFilter = (value: string, selected: string[], setter: (values: string[]) => void) => {
    if (selected.includes(value)) {
      setter(selected.filter(v => v !== value));
    } else {
      setter([...selected, value]);
    }
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedDifficulties([]);
    setSelectedDurations([]);
    setSelectedBPMRanges([]);
    setSelectedEnergyLevels([]);
    setSelectedMoods([]);
    setSelectedStyles([]);
    setSortBy('');
    setShowPremiumOnly(false);
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedDifficulties.length > 0 ||
    selectedDurations.length > 0 || selectedBPMRanges.length > 0 || selectedEnergyLevels.length > 0 ||
    selectedMoods.length > 0 || selectedStyles.length > 0 || sortBy || showPremiumOnly;

  let filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.author.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(template.category);
    const matchesDifficulty = selectedDifficulties.length === 0 || selectedDifficulties.includes(template.difficulty);
    const matchesDuration = selectedDurations.length === 0 || selectedDurations.includes(getDurationSize(template.duration));

    const templateBPMRange = getBPMRange((template.bpmMin + template.bpmMax) / 2);
    const matchesBPM = selectedBPMRanges.length === 0 || selectedBPMRanges.includes(templateBPMRange);

    const templateEnergyLevel = getEnergyLevel((template.energyMin + template.energyMax) / 2);
    const matchesEnergy = selectedEnergyLevels.length === 0 || selectedEnergyLevels.includes(templateEnergyLevel);

    const matchesMood = selectedMoods.length === 0 || selectedMoods.some(mood =>
      template.moodTags?.some(tag => tag.toLowerCase().includes(mood.toLowerCase()))
    );

    const matchesStyle = selectedStyles.length === 0 || selectedStyles.some(style =>
      template.transitionStyle?.toLowerCase().includes(style.toLowerCase())
    );

    const matchesPremium = !showPremiumOnly || template.isPremium;
    const matchesProvidedDuration = !durationFilter || getDurationSize(template.duration) === durationFilter;

    return matchesSearch && matchesCategory && matchesDifficulty && matchesDuration &&
           matchesBPM && matchesEnergy && matchesMood && matchesStyle && matchesPremium && matchesProvidedDuration;
  });

  // Apply sorting
  if (sortBy === 'popular') {
    filteredTemplates = [...filteredTemplates].sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
  } else if (sortBy === 'rating') {
    filteredTemplates = [...filteredTemplates].sort((a, b) => b.rating - a.rating);
  } else if (sortBy === 'downloads') {
    filteredTemplates = [...filteredTemplates].sort((a, b) => b.downloads - a.downloads);
  }

  const getDifficultyColor = (difficulty: TemplateData['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-900/30';
      case 'intermediate': return 'text-yellow-400 bg-yellow-900/30';
      case 'advanced': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-800/50';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  // Auto-scroll when dragging near edges
  useReactEffect(() => {
    let scrollableContainer: HTMLElement | null = null;

    const findScrollableParent = (element: HTMLElement | null): HTMLElement | null => {
      if (!element) return null;

      const isScrollable = (el: HTMLElement) => {
        const style = window.getComputedStyle(el);
        return (
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight
        );
      };

      let current = element;
      while (current && current !== document.body) {
        if (isScrollable(current)) {
          return current;
        }
        current = current.parentElement;
      }
      return document.documentElement;
    };

    const handleDragOver = (e: DragEvent) => {
      if (!isDragging) return;

      if (!scrollableContainer) {
        scrollableContainer = findScrollableParent(e.target as HTMLElement);
      }

      const scrollZone = 100;
      const scrollSpeed = 10;
      const { clientY } = e;
      const windowHeight = window.innerHeight;

      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }

      if (clientY < scrollZone) {
        scrollIntervalRef.current = window.setInterval(() => {
          if (scrollableContainer) {
            if (scrollableContainer === document.documentElement) {
              window.scrollBy({ top: -scrollSpeed, behavior: 'auto' });
            } else {
              scrollableContainer.scrollTop -= scrollSpeed;
            }
          }
        }, 16);
      } else if (clientY > windowHeight - scrollZone) {
        scrollIntervalRef.current = window.setInterval(() => {
          if (scrollableContainer) {
            if (scrollableContainer === document.documentElement) {
              window.scrollBy({ top: scrollSpeed, behavior: 'auto' });
            } else {
              scrollableContainer.scrollTop += scrollSpeed;
            }
          }
        }, 16);
      }
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      scrollableContainer = null;
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };

    if (isDragging) {
      document.addEventListener('dragover', handleDragOver);
      document.addEventListener('dragend', handleDragEnd);
      document.addEventListener('drop', handleDragEnd);
    }

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDragEnd);
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, [isDragging]);

  const handleDragStart = (template: TemplateData, e: React.DragEvent) => {
    // Check if both tracks are loaded before allowing drag
    if (!trackA || !trackB) {
      e.preventDefault();
      return;
    }

    setIsDragging(true);
    e.dataTransfer.setData('application/json', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(template, e);
  };

  return (
    <div className={`h-full flex flex-col ${compact ? '' : 'p-3 sm:p-4 md:p-6'}`} data-onboarding="templates">
      {/* Header */}
      {!compact && !isScrolled && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 mb-8">
          <div>
            <h1 className="font-bold text-white transition-all duration-300 text-3xl mb-2">
              Template Gallery
            </h1>
            <p className="text-gray-400 transition-opacity duration-300">Professional mixing templates created by top DJs</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400 transition-all duration-300">
            <span>{filteredTemplates.length} templates</span>
          </div>
        </div>
      )}

      {/* Filters */}
      {!compact && !isScrolled && (
        <div className="space-y-4 transition-all duration-300 mb-6">
          {/* Search Bar */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search templates, authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
            />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{filteredTemplates.length} templates found</span>
              <button
                onClick={clearAllFilters}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
              >
                <X size={14} />
                <span>Clear all filters</span>
              </button>
            </div>
          )}

          {/* Horizontal Filter Tags */}
          <div className="space-y-3">
            {/* Genre/Category */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Music size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Genre</span>
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 filter-scroll">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => toggleFilter(category, selectedCategories, setSelectedCategories)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedCategories.includes(category)
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Duration</span>
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 filter-scroll">
                {durations.map(duration => (
                  <button
                    key={duration}
                    onClick={() => toggleFilter(duration, selectedDurations, setSelectedDurations)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedDurations.includes(duration)
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                    }`}
                  >
                    {duration === 'short' ? 'Short (4-8s)' : duration === 'medium' ? 'Medium (8-15s)' : 'Long (16-25s)'}
                  </button>
                ))}
              </div>
            </div>

            {/* BPM Range */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">BPM</span>
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 filter-scroll">
                {bpmRanges.map(range => (
                  <button
                    key={range}
                    onClick={() => toggleFilter(range, selectedBPMRanges, setSelectedBPMRanges)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedBPMRanges.includes(range)
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                    }`}
                  >
                    {range === 'slow' ? 'Slow (<90)' : range === 'moderate' ? 'Moderate (90-120)' : range === 'fast' ? 'Fast (120-140)' : 'Very Fast (140+)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy Level */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Zap size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Energy</span>
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 filter-scroll">
                {energyLevels.map(level => (
                  <button
                    key={level}
                    onClick={() => toggleFilter(level, selectedEnergyLevels, setSelectedEnergyLevels)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedEnergyLevels.includes(level)
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood Tags */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Mood</span>
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 filter-scroll">
                {moods.map(mood => (
                  <button
                    key={mood}
                    onClick={() => toggleFilter(mood, selectedMoods, setSelectedMoods)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedMoods.includes(mood)
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                    }`}
                  >
                    {mood.charAt(0).toUpperCase() + mood.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Transition Style */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Filter size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Style</span>
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 filter-scroll">
                {styles.map(style => (
                  <button
                    key={style}
                    onClick={() => toggleFilter(style, selectedStyles, setSelectedStyles)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedStyles.includes(style)
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                    }`}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty & Sort & Premium */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Award size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">More Filters</span>
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 filter-scroll">
                {difficulties.map(difficulty => (
                  <button
                    key={difficulty}
                    onClick={() => toggleFilter(difficulty, selectedDifficulties, setSelectedDifficulties)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedDifficulties.includes(difficulty)
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                    }`}
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </button>
                ))}
                <div className="w-px h-6 bg-gray-600 flex-shrink-0"></div>
                {sortOptions.map(sort => (
                  <button
                    key={sort}
                    onClick={() => setSortBy(sortBy === sort ? '' : sort)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      sortBy === sort
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                    }`}
                  >
                    {sort === 'popular' ? 'Most Popular' : sort === 'rating' ? 'Top Rated' : sort === 'downloads' ? 'Most Downloaded' : 'Newest'}
                  </button>
                ))}
                <div className="w-px h-6 bg-gray-600 flex-shrink-0"></div>
                <button
                  onClick={() => setShowPremiumOnly(!showPremiumOnly)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center space-x-1 ${
                    showPremiumOnly
                      ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg shadow-yellow-500/30'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                  }`}
                >
                  <Crown size={14} />
                  <span>Premium Only</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="flex-1">
        {loading ? (
          <div className="glass-surface rounded-2xl p-12 text-center shadow-xl shadow-cyan-500/10">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Loading Templates</h3>
            <p className="text-gray-400">Fetching the latest mixing templates...</p>
          </div>
        ) : error ? (
          <div className="glass-surface rounded-2xl p-12 text-center">
            <div className="w-12 h-12 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-2xl">⚠</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Templates</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/30"
            >
              Retry
            </button>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="glass-surface rounded-2xl p-12 text-center">
            <Search size={48} className="text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No templates found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className={compact ? 'flex space-x-3 overflow-x-auto pb-2' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`group hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 cursor-grab active:cursor-grabbing ${
                  compact
                    ? 'flex-shrink-0 w-64 bg-gray-800/50 backdrop-blur-sm border border-cyan-500/20 hover:border-cyan-400/40 rounded-xl p-3 flex items-center space-x-3'
                    : 'glass-surface rounded-xl overflow-hidden'
                }`}
                draggable
                onDragStart={(e) => handleDragStart(template, e)}
              >
                {/* Disabled overlay for templates when tracks not ready */}
                {(!trackA || !trackB) && (
                  <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center z-10 rounded-xl">
                    <div className="text-center space-y-1">
                      <div className="text-yellow-400 text-xs font-medium">Upload Required</div>
                      <div className="text-gray-400 text-xs">Upload both tracks first</div>
                    </div>
                  </div>
                )}
                
                {/* Drag Handle */}
                {compact && (
                  <div className="text-gray-500 group-hover:text-gray-300 transition-colors duration-200">
                    <GripVertical size={16} />
                  </div>
                )}

                {/* Thumbnail */}
                <div className={`relative ${compact ? 'w-16 h-16 flex-shrink-0' : ''}`}>
                  <div className={`overflow-hidden ${compact ? 'w-16 h-16 rounded-lg' : 'w-full h-48'}`}>
                    <div className={`group-hover:scale-110 transition-transform duration-300 ${compact ? 'w-16 h-16' : 'w-full h-48'}`}>
                      <TemplateIcon category={template.category} name={template.name} />
                    </div>
                  </div>
                  
                  {/* Overlay */}
                  {!compact && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="flex space-x-2">
                      <button className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-200">
                        <Play size={16} />
                      </button>
                      <button
                        onClick={() => onSelectTemplate(template)}
                        disabled={!trackA || !trackB}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/40"
                      >
                        Use Template
                      </button>
                    </div>
                  </div>
                  )}

                  {/* Badges */}
                  <div className={`absolute flex space-x-1 ${compact ? 'top-1 left-1' : 'top-3 left-3 space-x-2'}`}>
                    {template.isPopular && (
                      <span className={`bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 text-white font-medium rounded-full flex items-center shadow-lg shadow-cyan-500/30 ${compact ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs space-x-1'}`}>
                        <Star size={compact ? 8 : 10} />
                        {!compact && <span>Popular</span>}
                      </span>
                    )}
                    {template.isPremium && (
                      <span className={`bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-medium rounded-full flex items-center ${compact ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs space-x-1'}`}>
                        <Crown size={compact ? 8 : 10} />
                        {!compact && <span>Pro</span>}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  {!compact && (
                    <div className="absolute top-3 right-3 flex space-x-2">
                    <button className="p-2 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 transition-all duration-200">
                      <Heart size={14} />
                    </button>
                  </div>
                  )}

                  {/* Duration */}
                  <div className={`absolute ${compact ? 'bottom-1 right-1' : 'bottom-3 right-3'}`}>
                    <span className={`bg-black/70 backdrop-blur-sm text-white rounded ${compact ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'}`}>
                      {template.duration}s
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className={`space-y-2 ${compact ? 'flex-1 min-w-0' : 'p-6 space-y-4'}`}>
                  <div>
                    <h3 className={`font-semibold text-white ${compact ? 'text-sm mb-0.5 truncate' : 'text-lg mb-1'}`}>
                      {template.name}
                    </h3>
                    <p className={`text-gray-400 ${compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'}`}>
                      {template.description}
                    </p>
                  </div>

                  {/* Author & Category */}
                  <div className={`flex items-center justify-between ${compact ? 'text-xs' : 'text-sm'}`}>
                    <span className="text-gray-400 truncate">by {template.author}</span>
                    <span className={`px-2 py-1 font-medium rounded-full ${getDifficultyColor(template.difficulty)} ${compact ? 'text-xs' : 'text-xs'}`}>
                      {template.difficulty}
                    </span>
                  </div>

                  {/* Stats */}
                  {!compact && (
                    <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Download size={14} />
                        <span>{formatNumber(template.downloads)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star size={14} className="text-yellow-500" />
                        <span>{template.rating}</span>
                      </div>
                    </div>
                    <span className="capitalize">{template.category}</span>
                  </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Search Button - visible when scrolled and not in compact mode */}
      {!compact && isScrolled && (
        <button
          onClick={() => setShowSearchOverlay(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-full shadow-2xl shadow-cyan-500/50 flex items-center justify-center text-white hover:scale-110 transition-transform duration-200"
        >
          <Search size={24} />
        </button>
      )}

      {/* Search Overlay */}
      {showSearchOverlay && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-gray-800 rounded-2xl border border-gray-600 shadow-2xl my-10">
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Search */}
              <div className="relative sticky top-0 bg-gray-800 z-10 pb-4">
                <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates, authors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-12 pr-4 py-4 bg-gray-700 border border-gray-600 rounded-xl text-white text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                {hasActiveFilters && (
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-gray-400">{filteredTemplates.length} templates found</span>
                    <button
                      onClick={clearAllFilters}
                      className="flex items-center space-x-1 px-3 py-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
                    >
                      <X size={14} />
                      <span>Clear all</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Filters - Same horizontal tags as main view */}
              <div className="space-y-3">
                {/* Categories */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Genre</span>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => toggleFilter(category, selectedCategories, setSelectedCategories)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                          selectedCategories.includes(category)
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                        }`}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Duration</span>
                  <div className="flex flex-wrap gap-2">
                    {durations.map(duration => (
                      <button
                        key={duration}
                        onClick={() => toggleFilter(duration, selectedDurations, setSelectedDurations)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                          selectedDurations.includes(duration)
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                        }`}
                      >
                        {duration === 'short' ? 'Short (4-8s)' : duration === 'medium' ? 'Medium (8-15s)' : 'Long (16-25s)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* BPM & Energy */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">BPM</span>
                    <div className="flex flex-wrap gap-2">
                      {bpmRanges.map(range => (
                        <button
                          key={range}
                          onClick={() => toggleFilter(range, selectedBPMRanges, setSelectedBPMRanges)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                            selectedBPMRanges.includes(range)
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                          }`}
                        >
                          {range === 'slow' ? '<90' : range === 'moderate' ? '90-120' : range === 'fast' ? '120-140' : '140+'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Energy</span>
                    <div className="flex flex-wrap gap-2">
                      {energyLevels.map(level => (
                        <button
                          key={level}
                          onClick={() => toggleFilter(level, selectedEnergyLevels, setSelectedEnergyLevels)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                            selectedEnergyLevels.includes(level)
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mood */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Mood</span>
                  <div className="flex flex-wrap gap-2">
                    {moods.map(mood => (
                      <button
                        key={mood}
                        onClick={() => toggleFilter(mood, selectedMoods, setSelectedMoods)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                          selectedMoods.includes(mood)
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                        }`}
                      >
                        {mood.charAt(0).toUpperCase() + mood.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style & Difficulty */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Style</span>
                    <div className="flex flex-wrap gap-2">
                      {styles.map(style => (
                        <button
                          key={style}
                          onClick={() => toggleFilter(style, selectedStyles, setSelectedStyles)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                            selectedStyles.includes(style)
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                          }`}
                        >
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Difficulty</span>
                    <div className="flex flex-wrap gap-2">
                      {difficulties.map(difficulty => (
                        <button
                          key={difficulty}
                          onClick={() => toggleFilter(difficulty, selectedDifficulties, setSelectedDifficulties)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                            selectedDifficulties.includes(difficulty)
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                          }`}
                        >
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sort & Premium */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Sort & More</span>
                  <div className="flex flex-wrap gap-2">
                    {sortOptions.map(sort => (
                      <button
                        key={sort}
                        onClick={() => setSortBy(sortBy === sort ? '' : sort)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                          sortBy === sort
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                        }`}
                      >
                        {sort === 'popular' ? 'Most Popular' : sort === 'rating' ? 'Top Rated' : sort === 'downloads' ? 'Most Downloaded' : 'Newest'}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowPremiumOnly(!showPremiumOnly)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center space-x-1 ${
                        showPremiumOnly
                          ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg shadow-yellow-500/30'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                      }`}
                    >
                      <Crown size={12} />
                      <span>Premium</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="sticky bottom-0 bg-gray-800 pt-4">
                <button
                  onClick={() => setShowSearchOverlay(false)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/30"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateGallery;