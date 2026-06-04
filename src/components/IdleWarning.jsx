import { useEffect, useState } from "react";

const COUNTDOWN_SECONDS = 120; // 2 minutes

export default function IdleWarning({ onStay, onLogout }) {
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    const t = setInterval(
      () => setRemaining((s) => (s > 0 ? s - 1 : 0)),
      1000
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (remaining === 0) onLogout();
  }, [remaining, onLogout]);

  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.heading}>Session Expiring Soon</h2>
        <p style={styles.body}>
          You've been inactive for a while. For security, you will be signed
          out automatically in:
        </p>
        <div style={styles.countdown}>
          {minutes}:{seconds}
        </div>
        <div style={styles.actions}>
          <button style={styles.stayBtn} onClick={onStay}>
            Stay Signed In
          </button>
          <button style={styles.logoutBtn} onClick={onLogout}>
            Sign Out Now
          </button>
        </div>
        <p style={styles.hint}>
          Any mouse movement or key press resets the timer.
        </p>
      </div>
    </div>
  );
}

const font = "'DM Sans', system-ui, sans-serif";

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    backdropFilter: "blur(2px)",
  },
  modal: {
    background: "#FFFFFF",
    border: "1px solid #DDE1E6",
    borderRadius: 10,
    padding: "36px 40px",
    width: 400,
    maxWidth: "90vw",
    boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
    fontFamily: font,
  },
  heading: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#1A2B3B",
    textAlign: "center",
  },
  body: {
    margin: 0,
    fontSize: 14,
    color: "#5A6872",
    textAlign: "center",
    lineHeight: 1.6,
  },
  countdown: {
    fontSize: 42,
    fontWeight: 700,
    color: "#DA1E28",
    letterSpacing: "0.04em",
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1,
  },
  actions: {
    display: "flex",
    gap: 12,
    marginTop: 4,
  },
  stayBtn: {
    background: "#0096D6",
    border: "none",
    borderRadius: 6,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: font,
    cursor: "pointer",
    padding: "10px 22px",
    transition: "background 0.15s ease",
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #DDE1E6",
    borderRadius: 6,
    color: "#5A6872",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: font,
    cursor: "pointer",
    padding: "10px 22px",
    transition: "border-color 0.15s ease",
  },
  hint: {
    margin: 0,
    fontSize: 11,
    color: "#8FA3B3",
    textAlign: "center",
  },
};
