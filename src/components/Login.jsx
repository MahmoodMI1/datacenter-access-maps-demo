import { useState } from "react";

const font = "'DM Sans', system-ui, sans-serif";

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
    background: "#F5F7FA",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: font,
  },
  card: {
    background: "#FFFFFF",
    border: "1px solid #DDE1E6",
    borderRadius: 8,
    padding: "36px 40px",
    width: 380,
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#0096D6",
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: "#002A3A",
  },
  subtitle: {
    fontSize: 13,
    color: "#5A6872",
    marginBottom: 24,
    marginTop: 2,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  input: {
    background: "#EDF0F4",
    border: "1px solid #DDE1E6",
    borderRadius: 6,
    color: "#1A2B3B",
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: font,
    outline: "none",
  },
  error: {
    fontSize: 12,
    color: "#DA1E28",
    margin: 0,
  },
  btn: {
    background: "#0096D6",
    border: "none",
    borderRadius: 6,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    padding: "11px 0",
    marginTop: 4,
    fontFamily: font,
    transition: "background 0.15s ease",
  },
};
