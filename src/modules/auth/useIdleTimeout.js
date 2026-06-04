import { useEffect, useRef, useCallback } from "react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
const WARN_AFTER_MS  = 18 * 60 * 1000; // 18 min → show warning
const LOGOUT_AFTER_MS = 20 * 60 * 1000; // 20 min → force logout

export function useIdleTimeout({ onWarn, onLogout, enabled = true }) {
  const warnTimer   = useRef(null);
  const logoutTimer = useRef(null);

  const reset = useCallback(() => {
    clearTimeout(warnTimer.current);
    clearTimeout(logoutTimer.current);
    warnTimer.current   = setTimeout(onWarn,   WARN_AFTER_MS);
    logoutTimer.current = setTimeout(onLogout, LOGOUT_AFTER_MS);
  }, [onWarn, onLogout]);

  useEffect(() => {
    if (!enabled) return;
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, reset, { passive: true })
    );
    reset();
    return () => {
      ACTIVITY_EVENTS.forEach((e) =>
        window.removeEventListener(e, reset)
      );
      clearTimeout(warnTimer.current);
      clearTimeout(logoutTimer.current);
    };
  }, [reset, enabled]);
}
