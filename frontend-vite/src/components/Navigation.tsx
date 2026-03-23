
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Navigation() {
  const location = useLocation();
  const pathname = location.pathname;
  const { user, usage, logout } = useAuth();

  const links = [
    { href: "/", label: "Inicio", icon: "🏠" },
    { href: "/record", label: "Grabar", icon: "🎙️" },
    { href: "/upload", label: "Subir Audio", icon: "📁" },
    { href: "/history", label: "Historial", icon: "📋" },
    { href: "/planes", label: "Planes", icon: "💎" },
  ];

  const usagePct = usage?.usage_percentage ?? 0;
  const barColor = usagePct > 90 ? "#DC2626" : usagePct > 70 ? "#D97706" : "var(--color-sanatorio-secondary)";

  return (
    <nav className="navbar glass-panel sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 text-sanatorio-primary hover:text-sanatorio-secondary transition-colors font-bold font-display text-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sanatorio-primary to-sanatorio-secondary flex items-center justify-center text-white shadow-md">
            🏥
          </div>
          <span>Sanatorio Argentino</span>
        </Link>

        <div className="hidden md:flex items-center gap-1 bg-white/50 p-1 rounded-full border border-slate-200">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                pathname === link.href
                  ? "bg-white text-sanatorio-primary shadow-sm"
                  : "text-slate-600 hover:text-sanatorio-primary hover:bg-white/50"
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Usage bar */}
          {usage && (
            <Link to="/planes" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 20,
              background: "rgba(255,255,255,0.8)",
              border: "1px solid var(--border-medium)",
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "var(--shadow-sm)",
            }}>
              <span style={{
                fontSize: "0.6rem",
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: 6,
                background: usagePct > 90 ? "#FEE2E2" : "var(--bg-emerald-soft)",
                color: usagePct > 90 ? "#DC2626" : "var(--color-sanatorio-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {usage.plan}
              </span>
              <div style={{
                width: 50,
                height: 6,
                borderRadius: 3,
                background: "var(--border-light)",
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${Math.min(100, usagePct)}%`,
                  height: "100%",
                  borderRadius: 3,
                  background: barColor,
                  transition: "width 0.5s ease",
                }} />
              </div>
              <span style={{ color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace" }}>
                {usage.audio_minutes_used.toFixed(0)}/{usage.audio_minutes_limit}
              </span>
            </div>
            </Link>
          )}

          <Link to="/record" className="btn-primary" style={{ padding: "8px 16px", fontSize: "0.85rem", gap: "6px" }}>
            <span>⚡</span>
            Nueva Reunión
          </Link>

          {/* User menu */}
          {user && (
            <button
              onClick={logout}
              title={user.email}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1px solid var(--border-medium)",
                background: "var(--bg-white)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
                boxShadow: "var(--shadow-sm)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#FCA5A5";
                e.currentTarget.style.color = "#DC2626";
                e.currentTarget.style.background = "#FEF2F2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-medium)";
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "var(--bg-white)";
              }}
            >
              ⏻
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
