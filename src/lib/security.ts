import { supabase } from './supabase';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class SecurityManager {
  private static instance: SecurityManager;
  private rateLimitStore: Map<string, RateLimitEntry> = new Map();
  private blockedIPs: Set<string> = new Set();

  private constructor() {
    setInterval(() => this.cleanupExpiredEntries(), 60000);
  }

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  async validateSession(token: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return { valid: false, error: 'Invalid or expired session' };
      }

      return { valid: true, userId: user.id };
    } catch (error) {
      return { valid: false, error: 'Session validation failed' };
    }
  }

  async checkRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const entry = this.rateLimitStore.get(identifier);

    if (!entry || now > entry.resetTime) {
      this.rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }

    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    entry.count++;

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  async checkRenderLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const renderLimit = await this.checkRateLimit(`render:${userId}`, {
      maxRequests: 10,
      windowMs: 3600000
    });

    if (!renderLimit.allowed) {
      return {
        allowed: false,
        reason: 'Render limit exceeded. Please try again later.'
      };
    }

    const { data: credits } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', userId)
      .single();

    if (!credits || credits.credits < 1) {
      return {
        allowed: false,
        reason: 'Insufficient credits'
      };
    }

    return { allowed: true };
  }

  async checkUploadLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const uploadLimit = await this.checkRateLimit(`upload:${userId}`, {
      maxRequests: 50,
      windowMs: 3600000
    });

    if (!uploadLimit.allowed) {
      return {
        allowed: false,
        reason: 'Upload limit exceeded. Please try again later.'
      };
    }

    return { allowed: true };
  }

  async validateFileUpload(file: File): Promise<{ valid: boolean; error?: string }> {
    const maxSize = 100 * 1024 * 1024;
    const allowedTypes = [
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'audio/mp3',
      'audio/flac',
      'audio/ogg',
      'audio/aac'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 100MB limit' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Only audio files are allowed.' };
    }

    return { valid: true };
  }

  async logSecurityEvent(
    userId: string,
    eventType: string,
    details: any
  ): Promise<void> {
    try {
      await supabase.rpc('log_activity', {
        p_user_id: userId,
        p_event_type: `security:${eventType}`,
        p_event_data: {
          ...details,
          timestamp: new Date().toISOString()
        },
        p_session_id: `security_${Date.now()}`
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  blockIP(ip: string): void {
    this.blockedIPs.add(ip);
  }

  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
  }

  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  async validateProjectAccess(userId: string, projectId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    return !error && !!data;
  }

  sanitizeInput(input: string): string {
    return input
      .replace(/[<>'"]/g, '')
      .trim()
      .slice(0, 1000);
  }

  async checkSuspiciousActivity(userId: string): Promise<{ suspicious: boolean; reason?: string }> {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    const { data: recentActivity } = await supabase
      .from('render_jobs')
      .select('id, status, created_at')
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo);

    if (recentActivity && recentActivity.length > 20) {
      return {
        suspicious: true,
        reason: 'Unusual activity detected'
      };
    }

    const failedJobs = recentActivity?.filter(job => job.status === 'failed').length || 0;
    if (failedJobs > 10) {
      return {
        suspicious: true,
        reason: 'High failure rate detected'
      };
    }

    return { suspicious: false };
  }
}

export const security = SecurityManager.getInstance();

export const rateLimitConfigs = {
  render: { maxRequests: 10, windowMs: 3600000 },
  upload: { maxRequests: 50, windowMs: 3600000 },
  api: { maxRequests: 100, windowMs: 60000 },
  auth: { maxRequests: 5, windowMs: 300000 }
};
