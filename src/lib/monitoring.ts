import { supabase } from './supabase';
import { logActivity } from './analytics';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  metadata?: any;
}

export interface SystemHealth {
  queueDepth: number;
  activeJobs: number;
  failureRate: number;
  avgProcessingTime: number;
  memoryUsage: number;
  uptime: number;
}

class MonitoringService {
  private static instance: MonitoringService;
  private metrics: PerformanceMetric[] = [];
  private maxMetricsSize = 1000;
  private startTime = Date.now();

  private constructor() {
    setInterval(() => this.flushMetrics(), 60000);
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  async trackPerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const startTime = performance.now();
    let success = false;
    let error: any;

    try {
      const result = await fn();
      success = true;
      return result;
    } catch (e) {
      error = e;
      throw e;
    } finally {
      const duration = performance.now() - startTime;

      this.recordMetric({
        operation,
        duration,
        success,
        metadata: {
          ...metadata,
          error: error?.message
        }
      });
    }
  }

  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push({
      ...metric,
      metadata: {
        ...metric.metadata,
        timestamp: Date.now()
      }
    });

    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics.shift();
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const { data: queuedJobs } = await supabase
      .from('render_jobs')
      .select('id', { count: 'exact' })
      .eq('status', 'queued');

    const { data: activeJobs } = await supabase
      .from('render_jobs')
      .select('id', { count: 'exact' })
      .eq('status', 'processing');

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: recentJobs } = await supabase
      .from('render_jobs')
      .select('status, started_at, completed_at')
      .gte('created_at', oneHourAgo);

    const totalJobs = recentJobs?.length || 0;
    const failedJobs = recentJobs?.filter(job => job.status === 'failed').length || 0;
    const failureRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0;

    const completedJobs = recentJobs?.filter(job => job.status === 'completed') || [];
    let avgProcessingTime = 0;

    if (completedJobs.length > 0) {
      const totalTime = completedJobs.reduce((sum, job) => {
        if (job.started_at && job.completed_at) {
          return sum + (new Date(job.completed_at).getTime() - new Date(job.started_at).getTime());
        }
        return sum;
      }, 0);
      avgProcessingTime = totalTime / completedJobs.length;
    }

    const memoryUsage = performance.memory
      ? performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
      : 0;

    return {
      queueDepth: queuedJobs?.length || 0,
      activeJobs: activeJobs?.length || 0,
      failureRate,
      avgProcessingTime,
      memoryUsage,
      uptime: Date.now() - this.startTime
    };
  }

  async logError(
    userId: string,
    error: Error,
    context?: any
  ): Promise<void> {
    console.error('Application error:', error, context);

    await logActivity(userId, 'error', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  async logWarning(
    userId: string,
    message: string,
    context?: any
  ): Promise<void> {
    console.warn('Application warning:', message, context);

    await logActivity(userId, 'warning', {
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  getMetricsSummary(): {
    totalOperations: number;
    successRate: number;
    avgDuration: number;
    operationBreakdown: Record<string, { count: number; avgDuration: number; successRate: number }>;
  } {
    const totalOperations = this.metrics.length;
    const successfulOps = this.metrics.filter(m => m.success).length;
    const successRate = totalOperations > 0 ? (successfulOps / totalOperations) * 100 : 0;

    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const avgDuration = totalOperations > 0 ? totalDuration / totalOperations : 0;

    const operationBreakdown: Record<string, { count: number; avgDuration: number; successRate: number }> = {};

    for (const metric of this.metrics) {
      if (!operationBreakdown[metric.operation]) {
        operationBreakdown[metric.operation] = {
          count: 0,
          avgDuration: 0,
          successRate: 0
        };
      }

      const breakdown = operationBreakdown[metric.operation];
      breakdown.count++;
      breakdown.avgDuration = ((breakdown.avgDuration * (breakdown.count - 1)) + metric.duration) / breakdown.count;
    }

    for (const operation in operationBreakdown) {
      const opMetrics = this.metrics.filter(m => m.operation === operation);
      const opSuccessful = opMetrics.filter(m => m.success).length;
      operationBreakdown[operation].successRate = (opSuccessful / opMetrics.length) * 100;
    }

    return {
      totalOperations,
      successRate,
      avgDuration,
      operationBreakdown
    };
  }

  private async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;

    const summary = this.getMetricsSummary();

    try {
      await logActivity('system', 'metrics_flush', {
        summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  async checkSystemAlerts(): Promise<{
    alerts: Array<{ severity: 'low' | 'medium' | 'high'; message: string }>;
  }> {
    const alerts: Array<{ severity: 'low' | 'medium' | 'high'; message: string }> = [];
    const health = await this.getSystemHealth();

    if (health.queueDepth > 50) {
      alerts.push({
        severity: 'high',
        message: `High queue depth: ${health.queueDepth} jobs waiting`
      });
    }

    if (health.failureRate > 20) {
      alerts.push({
        severity: 'high',
        message: `High failure rate: ${health.failureRate.toFixed(1)}%`
      });
    }

    if (health.avgProcessingTime > 300000) {
      alerts.push({
        severity: 'medium',
        message: `Slow processing: Average ${(health.avgProcessingTime / 1000).toFixed(1)}s per job`
      });
    }

    if (health.memoryUsage > 0.8) {
      alerts.push({
        severity: 'medium',
        message: `High memory usage: ${(health.memoryUsage * 100).toFixed(1)}%`
      });
    }

    return { alerts };
  }
}

export const monitoring = MonitoringService.getInstance();
