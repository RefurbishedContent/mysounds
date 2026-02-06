# Debug Tools - Quick Reference

## Keyboard Shortcuts

- `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (Mac) - Open debug panel

## Debug Monitor API

### Available Globally

```javascript
// Access the debug monitor
window.debugMonitor

// Log custom events
window.debugMonitor.logEvent('Button Clicked', { buttonId: 'save' });

// Log errors
window.debugMonitor.logError('Save failed', error, { userId: '123' });

// Get all logs
const logs = window.debugMonitor.getLogs();

// Export logs as JSON
const jsonLogs = window.debugMonitor.exportLogs();

// Clear all logs
window.debugMonitor.clearLogs();
```

## Session Persistence API

### Available Globally

```javascript
// Access session persistence
window.sessionPersistence

// Save current state
window.sessionPersistence.saveState({
  currentView: 'editor',
  editingProjectId: '123',
  selectedTemplateId: '456',
  playbackPosition: 45.2
});

// Get saved state
const state = window.sessionPersistence.getState();

// Clear saved state
window.sessionPersistence.clearState();

// Listen for session restore
window.addEventListener('session:restore', (event) => {
  console.log('Restoring session:', event.detail);
});
```

## Console Messages to Watch For

### Good Signs ✅

- "🚀 App initialized with reload detection and debugging enabled"
- "📊 Press Ctrl+Shift+D to open debug panel"
- "Starting auth check..."
- "Session found for user: [email]"

### Warning Signs ⚠️

- "⚠️ RELOAD HISTORY DETECTED! This page has been reloaded X times"
- "🔄 Unexpected reload detected! Session state is available for recovery"
- "Auth check timed out after 5 seconds"
- "⚠️ EXCESSIVE RELOADS DETECTED!"

### Error Signs ❌

- "Unhandled Error: ..."
- "Unhandled Promise Rejection: ..."
- "React Error Boundary: ..."
- Multiple rapid console errors

## Debug Panel Features

### Main View
- **Total Logs:** Shows how many events have been logged
- **Reload Attempts:** Counter showing page reloads in this session
- **Close Button:** Close the debug panel
- **Clear Logs Button:** Delete all logs and reset counters
- **Export Logs Button:** Download logs as JSON file

### Log Entry Details
Each log shows:
- **Timestamp:** When the event occurred
- **Type:** log, warn, error, info, event, or reload
- **Message:** The main log message
- **Details:** Expandable section with additional data
- **Stack Trace:** For errors, shows where the error occurred

## Common Debugging Scenarios

### Scenario 1: App Reloaded Unexpectedly

1. Press `Ctrl+Shift+D` immediately
2. Check the "Reload Attempts" counter
3. Look at the last few log entries before the reload
4. Export logs if needed for analysis
5. Look for errors or warnings

### Scenario 2: App is Slow or Freezing

1. Open debug panel
2. Look for repeated error messages
3. Check for infinite loop indicators (same log repeating rapidly)
4. Export logs to analyze patterns

### Scenario 3: Lost Progress After Reload

1. Check if you got a session recovery prompt
2. If not, the state may not have been saved
3. Enable auto-save in your components using session persistence
4. Test by manually reloading and checking recovery

### Scenario 4: Want to Report a Bug

1. Reproduce the bug
2. Open debug panel with `Ctrl+Shift+D`
3. Click "Export Logs"
4. Save the JSON file
5. Attach to bug report with steps to reproduce

## Integration Examples

### Save State in Your Component

```typescript
import { useEffect } from 'react';

function MyEditor({ projectId }) {
  useEffect(() => {
    // Save state when it changes
    window.sessionPersistence?.saveState({
      currentView: 'editor',
      editingProjectId: projectId
    });
  }, [projectId]);

  return <div>Editor content</div>;
}
```

### Log Custom Events

```typescript
function SaveButton() {
  const handleSave = async () => {
    window.debugMonitor?.logEvent('Save Initiated');

    try {
      await saveData();
      window.debugMonitor?.logEvent('Save Successful');
    } catch (error) {
      window.debugMonitor?.logError('Save Failed', error);
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

### Restore Session on Mount

```typescript
function App() {
  useEffect(() => {
    const handleSessionRestore = (event: CustomEvent) => {
      const state = event.detail;

      // Restore your app state
      if (state.editingProjectId) {
        openProject(state.editingProjectId);
      }
    };

    window.addEventListener('session:restore', handleSessionRestore);
    return () => window.removeEventListener('session:restore', handleSessionRestore);
  }, []);

  return <div>App content</div>;
}
```

## Tips

1. **Keep Debug Panel Open During Development:** Monitor logs in real-time
2. **Export Logs Regularly:** Save logs when you encounter issues
3. **Check Reload Counter:** A high number indicates a problem
4. **Use Custom Events:** Log important user actions for better debugging
5. **Session State:** Always save critical state to prevent data loss

## Troubleshooting

### Debug Panel Won't Open

- Check browser console for errors
- Verify keyboard shortcut is correct (Ctrl+Shift+D)
- Make sure the app is loaded and running

### Logs Not Being Captured

- Check if `window.debugMonitor` exists in console
- Verify the debug monitor was initialized (check imports in App.tsx)
- Look for initialization errors in browser console

### Session Not Restoring

- Check localStorage is enabled in your browser
- Verify state was saved (check localStorage for 'app_session_state')
- Make sure reload happened within 5 minutes (state expires after that)
- Check browser console for session restore errors

## Browser Console Commands

Quick commands to run in browser console:

```javascript
// Check if debug tools are loaded
console.log('Debug Monitor:', !!window.debugMonitor);
console.log('Session Persistence:', !!window.sessionPersistence);

// View current session state
console.log(window.sessionPersistence?.getState());

// View recent logs
console.table(window.debugMonitor?.getLogs().slice(-10));

// Force save current state
window.sessionPersistence?.saveState({ test: true });

// Check reload count
const logs = window.debugMonitor?.getLogs();
const reloadLogs = logs?.filter(l => l.type === 'reload');
console.log('Reload count:', reloadLogs?.length || 0);
```
