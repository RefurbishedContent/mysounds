interface SessionState {
  timestamp: number;
  currentView?: string;
  editingProjectId?: string;
  selectedTemplateId?: string;
  transitionSongA?: any;
  transitionSongB?: any;
  editingTransitionId?: string;
  activeMixSessionId?: string;
  playbackPosition?: number;
  formData?: Record<string, any>;
}

const SESSION_INITIALIZED_KEY = '__sessionPersistenceInitialized__';

class SessionPersistence {
  private readonly STORAGE_KEY = 'app_session_state';
  private readonly MAX_AGE_MS = 5 * 60 * 1000;
  private autoSaveInterval: number | null = null;
  private currentState: SessionState | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;
    if (this.initialized || (window as any)[SESSION_INITIALIZED_KEY]) return;
    this.initialized = true;
    (window as any)[SESSION_INITIALIZED_KEY] = true;

    this.checkForRecovery();
    this.setupAutoSave();
    this.setupUnloadHandler();
    this.setupHMRBoundary();
  }

  private setupHMRBoundary() {
    if (import.meta.hot) {
      import.meta.hot.accept(() => {
        console.info('[SessionPersistence] Module hot-updated without full reload');
      });
    }
  }

  private checkForRecovery() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const state: SessionState = JSON.parse(stored);
      const age = Date.now() - state.timestamp;

      if (age < this.MAX_AGE_MS && age > 2000) {
        console.warn('🔄 Unexpected reload detected! Session state is available for recovery.');
        console.info('Age:', Math.round(age / 1000), 'seconds');

        if (window.debugMonitor) {
          window.debugMonitor.logEvent('Session Recovery Available', {
            age: Math.round(age / 1000),
            state,
          });
        }

        this.showRecoveryPrompt(state);
      } else if (age >= this.MAX_AGE_MS) {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to check for session recovery:', error);
    }
  }

  private showRecoveryPrompt(state: SessionState) {
    const shouldRestore = confirm(
      'It looks like the app was unexpectedly reloaded. Would you like to restore your previous session?'
    );

    if (shouldRestore) {
      this.currentState = state;
      window.dispatchEvent(
        new CustomEvent('session:restore', { detail: state })
      );
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  public saveState(partialState: Partial<SessionState>) {
    try {
      this.currentState = {
        ...this.currentState,
        ...partialState,
        timestamp: Date.now(),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentState));
    } catch (error) {
      console.error('Failed to save session state:', error);
    }
  }

  public getState(): SessionState | null {
    return this.currentState;
  }

  public clearState() {
    this.currentState = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private setupAutoSave() {
    this.autoSaveInterval = window.setInterval(() => {
      if (this.currentState) {
        this.saveState({});
      }
    }, 30000);
  }

  private setupUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      if (this.currentState) {
        this.saveState({});
      }
    });
  }

  public destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }
}

const sessionPersistence = new SessionPersistence();

declare global {
  interface Window {
    sessionPersistence: SessionPersistence;
  }
}

window.sessionPersistence = sessionPersistence;

export default sessionPersistence;
