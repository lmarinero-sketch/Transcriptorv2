
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function UsageLimitCard() {
  const { usage } = useAuth();

  if (!usage) return null;

  const pct = usage.usage_percentage;
  const remaining = usage.audio_minutes_remaining;
  const used = usage.audio_minutes_used;
  const limit = usage.audio_minutes_limit;
  const isExceeded = pct >= 100;
  const isCritical = pct >= 90;
  const isWarning = pct >= 70;

  const barColor = isExceeded || isCritical
    ? "#FF3131"
    : isWarning
    ? "#FACC15"
    : "linear-gradient(90deg, #10B981, #34D399)";

  return (
    <div style={{
      padding: "16px 20px",
      borderRadius: 14,
      background: isExceeded
        ? "rgba(255, 49, 49, 0.08)"
        : "var(--bg-card)",
      border: `1px solid ${isExceeded ? "rgba(255,49,49,0.25)" : "var(--border-subtle)"}`,
      marginBottom: 20,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1rem" }}>
            {isExceeded ? "⛔" : isCritical ? "⚠️" : "📊"}
          </span>
          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
            Plan {usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1)}
          </span>
        </div>
        <span style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          fontFamily: "JetBrains Mono, monospace",
          color: isExceeded ? "#FF3131" : isCritical ? "#FACC15" : "var(--emerald-600)",
        }}>
          {used.toFixed(0)} / {limit} min
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        width: "100%",
        height: 8,
        borderRadius: 4,
        background: "var(--bg-subtle)",
        overflow: "hidden",
        marginBottom: 8,
      }}>
        <div style={{
          width: `${Math.min(100, pct)}%`,
          height: "100%",
          borderRadius: 4,
          background: barColor,
          transition: "width 0.5s ease",
        }} />
      </div>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>
          {isExceeded
            ? "Sin minutos disponibles"
            : `${remaining.toFixed(0)} min restantes (~${Math.floor(remaining / 45)} reuniones)`}
        </span>
        {(isWarning || isExceeded) && (
          <Link
            to="/planes"
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--emerald-600)",
              textDecoration: "none",
            }}
          >
            💎 Mejorar plan
          </Link>
        )}
      </div>

      {isExceeded && (
        <div style={{
          marginTop: 12,
          padding: "10px 14px",
          borderRadius: 10,
          background: "rgba(255,49,49,0.1)",
          border: "1px solid rgba(255,49,49,0.2)",
          fontSize: "0.8rem",
          color: "#FF6B6B",
          textAlign: "center",
          fontWeight: 600,
        }}>
          ⛔ Alcanzaste tu límite. Actualizá tu plan para seguir transcribiendo.
        </div>
      )}
    </div>
  );
}
