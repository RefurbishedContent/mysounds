interface HMREvent {
  timestamp: number;
  type: 'update' | 'full-reload' | 'error' | 'prune' | 'connected' | 'disconnected';
  code: string;
  files?: string[];
  message?: string;
}

interface HMRTrackerState {
  events: HMREvent[];
  fullReloadCount: number;
  hotUpdateCount: number;
  lastFullReloadFile: string | null;
  sessionStart: number;
}

const HMR_CODES = {
  UPDATE_SUCCESS: 'HMR-001',
  FULL_RELOAD_TRIGGERED: 'HMR-002',
  UPDATE_FAILED: 'HMR-003',
  NO_BOUNDARY: 'HMR-004',
  CIRCULAR_DEPENDENCY: 'HMR-005',
  CONNECTION_LOST: 'HMR-006',
  CONNECTION_RESTORED: 'HMR-007',
  MODULE_PRUNED: 'HMR-008',
} as const;

class HMRTracker {
  private state: HMRTrackerState = {
    events: [],
    fullReloadCount: 0,
    hotUpdateCount: 0,
    lastFullReloadFile: null,
    sessionStart: Date.now(),
  };

  private maxEvents = 100;
  private initialized = false;

  constructor() {
    if (typeof window !== 'undefined' && import.meta.hot) {
      this.initialize();
    }
  }

  private initialize() {
    if (this.initialized) return;
    this.initialized = true;

    this.restoreState();
    this.setupViteHMRListeners();
    this.setupWindowListeners();
  }

  private setupViteHMRListeners() {
    if (!import.meta.hot) return;

    import.meta.hot.on('vite:beforeUpdate', (payload) => {
      const files = payload.updates?.map((u: { path: string }) => u.path) || [];
      this.addEvent('update', HMR_CODES.UPDATE_SUCCESS, files, 'HMR update starting');
      this.state.hotUpdateCount++;
      console.info(`[HMR-001] Hot update: ${files.join(', ')}`);
    });

    import.meta.hot.on('vite:afterUpdate', (payload) => {
      const files = payload.updates?.map((u: { path: string }) => u.path) || [];
      console.info(`[HMR-001] Hot update complete: ${files.join(', ')}`);
    });

    import.meta.hot.on('vite:beforeFullReload', (payload) => {
      this.state.fullReloadCount++;
      const file = payload?.path || 'unknown';
      this.state.lastFullReloadFile = file;
      this.addEvent('full-reload', HMR_CODES.FULL_RELOAD_TRIGGERED, [file], 'Full page reload triggered');
      this.persistState();
      console.warn(`[HMR-002] FULL RELOAD triggered by: ${file}`);
      console.warn(`[HMR-002] Total full reloads this session: ${this.state.fullReloadCount}`);
    });

    import.meta.hot.on('vite:error', (payload) => {
      this.addEvent('error', HMR_CODES.UPDATE_FAILED, [], payload.err?.message || 'HMR error');
      console.error(`[HMR-003] HMR Error:`, payload.err);
    });

    import.meta.hot.on('vite:ws:connect', () => {
      this.addEvent('connected', HMR_CODES.CONNECTION_RESTORED, [], 'HMR WebSocket connected');
      console.info('[HMR-007] HMR WebSocket connected');
    });

    import.meta.hot.on('vite:ws:disconnect', () => {
      this.addEvent('disconnected', HMR_CODES.CONNECTION_LOST, [], 'HMR WebSocket disconnected');
      console.warn('[HMR-006] HMR WebSocket disconnected');
    });

    import.meta.hot.accept(() => {
      console.info('[HMR] hmrTracker module accepted hot update');
    });
  }

  private setupWindowListeners() {
    window.addEventListener('beforeunload', () => {
      this.persistState();
    });
  }

  private addEvent(type: HMREvent['type'], code: string, files?: string[], message?: string) {
    const event: HMREvent = {
      timestamp: Date.now(),
      type,
      code,
      files,
      message,
    };

    this.state.events.push(event);

    if (this.state.events.length > this.maxEvents) {
      this.state.events = this.state.events.slice(-this.maxEvents);
    }
  }

  private persistState() {
    try {
      localStorage.setItem('hmr_tracker_state', JSON.stringify({
        ...this.state,
        persistedAt: Date.now(),
      }));
    } catch (e) {
      console.error('Failed to persist HMR tracker state:', e);
    }
  }

  private restoreState() {
    try {
      const stored = localStorage.getItem('hmr_tracker_state');
      if (stored) {
        const data = JSON.parse(stored);
        const timeSincePersist = Date.now() - (data.persistedAt || 0);

        if (timeSincePersist < 30000) {
          this.state.fullReloadCount = data.fullReloadCount || 0;
          this.state.lastFullReloadFile = data.lastFullReloadFile;

          if (this.state.fullReloadCount > 0) {
            console.warn(`[HMR-002] Previous session had ${this.state.fullReloadCount} full reload(s)`);
            if (this.state.lastFullReloadFile) {
              console.warn(`[HMR-002] Last reload triggered by: ${this.state.lastFullReloadFile}`);
            }
          }
        } else {
          localStorage.removeItem('hmr_tracker_state');
        }
      }
    } catch (e) {
      console.error('Failed to restore HMR tracker state:', e);
    }
  }

  public getStats() {
    return {
      fullReloadCount: this.state.fullReloadCount,
      hotUpdateCount: this.state.hotUpdateCount,
      lastFullReloadFile: this.state.lastFullReloadFile,
      sessionDuration: Date.now() - this.state.sessionStart,
      recentEvents: this.state.events.slice(-10),
    };
  }

  public clearStats() {
    this.state = {
      events: [],
      fullReloadCount: 0,
      hotUpdateCount: 0,
      lastFullReloadFile: null,
      sessionStart: Date.now(),
    };
    localStorage.removeItem('hmr_tracker_state');
  }
}

const hmrTracker = new HMRTracker();

declare global {
  interface Window {
    hmrTracker: HMRTracker;
  }
}

if (typeof window !== 'undefined') {
  window.hmrTracker = hmrTracker;
}

export default hmrTracker;
