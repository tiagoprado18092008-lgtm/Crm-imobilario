import { automationEngine } from '../utils/automation.engine';

let handle: ReturnType<typeof setInterval> | null = null;

export function startAutomationCron(): void {
  if (handle) return; // idempotent

  const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  handle = setInterval(async () => {
    try {
      await automationEngine.resumeDelayedEnrollments();
    } catch (err: any) {
      console.error('[AutomationCron] Error resuming delayed enrollments:', err.message);
    }
  }, INTERVAL_MS);

  console.log('[AutomationCron] Started — checking delayed enrollments every 5 minutes');
}

export function stopAutomationCron(): void {
  if (handle) {
    clearInterval(handle);
    handle = null;
    console.log('[AutomationCron] Stopped');
  }
}
