import React, { useState, useEffect, useRef } from 'react';
import { Music, AudioWaveform, Sliders, Upload, FileAudio, Clock, TrendingUp, Zap, Activity, Play, Download, Sparkles, ArrowRight, Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../lib/database';
import { storageService } from '../lib/storage';
import { FeedSection } from './feed';
import DJLaserCanvas from './DJLaserCanvas';

interface HomeViewProps {
  onNavigate: (view: string) => void;
  onCreateNew: () => void;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  timestamp: Date;
  metadata?: any;
}

interface LibraryStats {
  totalTracks: number;
  totalTransitions: number;
  totalMixSessions: number;
  totalBlends: number;
  hoursProduced: number;
}

const EQ_BAR_COUNT = 28;

function randomEqBars(): number[] {
  return Array.from({ length: EQ_BAR_COUNT }, () => 10 + Math.random() * 90);
}

const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onCreateNew }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<LibraryStats>({
    totalTracks: 0,
    totalTransitions: 0,
    totalMixSessions: 0,
    totalBlends: 0,
    hoursProduced: 0,
  });
  const [displayStats, setDisplayStats] = useState<LibraryStats>({
    totalTracks: 0,
    totalTransitions: 0,
    totalMixSessions: 0,
    totalBlends: 0,
    hoursProduced: 0,
  });
  const [eqBars, setEqBars] = useState<number[]>(randomEqBars);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [recentTracks, setRecentTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      setEqBars(randomEqBars());
    }, 160);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (loading) return;
    const duration = 1200;
    const steps = 40;
    const stepMs = duration / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const p = step / steps;
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplayStats({
        totalTracks: Math.round(stats.totalTracks * ease),
        totalTransitions: Math.round(stats.totalTransitions * ease),
        totalMixSessions: Math.round(stats.totalMixSessions * ease),
        totalBlends: Math.round(stats.totalBlends * ease),
        hoursProduced: Math.round(stats.hoursProduced * ease * 10) / 10,
      });
      if (step >= steps) clearInterval(interval);
    }, stepMs);
    return () => clearInterval(interval);
  }, [loading, stats]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [uploads, transitions, activities, blends, mixSessions] = await Promise.all([
        storageService.getUserUploads(user!.id),
        databaseService.getUserTransitions(user!.id),
        databaseService.getRecentActivities(user!.id, 8),
        databaseService.getUserBlends(user!.id).catch(() => []),
        databaseService.getUserMixSessions(user!.id).catch(() => []),
      ]);

      const totalHours = uploads.reduce((sum, track) => {
        const duration = track.analysis?.duration || 0;
        return sum + (duration / 3600);
      }, 0);

      setStats({
        totalTracks: uploads.length,
        totalTransitions: transitions.length,
        totalMixSessions: mixSessions.length,
        totalBlends: blends.length,
        hoursProduced: Math.round(totalHours * 10) / 10,
      });

      setRecentTracks(uploads.slice(0, 6));
      setRecentActivities(activities.map(activity => ({
        id: activity.id,
        type: activity.event_type,
        title: formatActivityTitle(activity),
        timestamp: new Date(activity.created_at),
        metadata: activity.event_data,
      })));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatActivityTitle = (activity: any): string => {
    switch (activity.event_type) {
      case 'upload_completed':
        return `Uploaded "${activity.event_data?.filename || 'track'}"`;
      case 'project_created':
        return 'Created new mash up';
      case 'render_completed':
        return 'Render completed';
      case 'template_placed':
        return 'Applied template';
      default:
        return activity.event_type.replace(/_/g, ' ');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    {
      id: 'new-transition',
      icon: AudioWaveform,
      title: 'New Mash Up',
      description: 'Mash up two tracks seamlessly',
      gradient: 'from-cyan-500 to-blue-600',
      action: onCreateNew,
    },
    {
      id: 'mixer',
      icon: Sliders,
      title: 'Open Mixer',
      description: 'Create full DJ sets',
      gradient: 'from-blue-500 to-purple-600',
      action: () => onNavigate('mixer'),
    },
    {
      id: 'upload',
      icon: Upload,
      title: 'Upload Tracks',
      description: `${displayStats.totalTracks} tracks in library`,
      gradient: 'from-purple-500 to-pink-600',
      action: () => onNavigate('library'),
    },
    {
      id: 'templates',
      icon: FileAudio,
      title: 'Browse Templates',
      description: 'Explore mash up styles',
      gradient: 'from-pink-500 to-rose-600',
      action: () => onNavigate('templates'),
    },
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-transparent">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Hero Section */}
        <div className="relative overflow-visible rounded-xl bg-gray-950 border border-cyan-500/20 min-h-[180px] shadow-2xl shadow-cyan-500/15" style={{ isolation: 'isolate' }}>
          <div className="absolute inset-0 overflow-hidden rounded-xl z-0">
            <DJLaserCanvas />
          </div>

          <div className="absolute inset-0 pointer-events-none z-[1] rounded-xl" style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 20%, rgba(0,0,0,0.4) 100%)' }} />

          {/* Bottom bleed — lasers dissolve into the galaxy below */}
          <div
            className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-[2] rounded-b-xl"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(5,5,16,0.85))' }}
          />

          <div className="relative z-10 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-white" style={{ textShadow: '0 0 20px rgba(0,245,255,0.5), 0 0 40px rgba(0,245,255,0.2)' }}>
                    {getGreeting()}, {user?.name}
                  </h1>
                  <span className="px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-xs font-semibold text-white uppercase tracking-wide shadow-lg shadow-cyan-500/30">
                    {user?.plan}
                  </span>
                </div>
                <p className="text-sm text-gray-300">Ready to create something incredible?</p>
              </div>
              <button
                onClick={onCreateNew}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/60 flex items-center gap-2"
              >
                <Plus size={16} />
                Create New
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat-card-cyan bg-gray-900/70 backdrop-blur-sm rounded-lg p-3 border border-cyan-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-cyan-500/25 rounded-full flex items-center justify-center shadow-inner shadow-cyan-500/20">
                    <Music size={16} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{displayStats.totalTracks}</p>
                    <p className="text-xs text-gray-400">Tracks</p>
                  </div>
                </div>
              </div>
              <div className="stat-card-blue bg-gray-900/70 backdrop-blur-sm rounded-lg p-3 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500/25 rounded-full flex items-center justify-center shadow-inner shadow-blue-500/20">
                    <AudioWaveform size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{displayStats.totalTransitions}</p>
                    <p className="text-xs text-gray-400">Mash Ups</p>
                  </div>
                </div>
              </div>
              <div className="stat-card-teal bg-gray-900/70 backdrop-blur-sm rounded-lg p-3 border border-teal-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-teal-500/25 rounded-full flex items-center justify-center shadow-inner shadow-teal-500/20">
                    <Clock size={16} className="text-teal-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{displayStats.hoursProduced.toFixed(1)}</p>
                    <p className="text-xs text-gray-400">Hours Mixed</p>
                  </div>
                </div>
              </div>
              <div className="stat-card-pink bg-gray-900/70 backdrop-blur-sm rounded-lg p-3 border border-pink-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-pink-500/25 rounded-full flex items-center justify-center shadow-inner shadow-pink-500/20">
                    <Sparkles size={16} className="text-pink-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{displayStats.totalBlends}</p>
                    <p className="text-xs text-gray-400">Total Mash Ups</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Equalizer Bars */}
            <div className="flex items-end gap-px mt-3 h-6 opacity-50">
              {eqBars.map((height, i) => {
                const pct = i / (EQ_BAR_COUNT - 1);
                const r = Math.round(0 + pct * 255);
                const g = Math.round(245 - pct * 200);
                const b = Math.round(255 - pct * 153);
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                      height: `${height}%`,
                      background: `rgb(${r},${g},${b})`,
                      transition: 'height 160ms ease',
                      minWidth: 0,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wide mb-2">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="group relative overflow-hidden bg-gray-900/70 backdrop-blur-sm hover:bg-gray-800/70 border border-gray-700/60 rounded-lg p-3 transition-all duration-300 hover:scale-105 hover:shadow-xl text-left"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  <div className="relative z-10">
                    <div className={`w-8 h-8 bg-gradient-to-br ${action.gradient} rounded-lg flex items-center justify-center mb-2 shadow-lg`}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-0.5">{action.title}</h3>
                    <p className="text-xs text-gray-400">{action.description}</p>
                    <div className="mt-2 flex items-center text-cyan-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Get started <ArrowRight size={12} className="ml-1" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <FeedSection />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Activity */}
          <div className="bg-gray-900/75 backdrop-blur-sm border border-gray-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity size={16} className="text-cyan-400" />
                Recent Activity
              </h2>
              <button className="text-cyan-400 text-xs hover:text-cyan-300 transition-colors">
                View All
              </button>
            </div>
            <div className="space-y-2">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-2 p-2 bg-gray-800/60 hover:bg-gray-700/70 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity size={12} className="text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-5">
                  <Activity size={24} className="text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No recent activity</p>
                  <p className="text-gray-600 text-xs mt-1">Start creating to see your activity here</p>
                </div>
              )}
            </div>
          </div>

          {/* Performance Analytics */}
          <div className="bg-gray-900/75 backdrop-blur-sm border border-gray-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-400" />
                This Week
              </h2>
            </div>
            <div className="space-y-2">
              <div className="bg-gray-800/60 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-400">Mash Ups Created</span>
                  <span className="text-sm font-bold text-white">{displayStats.totalTransitions}</span>
                </div>
                <div className="w-full bg-gray-700/60 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full" style={{ width: '75%' }} />
                </div>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-400">Tracks Uploaded</span>
                  <span className="text-sm font-bold text-white">{displayStats.totalTracks}</span>
                </div>
                <div className="w-full bg-gray-700/60 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-400">Mixing Streak</span>
                  <span className="text-sm font-bold text-white">7 days</span>
                </div>
                <div className="w-full bg-gray-700/60 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full" style={{ width: '90%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tracks */}
        {recentTracks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Music size={16} className="text-purple-400" />
                Recent Tracks
              </h2>
              <button
                onClick={() => onNavigate('library')}
                className="text-cyan-400 text-xs hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                View Library <ChevronRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {recentTracks.map((track) => (
                <div
                  key={track.id}
                  className="group bg-gray-900/70 backdrop-blur-sm border border-gray-700/60 rounded-lg p-2 hover:bg-gray-800/70 transition-all cursor-pointer"
                >
                  <div className="aspect-square bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg mb-2 flex items-center justify-center relative overflow-hidden">
                    <Music size={20} className="text-gray-600" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <Play size={12} className="text-gray-900 ml-0.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-white font-medium truncate">{track.original_name}</p>
                  {track.analysis?.bpm && (
                    <p className="text-xs text-gray-400 mt-0.5">{Math.round(track.analysis.bpm)} BPM</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Get Started Guide for New Users */}
        {stats.totalTracks === 0 && (
          <div className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white mb-1">Welcome to MySounds.AI</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Get started by uploading your first tracks. Our AI will analyze them and help you create seamless mash ups.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onNavigate('library')}
                    className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm rounded-lg font-medium transition-all duration-200 shadow-lg shadow-cyan-500/30"
                  >
                    Upload Tracks
                  </button>
                  <button
                    onClick={() => onNavigate('templates')}
                    className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg font-medium transition-all duration-200"
                  >
                    Browse Templates
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default HomeView;
