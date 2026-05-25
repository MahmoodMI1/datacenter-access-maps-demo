import { useState } from "react";

const font = "'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace";

export default function Login({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSignIn(email, password);
    } catch (err) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.shell}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.dot} />
          <span style={styles.title}>FLOOR PLAN</span>
        </div>
        <p style={styles.subtitle}>Sign in to continue</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  shell: {
    width: "100%",
    height: "100vh",
    background: "#0a0f14",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: font,
  },
  card: {
    background: "#0d1319",
    border: "1px solid #1a2530",
    borderRadius: 8,
    padding: "32px 36px",
    width: 320,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#4a90a4",
    boxShadow: "0 0 6px #4a90a466",
  },
  title: {
    fontSize: 14,
    letterSpacing: "0.08em",
    color: "#c8d6e0",
  },
  subtitle: {
    fontSize: 10,
    color: "#4a6070",
    letterSpacing: "0.05em",
    marginBottom: 24,
    marginTop: 2,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  input: {
    background: "#111922",
    border: "1px solid #1a2530",
    borderRadius: 5,
    color: "#c8d6e0",
    padding: "8px 12px",
    fontSize: 11,
    fontFamily: font,
    outline: "none",
    letterSpacing: "0.03em",
  },
  error: {
    fontSize: 10,
    color: "#e05555",
    margin: 0,
    letterSpacing: "0.03em",
  },
  btn: {
    background: "#1a2a38",
    border: "1px solid #2a4055",
    borderRadius: 5,
    color: "#c8d6e0",
    fontSize: 11,
    letterSpacing: "0.08em",
    cursor: "pointer",
    padding: "9px 0",
    marginTop: 4,
    fontFamily: font,
  },
};
