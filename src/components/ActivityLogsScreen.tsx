import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Activity, 
  Download, 
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Upload,
  Music,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ActivityLog {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  eventType: string;
  eventData: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  createdAt: string;
}

interface AnalyticsEvent {
  id: string;
  userId?: string;
  userName?: string;
  eventName: string;
  properties: Record<string, any>;
  sessionId?: string;
  pageUrl?: string;
  referrer?: string;
  createdAt: string;
}

const ActivityLogsScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'activity' | 'analytics'>('activity');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [dateRange, setDateRange] = useState('24h');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Check admin access
  const isAdmin = user?.plan === 'admin';

  const eventTypes = [
    'all',
    'user_signup',
    'user_signin',
    'project_created',
    'upload_completed',
    'template_placed',
    'render_started',
    'render_completed',
    'credits_consumed'
  ];

  const dateRanges = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' }
  ];

  // Load logs
  useEffect(() => {
    const loadLogs = async () => {
      if (!isAdmin) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Calculate date filter
        const now = new Date();
        const hoursBack = {
          '1h': 1,
          '24h': 24,
          '7d': 24 * 7,
          '30d': 24 * 30
        }[dateRange] || 24;
        
        const fromDate = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
        
        if (activeTab === 'activity') {
          const { data, error } = await supabase
            .from('activity_logs')
            .select(`
              *,
              user:users(name, email)
            `)
            .gte('created_at', fromDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(500);
            
          if (error) throw error;
          
          setActivityLogs(data.map((log: any) => ({
            id: log.id,
            userId: log.user_id,
            userName: log.user?.name,
            userEmail: log.user?.email,
            eventType: log.event_type,
            eventData: log.event_data || {},
            ipAddress: log.ip_address,
            userAgent: log.user_agent,
            sessionId: log.session_id,
            createdAt: log.created_at
          })));
        } else {
          const { data, error } = await supabase
            .from('analytics_events')
            .select(`
              *,
              user:users(name, email)
            `)
            .gte('created_at', fromDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(500);
            
          if (error) throw error;
          
          setAnalyticsEvents(data.map((event: any) => ({
            id: event.id,
            userId: event.user_id,
            userName: event.user?.name,
            eventName: event.event_name,
            properties: event.properties || {},
            sessionId: event.session_id,
            pageUrl: event.page_url,
            referrer: event.referrer,
            createdAt: event.created_at
          })));
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load logs');
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [isAdmin, activeTab, dateRange]);

  const filteredActivityLogs = activityLogs.filter(log => {
    const matchesSearch = log.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.userEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEventType = selectedEventType === 'all' || log.eventType === selectedEventType;
    const matchesUser = selectedUserId === 'all' || log.userId === selectedUserId;
    
    return matchesSearch && matchesEventType && matchesUser;
  });

  const filteredAnalyticsEvents = analyticsEvents.filter(event => {
    const matchesSearch = event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.userName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUser = selectedUserId === 'all' || event.userId === selectedUserId;
    
    return matchesSearch && matchesUser;
  });

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('user')) return <User size={16} className="text-blue-400" />;
    if (eventType.includes('project')) return <Music size={16} className="text-green-400" />;
    if (eventType.includes('upload')) return <Upload size={16} className="text-purple-400" />;
    if (eventType.includes('template')) return <Settings size={16} className="text-orange-400" />;
    if (eventType.includes('render')) return <Zap size={16} className="text-yellow-400" />;
    if (eventType.includes('credits')) return <Zap size={16} className="text-pink-400" />;
    return <Activity size={16} className="text-gray-400" />;
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes('failed') || eventType.includes('error')) return 'text-red-400';
    if (eventType.includes('completed') || eventType.includes('success')) return 'text-green-400';
    if (eventType.includes('started') || eventType.includes('processing')) return 'text-yellow-400';
    return 'text-gray-300';
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportLogs = () => {
    const data = activeTab === 'activity' ? filteredActivityLogs : filteredAnalyticsEvents;
    const csv = [
      // Headers
      activeTab === 'activity' 
        ? ['Timestamp', 'User', 'Event Type', 'IP Address', 'Session ID', 'Event Data']
        : ['Timestamp', 'User', 'Event Name', 'Page URL', 'Session ID', 'Properties'],
      // Data rows
      ...data.map(item => [
        item.createdAt,
        activeTab === 'activity' 
          ? (item as ActivityLog).userEmail || 'Anonymous'
          : (item as AnalyticsEvent).userName || 'Anonymous',
        activeTab === 'activity' 
          ? (item as ActivityLog).eventType
          : (item as AnalyticsEvent).eventName,
        activeTab === 'activity' 
          ? (item as ActivityLog).ipAddress || ''
          : (item as AnalyticsEvent).pageUrl || '',
        item.sessionId || '',
        JSON.stringify(
          activeTab === 'activity' 
            ? (item as ActivityLog).eventData
            : (item as AnalyticsEvent).properties
        )
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTab}_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-900/50 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Access Denied</h2>
          <p className="text-gray-400">Admin privileges required to access activity logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Activity Logs</h1>
          <p className="text-gray-400">Monitor system activity and user analytics</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-500 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportLogs}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            activeTab === 'activity'
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          Activity Logs
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            activeTab === 'analytics'
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          Analytics Events
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search events, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Event Type Filter */}
          {activeTab === 'activity' && (
            <div className="flex items-center space-x-2">
              <Filter size={18} className="text-gray-500" />
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              >
                {eventTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Events' : formatEventType(type)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range */}
          <div className="flex items-center space-x-2">
            <Calendar size={18} className="text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            >
              {dateRanges.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-end text-sm text-gray-400">
            {activeTab === 'activity' 
              ? `${filteredActivityLogs.length} activity logs`
              : `${filteredAnalyticsEvents.length} analytics events`
            }
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="glass-surface rounded-2xl p-12 text-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Loading Logs</h3>
            <p className="text-gray-400">Fetching system activity...</p>
          </div>
        ) : error ? (
          <div className="glass-surface rounded-2xl p-12 text-center">
            <div className="w-12 h-12 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Logs</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-200"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTab === 'activity' ? (
              filteredActivityLogs.length === 0 ? (
                <div className="glass-surface rounded-xl p-8 text-center">
                  <Activity size={32} className="text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Activity Found</h3>
                  <p className="text-gray-400">No activity logs match your current filters</p>
                </div>
              ) : (
                filteredActivityLogs.map((log) => (
                  <div key={log.id} className="glass-surface rounded-lg">
                    <button
                      onClick={() => toggleLogExpansion(log.id)}
                      className="w-full p-4 text-left hover:bg-gray-800/50 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getEventIcon(log.eventType)}
                          <div>
                            <div className={`font-medium ${getEventColor(log.eventType)}`}>
                              {formatEventType(log.eventType)}
                            </div>
                            <div className="text-sm text-gray-400">
                              {log.userName || log.userEmail || 'Anonymous'} • {formatDate(log.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 font-mono">
                            {log.sessionId?.slice(-8)}
                          </span>
                          {expandedLogs.has(log.id) ? (
                            <ChevronDown size={16} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                    </button>

                    {expandedLogs.has(log.id) && (
                      <div className="px-4 pb-4 border-t border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-300 mb-2">Event Details</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">User ID:</span>
                                <span className="text-white font-mono">{log.userId || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">IP Address:</span>
                                <span className="text-white font-mono">{log.ipAddress || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Session:</span>
                                <span className="text-white font-mono">{log.sessionId || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-300 mb-2">Event Data</h4>
                            <pre className="text-xs text-gray-400 bg-gray-900 rounded p-2 overflow-auto max-h-32">
                              {JSON.stringify(log.eventData, null, 2)}
                            </pre>
                          </div>
                        </div>
                        
                        {log.userAgent && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-300 mb-2">User Agent</h4>
                            <p className="text-xs text-gray-400 font-mono break-all">{log.userAgent}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )
            ) : (
              filteredAnalyticsEvents.length === 0 ? (
                <div className="glass-surface rounded-xl p-8 text-center">
                  <Activity size={32} className="text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Analytics Found</h3>
                  <p className="text-gray-400">No analytics events match your current filters</p>
                </div>
              ) : (
                filteredAnalyticsEvents.map((event) => (
                  <div key={event.id} className="glass-surface rounded-lg">
                    <button
                      onClick={() => toggleLogExpansion(event.id)}
                      className="w-full p-4 text-left hover:bg-gray-800/50 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Activity size={16} className="text-purple-400" />
                          <div>
                            <div className="font-medium text-white">
                              {event.eventName}
                            </div>
                            <div className="text-sm text-gray-400">
                              {event.userName || 'Anonymous'} • {formatDate(event.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 font-mono">
                            {event.sessionId?.slice(-8)}
                          </span>
                          {expandedLogs.has(event.id) ? (
                            <ChevronDown size={16} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                    </button>

                    {expandedLogs.has(event.id) && (
                      <div className="px-4 pb-4 border-t border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-300 mb-2">Event Details</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Page URL:</span>
                                <span className="text-white font-mono text-xs truncate max-w-32">
                                  {event.pageUrl || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Referrer:</span>
                                <span className="text-white font-mono text-xs truncate max-w-32">
                                  {event.referrer || 'Direct'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Session:</span>
                                <span className="text-white font-mono">{event.sessionId || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-300 mb-2">Properties</h4>
                            <pre className="text-xs text-gray-400 bg-gray-900 rounded p-2 overflow-auto max-h-32">
                              {JSON.stringify(event.properties, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogsScreen;