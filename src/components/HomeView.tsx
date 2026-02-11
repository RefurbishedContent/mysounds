import React, { useState, useEffect } from 'react';
import { Music, AudioWaveform, Sliders, Upload, FileAudio, Clock, TrendingUp, Zap, Activity, Play, Download, Sparkles, ArrowRight, Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../lib/database';
import { storageService } from '../lib/storage';
import { FeedSection } from './feed';

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

const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onCreateNew }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<LibraryStats>({
    totalTracks: 0,
    totalTransitions: 0,
    totalMixSessions: 0,
    totalBlends: 0,
    hoursProduced: 0,
  });
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [recentTracks, setRecentTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

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
      description: `${stats.totalTracks} tracks in library`,
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
    <div className="h-full overflow-y-auto bg-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border border-gray-700 p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">
                    {getGreeting()}, {user?.name}
                  </h1>
                  <span className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-xs font-semibold text-white uppercase tracking-wide shadow-lg shadow-cyan-500/30">
                    {user?.plan}
                  </span>
                </div>
                <p className="text-gray-400">Ready to create something incredible?</p>
              </div>
              <button
                onClick={onCreateNew}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 flex items-center gap-2"
              >
                <Plus size={20} />
                Create New
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <Music size={20} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalTracks}</p>
                    <p className="text-xs text-gray-400">Tracks</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <AudioWaveform size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalTransitions}</p>
                    <p className="text-xs text-gray-400">Mash Ups</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Clock size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.hoursProduced.toFixed(1)}</p>
                    <p className="text-xs text-gray-400">Hours Mixed</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                    <Sparkles size={20} className="text-pink-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalBlends}</p>
                    <p className="text-xs text-gray-400">Total Mash Ups</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="group relative overflow-hidden bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl text-left"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  <div className="relative z-10">
                    <div className={`w-12 h-12 bg-gradient-to-br ${action.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{action.title}</h3>
                    <p className="text-sm text-gray-400">{action.description}</p>
                    <div className="mt-4 flex items-center text-cyan-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Get started <ArrowRight size={16} className="ml-1" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <FeedSection />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity size={20} className="text-cyan-400" />
                Recent Activity
              </h2>
              <button className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
                View All
              </button>
            </div>
            <div className="space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 bg-gray-750 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <Activity size={16} className="text-cyan-400" />
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
                <div className="text-center py-8">
                  <Activity size={32} className="text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No recent activity</p>
                  <p className="text-gray-600 text-xs mt-1">Start creating to see your activity here</p>
                </div>
              )}
            </div>
          </div>

          {/* Performance Analytics */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-400" />
                This Week
              </h2>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-750 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Mash Ups Created</span>
                  <span className="text-lg font-bold text-white">{stats.totalTransitions}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" style={{ width: '75%' }} />
                </div>
              </div>
              <div className="bg-gray-750 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Tracks Uploaded</span>
                  <span className="text-lg font-bold text-white">{stats.totalTracks}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
              <div className="bg-gray-750 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Mixing Streak</span>
                  <span className="text-lg font-bold text-white">7 days</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '90%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tracks */}
        {recentTracks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Music size={20} className="text-purple-400" />
                Recent Tracks
              </h2>
              <button
                onClick={() => onNavigate('library')}
                className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                View Library <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentTracks.map((track) => (
                <div
                  key={track.id}
                  className="group bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition-all cursor-pointer"
                >
                  <div className="aspect-square bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                    <Music size={32} className="text-gray-600" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                        <Play size={16} className="text-gray-900 ml-0.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-white font-medium truncate">{track.original_name}</p>
                  {track.analysis?.bpm && (
                    <p className="text-xs text-gray-400 mt-1">{Math.round(track.analysis.bpm)} BPM</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Get Started Guide for New Users */}
        {stats.totalTracks === 0 && (
          <div className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">Welcome to MySounds.AI</h3>
                <p className="text-gray-400 mb-4">
                  Get started by uploading your first tracks. Our AI will analyze them and help you create seamless mash ups.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => onNavigate('library')}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-cyan-500/30"
                  >
                    Upload Tracks
                  </button>
                  <button
                    onClick={() => onNavigate('templates')}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
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
