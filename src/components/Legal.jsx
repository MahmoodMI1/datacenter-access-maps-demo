export default function Legal({ onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.logo}>DR</div>
            <div>
              <div style={styles.headerTitle}>Legal &amp; Compliance</div>
              <div style={styles.headerSub}>Site Access Plan · by Mahmood Idelbi</div>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={styles.body}>

          {/* ── Terms of Use ── */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Terms of Use</h2>
            <p style={styles.para}>
              This application is a personal project developed by Mahmood Idelbi
              for internal facility access-planning purposes. Access is restricted
              to authorised users who have been explicitly granted credentials by
              the application owner.
            </p>
            <ul style={styles.list}>
              <li>Use this application solely for legitimate facility access-planning
                  activities within the scope of your authorised role.</li>
              <li>Do not share credentials, session links, or exported content with
                  any party who has not been granted access by the application owner.</li>
              <li>All access is logged. Unauthorised use or attempted misuse may result
                  in immediate revocation of access.</li>
              <li>Screen captures or exports of access-plan data may only be shared via
                  approved, encrypted channels.</li>
              <li>The application owner reserves the right to modify, suspend, or
                  terminate access at any time without prior notice.</li>
            </ul>
          </section>

          <div style={styles.divider} />

          {/* ── Privacy Notice ── */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Privacy Notice</h2>
            <p style={styles.para}>
              Personal data processed in connection with your use of this application
              is handled in accordance with applicable data-protection law, including
              GDPR where applicable.
            </p>
            <h3 style={styles.subTitle}>Data Collected</h3>
            <ul style={styles.list}>
              <li><strong>Authentication data:</strong> email address and encrypted
                  credentials used to verify your identity.</li>
              <li><strong>Usage data:</strong> session timestamps and actions performed
                  within the application for audit and security purposes.</li>
              <li><strong>Map &amp; node data:</strong> facility floor plans and
                  access-point annotations you create or modify.</li>
            </ul>
            <h3 style={styles.subTitle}>How Data is Used</h3>
            <ul style={styles.list}>
              <li>To authenticate users and enforce role-based access controls.</li>
              <li>To maintain an audit trail for security purposes.</li>
              <li>To support facility access-planning activities.</li>
            </ul>
            <h3 style={styles.subTitle}>Data Retention</h3>
            <p style={styles.para}>
              Authentication and audit logs are retained for a minimum of 12 months.
              Map and node data is retained for the duration of active use of the
              application.
            </p>
            <h3 style={styles.subTitle}>Your Rights</h3>
            <p style={styles.para}>
              Where applicable law grants you rights of access, rectification, or
              erasure, please submit a request to{" "}
              <span style={styles.email}>mahmood.idelbi1@icloud.com</span>.
              Requests will be handled within 30 days.
            </p>
          </section>

          <div style={styles.divider} />

          {/* ── Data Classification ── */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Data Classification &amp; Handling</h2>
            <div style={styles.classificationBadge}>
              <span style={styles.badgeDot} />
              CONFIDENTIAL — INTERNAL USE ONLY
            </div>
            <p style={styles.para}>
              All content within this application is classified as{" "}
              <strong>Confidential</strong>. The following controls apply:
            </p>
            <ul style={styles.list}>
              <li>Data must not be stored on unencrypted personal devices.</li>
              <li>Transmission must occur over TLS-encrypted connections only.</li>
              <li>Printed or exported floor plans must be labelled
                  "CONFIDENTIAL" and stored securely.</li>
              <li>Physical access-plan documents must be shredded when no longer
                  required.</li>
              <li>Any suspected data loss or unauthorised disclosure must be
                  reported immediately to{" "}
                  <span style={styles.email}>mahmood.idelbi1@icloud.com</span>.</li>
            </ul>
          </section>

          <div style={styles.divider} />

          {/* ── Copyright ── */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Copyright &amp; Ownership</h2>
            <p style={styles.para}>
              © {new Date().getFullYear()} Mahmood Idelbi. All rights reserved.
              This application, its design, and all data contained herein are the
              exclusive property of Mahmood Idelbi. Unauthorised reproduction,
              distribution, or disclosure is strictly prohibited.
            </p>
          </section>

        </div>

        <div style={styles.footer}>
          <span style={styles.footerText}>
            © {new Date().getFullYear()} Mahmood Idelbi
          </span>
          <span style={styles.footerText}>
            Questions? Contact{" "}
            <span style={styles.email}>mahmood.idelbi1@icloud.com</span>
          </span>
          <button style={styles.footerClose} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

const font = "'DM Sans', system-ui, sans-serif";

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9000,
    backdropFilter: "blur(2px)",
    padding: 16,
  },
  modal: {
    background: "#FFFFFF",
    border: "1px solid #DDE1E6",
    borderRadius: 10,
    width: "100%",
    maxWidth: 720,
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 8px 48px rgba(0,0,0,0.18)",
    fontFamily: font,
    overflow: "hidden",
  },
  header: {
    background: "#002A3A",
    padding: "20px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  headerLeft: {
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
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#FFFFFF",
    lineHeight: 1.2,
  },
  headerSub: {
    fontSize: 11,
    color: "#6BA3BE",
    marginTop: 2,
  },
  closeBtn: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 5,
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    cursor: "pointer",
    padding: "5px 10px",
    fontFamily: font,
    lineHeight: 1,
  },
  body: {
    overflowY: "auto",
    padding: "28px 32px",
    flex: 1,
    minHeight: 0,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#1A2B3B",
    margin: "0 0 12px",
    letterSpacing: "-0.01em",
  },
  subTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#1A2B3B",
    margin: "14px 0 6px",
  },
  para: {
    fontSize: 13,
    color: "#5A6872",
    lineHeight: 1.7,
    margin: "0 0 10px",
  },
  list: {
    margin: "0 0 10px",
    paddingLeft: 20,
    fontSize: 13,
    color: "#5A6872",
    lineHeight: 1.7,
  },
  divider: {
    height: 1,
    background: "#EDF0F4",
    margin: "20px 0",
  },
  classificationBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    background: "rgba(241, 194, 27, 0.12)",
    border: "1px solid rgba(241, 194, 27, 0.4)",
    borderRadius: 4,
    padding: "5px 12px",
    fontSize: 11,
    fontWeight: 700,
    color: "#7A5A00",
    letterSpacing: "0.06em",
    marginBottom: 12,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#F1C21B",
    flexShrink: 0,
  },
  email: {
    color: "#0096D6",
    fontWeight: 500,
  },
  footer: {
    borderTop: "1px solid #EDF0F4",
    padding: "14px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexShrink: 0,
    background: "#F5F7FA",
    flexWrap: "wrap",
  },
  footerText: {
    fontSize: 11,
    color: "#8FA3B3",
  },
  footerClose: {
    background: "#0096D6",
    border: "none",
    borderRadius: 5,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    cursor: "pointer",
    padding: "7px 18px",
  },
};
