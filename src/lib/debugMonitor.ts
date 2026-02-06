interface DebugLog {
  timestamp: number;
  type: 'log' | 'warn' | 'error' | 'info' | 'event' | 'reload';
  message: string;
  data?: any;
  stack?: string;
}

interface DebugMonitorState {
  logs: DebugLog[];
  maxLogs: number;
  enabled: boolean;
  reloadAttempts: number;
}

class DebugMonitor {
  private state: DebugMonitorState = {
    logs: [],
    maxLogs: 500,
    enabled: true,
    reloadAttempts: 0,
  };

  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    this.interceptConsole();
    this.trackReloadEvents();
    this.trackUnhandledErrors();
    this.restoreState();
    this.setupKeyboardShortcut();
  }

  private interceptConsole() {
    console.log = (...args: any[]) => {
      this.originalConsole.log(...args);
      this.addLog('log', this.formatArgs(args));
    };

    console.warn = (...args: any[]) => {
      this.originalConsole.warn(...args);
      this.addLog('warn', this.formatArgs(args));
    };

    console.error = (...args: any[]) => {
      this.originalConsole.error(...args);
      this.addLog('error', this.formatArgs(args), args[0]);
    };

    console.info = (...args: any[]) => {
      this.originalConsole.info(...args);
      this.addLog('info', this.formatArgs(args));
    };
  }

  private formatArgs(args: any[]): string {
    return args
      .map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');
  }

  private trackReloadEvents() {
    window.addEventListener('beforeunload', (event) => {
      this.state.reloadAttempts++;

      const reloadLog: DebugLog = {
        timestamp: Date.now(),
        type: 'reload',
        message: 'Page reload detected',
        data: {
          attempt: this.state.reloadAttempts,
          stack: new Error().stack,
        },
      };

      this.state.logs.push(reloadLog);
      this.persistState();

      this.originalConsole.warn('🔄 RELOAD DETECTED! Attempt #', this.state.reloadAttempts);
      this.originalConsole.warn('Stack trace:', new Error().stack);
    });

    window.addEventListener('unload', () => {
      this.persistState();
    });
  }

  private trackUnhandledErrors() {
    window.addEventListener('error', (event) => {
      this.addLog('error', `Unhandled Error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', `Unhandled Promise Rejection: ${event.reason}`, {
        reason: event.reason,
        promise: event.promise,
      });
    });
  }

  private setupKeyboardShortcut() {
    window.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        this.showDebugPanel();
      }
    });
  }

  private addLog(type: DebugLog['type'], message: string, data?: any) {
    if (!this.state.enabled) return;

    const log: DebugLog = {
      timestamp: Date.now(),
      type,
      message,
      data,
      stack: type === 'error' && data instanceof Error ? data.stack : undefined,
    };

    this.state.logs.push(log);

    if (this.state.logs.length > this.state.maxLogs) {
      this.state.logs = this.state.logs.slice(-this.state.maxLogs);
    }
  }

  public logEvent(eventName: string, data?: any) {
    this.addLog('event', eventName, data);
  }

  public logError(message: string, error?: Error, data?: any) {
    this.addLog('error', message, { error, ...data });
  }

  private persistState() {
    try {
      const dataToStore = {
        logs: this.state.logs.slice(-100),
        reloadAttempts: this.state.reloadAttempts,
        lastUpdate: Date.now(),
      };
      localStorage.setItem('debug_monitor_state', JSON.stringify(dataToStore));
    } catch (error) {
      this.originalConsole.error('Failed to persist debug state:', error);
    }
  }

  private restoreState() {
    try {
      const stored = localStorage.getItem('debug_monitor_state');
      if (stored) {
        const data = JSON.parse(stored);

        const timeSinceLastUpdate = Date.now() - (data.lastUpdate || 0);
        if (timeSinceLastUpdate < 60000) {
          this.state.logs = data.logs || [];
          this.state.reloadAttempts = data.reloadAttempts || 0;

          if (this.state.reloadAttempts > 0) {
            this.originalConsole.warn(
              `⚠️ RELOAD HISTORY DETECTED! This page has been reloaded ${this.state.reloadAttempts} times in this session.`
            );
            this.originalConsole.info('Press Ctrl+Shift+D to view debug logs');
          }
        } else {
          localStorage.removeItem('debug_monitor_state');
        }
      }
    } catch (error) {
      this.originalConsole.error('Failed to restore debug state:', error);
    }
  }

  public getLogs(): DebugLog[] {
    return [...this.state.logs];
  }

  public clearLogs() {
    this.state.logs = [];
    this.state.reloadAttempts = 0;
    localStorage.removeItem('debug_monitor_state');
  }

  public exportLogs(): string {
    return JSON.stringify(
      {
        logs: this.state.logs,
        reloadAttempts: this.state.reloadAttempts,
        exportedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
      },
      null,
      2
    );
  }

  private showDebugPanel() {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 999999;
      overflow: auto;
      color: #fff;
      font-family: monospace;
      font-size: 12px;
      padding: 20px;
    `;

    const content = `
      <div style="max-width: 1200px; margin: 0 auto;">
        <div style="position: sticky; top: 0; background: rgba(0, 0, 0, 0.95); padding: 10px 0; border-bottom: 2px solid #333; margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px 0; color: #0ea5e9;">Debug Monitor</h2>
          <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <button id="closeDebug" style="padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
            <button id="clearLogs" style="padding: 8px 16px; background: #0ea5e9; color: white; border: none; border-radius: 4px; cursor: pointer;">Clear Logs</button>
            <button id="exportLogs" style="padding: 8px 16px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer;">Export Logs</button>
          </div>
          <div style="color: #f59e0b; margin-bottom: 10px;">
            <strong>Total Logs:</strong> ${this.state.logs.length} |
            <strong>Reload Attempts:</strong> ${this.state.reloadAttempts} |
            <strong>Shortcut:</strong> Ctrl+Shift+D
          </div>
        </div>
        <div id="logContainer">
          ${this.renderLogs()}
        </div>
      </div>
    `;

    panel.innerHTML = content;
    document.body.appendChild(panel);

    document.getElementById('closeDebug')?.addEventListener('click', () => {
      document.body.removeChild(panel);
    });

    document.getElementById('clearLogs')?.addEventListener('click', () => {
      this.clearLogs();
      document.body.removeChild(panel);
      this.showDebugPanel();
    });

    document.getElementById('exportLogs')?.addEventListener('click', () => {
      const logs = this.exportLogs();
      const blob = new Blob([logs], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-logs-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  private renderLogs(): string {
    return this.state.logs
      .slice()
      .reverse()
      .map((log) => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        const color = {
          log: '#9ca3af',
          warn: '#f59e0b',
          error: '#ef4444',
          info: '#0ea5e9',
          event: '#8b5cf6',
          reload: '#dc2626',
        }[log.type];

        return `
          <div style="margin-bottom: 10px; padding: 10px; background: #1f2937; border-left: 4px solid ${color}; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="color: ${color}; font-weight: bold; text-transform: uppercase;">${log.type}</span>
              <span style="color: #6b7280;">${time}</span>
            </div>
            <div style="color: #e5e7eb; white-space: pre-wrap; word-break: break-word;">${this.escapeHtml(log.message)}</div>
            ${
              log.data
                ? `<details style="margin-top: 5px;">
                    <summary style="cursor: pointer; color: #9ca3af;">View Details</summary>
                    <pre style="margin-top: 5px; padding: 10px; background: #111827; border-radius: 4px; overflow: auto; max-height: 300px;">${this.escapeHtml(JSON.stringify(log.data, null, 2))}</pre>
                  </details>`
                : ''
            }
            ${
              log.stack
                ? `<details style="margin-top: 5px;">
                    <summary style="cursor: pointer; color: #9ca3af;">Stack Trace</summary>
                    <pre style="margin-top: 5px; padding: 10px; background: #111827; border-radius: 4px; overflow: auto; max-height: 300px; font-size: 11px;">${this.escapeHtml(log.stack)}</pre>
                  </details>`
                : ''
            }
          </div>
        `;
      })
      .join('');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

const debugMonitor = new DebugMonitor();

declare global {
  interface Window {
    debugMonitor: DebugMonitor;
  }
}

window.debugMonitor = debugMonitor;

export default debugMonitor;
