"use client";

import { useEffect, useRef } from "react";

export function useScreenWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let cancelled = false;

    const acquire = async () => {
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
      } catch {
        // Unsupported, denied, or no user gesture — silent noop.
      }
    };

    const onVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        (sentinelRef.current === null || sentinelRef.current.released)
      ) {
        sentinelRef.current = null;
        void acquire();
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel && !sentinel.released) {
        sentinel.release().catch(() => {});
      }
    };
  }, [enabled]);
}
