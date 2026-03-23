
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function UsageBanner() {
  const { usage } = useAuth();

  if (!usage) return null;

  const pct = usage.usage_percentage;
  const remaining = usage.audio_minutes_remaining;

  // Only show when usage is above 70%
  if (pct < 70) return null;

  const isWarning = pct >= 70 && pct < 90;
  const isCritical = pct >= 90;
  const isExceeded = pct >= 100;

  return (
    <div style={{
      padding: "10px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      fontSize: "0.85rem",
      fontWeight: 600,
      background: isExceeded
        ? "linear-gradient(90deg, #991B1B, #DC2626)"
        : isCritical
        ? "linear-gradient(90deg, #92400E, #D97706)"
          : `linear-gradient(90deg, var(--color-sanatorio-primary), var(--color-sanatorio-secondary))`,
      color: "#fff",
      position: "relative",
      zIndex: 99,
    }}>
      <span>
        {isExceeded
          ? "⛔ Alcanzaste tu límite de audio. "
          : isCritical
          ? `⚠️ Quedan ${remaining.toFixed(0)} minutos de audio. `
          : `📊 Usaste el ${pct.toFixed(0)}% de tu plan. `}
      </span>
      <Link
        to="/planes"
        style={{
          color: "#fff",
          textDecoration: "underline",
          fontWeight: 800,
        }}
      >
        {isExceeded ? "Actualizar plan →" : "Ver planes →"}
      </Link>
    </div>
  );
}
