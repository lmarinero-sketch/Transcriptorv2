import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{
      marginTop: 64,
      borderTop: "1px solid var(--border-light)",
      background: "var(--bg-white)",
      padding: "48px 24px 32px",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", textAlign: "center" }}>
        {/* Logo */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "linear-gradient(to bottom right, var(--color-sanatorio-primary), var(--color-sanatorio-secondary))",
            color: "white",
            fontSize: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
            boxShadow: "var(--shadow-sm)",
          }}>
            🏥
          </div>
          <p style={{
            fontSize: "0.95rem",
            color: "var(--text-secondary)",
            fontWeight: 500,
          }}>
            Sanatorio Argentino • Trascendencia tecnológica
          </p>
        </div>

        {/* Links */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 32,
          marginBottom: 24,
        }}>
          <a href="https://www.sanatorioargentino.com.ar/" target="_blank" rel="noopener noreferrer" style={footerLinkStyle}>
            Sitio Web
          </a>
          <a href="#" style={footerLinkStyle}>
            Soporte Interno
          </a>
          <a href="#" style={footerLinkStyle}>
            Privacidad
          </a>
        </div>

        {/* Copyright */}
        <p style={{
          fontSize: "0.8rem",
          color: "var(--text-tertiary)",
        }}>
          © {new Date().getFullYear()} Sanatorio Argentino. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

const footerLinkStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  color: "var(--text-secondary)",
  textDecoration: "none",
  fontWeight: 500,
  transition: "color 200ms ease",
};

