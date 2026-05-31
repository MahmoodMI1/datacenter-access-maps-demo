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
        {/* Navy header strip */}
        <div style={styles.navyStrip}>
          <div style={styles.logo}>DR</div>
          <div>
            <div style={styles.title}>Site Access Plan</div>
            <div style={styles.subtitle}>Digital Realty · Facility Access</div>
          </div>
        </div>

        {/* Form body */}
        <div style={styles.body}>
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="email"
              placeholder="Email address"
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
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
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
    width: 380,
    boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
    overflow: "hidden",
  },
  navyStrip: {
    background: "#002A3A",
    padding: "24px 28px",
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 6,
    background: "linear-gradient(135deg, #0096D6 0%, #00B4D8 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    color: "#FFFFFF",
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 11,
    color: "#6BA3BE",
    marginTop: 2,
    fontWeight: 500,
    letterSpacing: "0.02em",
  },
  body: {
    padding: "28px 28px 32px",
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
