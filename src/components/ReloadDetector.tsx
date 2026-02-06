import { useEffect } from 'react';

const ReloadDetector = () => {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const hasUnsavedChanges = false;

      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (window.debugMonitor) {
          window.debugMonitor.logEvent('Page Became Visible', {
            timestamp: Date.now(),
          });
        }
      }
    };

    const handleFocus = () => {
      if (window.debugMonitor) {
        window.debugMonitor.logEvent('Window Focused', {
          timestamp: Date.now(),
        });
      }
    };

    const handleBlur = () => {
      if (window.debugMonitor) {
        window.debugMonitor.logEvent('Window Blurred', {
          timestamp: Date.now(),
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    const checkInterval = setInterval(() => {
      if (window.debugMonitor) {
        const logs = window.debugMonitor.getLogs();
        const reloadLogs = logs.filter(log => log.type === 'reload');

        if (reloadLogs.length > 3) {
          console.error(
            `⚠️ EXCESSIVE RELOADS DETECTED! The page has reloaded ${reloadLogs.length} times. This is abnormal and needs investigation.`
          );
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      clearInterval(checkInterval);
    };
  }, []);

  return null;
};

export default ReloadDetector;
