import { useEffect } from 'preact/hooks';

/** Tiene lo schermo acceso (Screen Wake Lock API) finché l'app è visibile. */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState === 'visible' && !cancelled) lock = await navigator.wakeLock.request('screen');
      } catch { /* può fallire con batteria scarsa o senza interazione: si riprova al prossimo evento */ }
    };
    const onVis = () => { if (document.visibilityState === 'visible') acquire(); };
    acquire();
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('pointerdown', onVis, { once: true });
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      lock?.release().catch(() => {});
    };
  }, [enabled]);
}

export const wakeLockSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator;
