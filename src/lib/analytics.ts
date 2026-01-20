import { supabase } from './supabase';


export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
}

export interface ActivityLogEvent {
  type: string;
  data?: Record<string, any>;
  userId?: string;
}

class AnalyticsService {
  private sessionId: string;
  private isEnabled: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeSession();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private initializeSession() {
    // Track session start
    this.track('session_started', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }

  /**
   * Track client-side analytics event
   */
  async track(eventName: string, properties: Record<string, any> = {}, userId?: string): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const eventData = {
        user_id: userId || null,
        event_name: eventName,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          sessionId: this.sessionId,
          url: window.location.href,
          referrer: document.referrer || null
        },
        session_id: this.sessionId,
        page_url: window.location.href,
        referrer: document.referrer || null
      };

      // Try to insert directly into analytics_events table
      const { error } = await supabase
        .from('analytics_events')
        .insert(eventData);
      
      if (error) {
        console.warn('Analytics tracking failed:', error);
      }
    } catch (error) {
      console.warn('Analytics tracking error:', error);
    }
  }

  /**
   * Track user journey milestones
   */
  async trackMilestone(milestone: string, properties: Record<string, any> = {}, userId?: string): Promise<void> {
    await this.track(`milestone_${milestone}`, {
      ...properties,
      milestone: true,
      category: 'user_journey'
    }, userId);
  }

  /**
   * Track feature usage
   */
  async trackFeature(feature: string, action: string, properties: Record<string, any> = {}, userId?: string): Promise<void> {
    await this.track(`feature_${feature}_${action}`, {
      ...properties,
      feature,
      action,
      category: 'feature_usage'
    }, userId);
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(metric: string, value: number, properties: Record<string, any> = {}, userId?: string): Promise<void> {
    await this.track(`performance_${metric}`, {
      ...properties,
      metric,
      value,
      category: 'performance'
    }, userId);
  }

  /**
   * Track errors
   */
  async trackError(error: Error, context: string, properties: Record<string, any> = {}, userId?: string): Promise<void> {
    await this.track('error_occurred', {
      ...properties,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      category: 'error'
    }, userId);
  }

  /**
   * Disable analytics (for privacy compliance)
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * Enable analytics
   */
  enable(): void {
    this.isEnabled = true;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

class ActivityLogger {
  /**
   * Log server-side activity
   */
  async logActivity(
    eventType: string,
    eventData: Record<string, any> = {},
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const logData = {
        user_id: userId || null,
        event_type: eventType,
        event_data: eventData,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        session_id: analyticsService.getSessionId()
      };

      const { error } = await supabase
        .from('activity_logs')
        .insert(logData);
      
      if (error) {
        console.warn('Activity logging failed:', error);
      }
    } catch (error) {
      console.warn('Activity logging error:', error);
    }
  }

  /**
   * Log user authentication events
   */
  async logAuth(action: 'signup' | 'signin' | 'signout', userId?: string, metadata: Record<string, any> = {}): Promise<void> {
    await this.logActivity(`user_${action}`, {
      ...metadata,
      timestamp: new Date().toISOString()
    }, userId);
  }

  /**
   * Log project lifecycle events
   */
  async logProject(
    action: 'created' | 'updated' | 'deleted' | 'duplicated',
    projectId: string,
    userId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.logActivity(`project_${action}`, {
      projectId,
      ...metadata,
      timestamp: new Date().toISOString()
    }, userId);
  }

  /**
   * Log upload events
   */
  async logUpload(
    action: 'started' | 'completed' | 'failed',
    uploadId: string,
    userId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.logActivity(`upload_${action}`, {
      uploadId,
      ...metadata,
      timestamp: new Date().toISOString()
    }, userId);
  }

  /**
   * Log template events
   */
  async logTemplate(
    action: 'placed' | 'updated' | 'removed',
    templateId: string,
    userId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.logActivity(`template_${action}`, {
      templateId,
      ...metadata,
      timestamp: new Date().toISOString()
    }, userId);
  }

  /**
   * Log render events
   */
  async logRender(
    action: 'started' | 'completed' | 'failed',
    renderJobId: string,
    userId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.logActivity(`render_${action}`, {
      renderJobId,
      ...metadata,
      timestamp: new Date().toISOString()
    }, userId);
  }

  /**
   * Log credit events
   */
  async logCredits(
    action: 'consumed' | 'refunded',
    userId: string,
    amount: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.logActivity(`credits_${action}`, {
      amount,
      ...metadata,
      timestamp: new Date().toISOString()
    }, userId);
  }
}

// Singleton instances
export const analyticsService = new AnalyticsService();
export const activityLogger = new ActivityLogger();

// Convenience functions for common events
export const trackUploadSuccess = (userId: string, filename: string, duration: number) => {
  analyticsService.trackMilestone('upload_success', {
    filename,
    duration,
    fileType: filename.split('.').pop()
  }, userId);
};

export const trackTemplatePlaced = (userId: string, templateId: string, templateName: string) => {
  analyticsService.trackFeature('template', 'placed', {
    templateId,
    templateName
  }, userId);
};

export const trackExportStarted = (userId: string, format: string, quality: string) => {
  analyticsService.trackMilestone('export_started', {
    format,
    quality
  }, userId);
};

export const trackExportCompleted = (userId: string, format: string, quality: string, duration: number) => {
  analyticsService.trackMilestone('export_completed', {
    format,
    quality,
    renderDuration: duration
  }, userId);
};