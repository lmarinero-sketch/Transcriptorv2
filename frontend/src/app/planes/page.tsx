"use client";

import { useAuth } from "@/context/AuthContext";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 19,
    minutes: 300,
    hours: "5 horas",
    meetings: "~7 reuniones",
    features: [
      "Transcripción con Whisper",
      "Análisis con GPT-4o",
      "Presentaciones automáticas",
      "Mapa conceptual",
      "Historial completo",
    ],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    minutes: 1500,
    hours: "25 horas",
    meetings: "~33 reuniones",
    features: [
      "Todo lo del plan Starter",
      "Prioridad en procesamiento",
      "Soporte prioritario",
      "Exportación avanzada",
      "Usuarios ilimitados",
    ],
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    minutes: 5000,
    hours: "83 horas",
    meetings: "~111 reuniones",
    features: [
      "Todo lo del plan Pro",
      "API dedicada",
      "Integraciones personalizadas",
      "SLA garantizado",
      "Soporte 24/7",
    ],
    highlight: false,
  },
];

export default function PlanesPage() {
  const { usage } = useAuth();
  const currentPlan = usage?.plan || "starter";

  return (
    <main className="page-container">
      <div className="page-header animate-in" style={{ textAlign: "center", paddingTop: 48, paddingBottom: 32 }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 900 }}>📊 Planes</h1>
        <p style={{ maxWidth: 500, margin: "8px auto 0" }}>
          Elegí el plan que mejor se adapte a tu equipo. Todos incluyen IA de última generación.
        </p>
      </div>

      {/* Current usage */}
      {usage && (
        <div className="animate-in delay-1" style={{
          maxWidth: 500,
          margin: "0 auto 40px",
          padding: 20,
          borderRadius: 16,
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Tu uso actual</span>
            <span className="badge badge-emerald" style={{ textTransform: "uppercase", fontSize: "0.7rem" }}>
              {usage.plan}
            </span>
          </div>
          <div style={{
            width: "100%",
            height: 10,
            borderRadius: 5,
            background: "var(--bg-subtle)",
            overflow: "hidden",
            marginBottom: 8,
          }}>
            <div style={{
              width: `${Math.min(100, usage.usage_percentage)}%`,
              height: "100%",
              borderRadius: 5,
              background: usage.usage_percentage > 90 ? "#FF3131"
                : usage.usage_percentage > 70 ? "#FACC15"
                : "linear-gradient(90deg, #10B981, #34D399)",
              transition: "width 0.5s ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
            <span>{usage.audio_minutes_used.toFixed(0)} min usados</span>
            <span>{usage.audio_minutes_limit} min disponibles</span>
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div className="animate-in delay-2" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280, 1fr))",
        gap: 24,
        maxWidth: 960,
        margin: "0 auto 64px",
      }}>
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isUpgrade = plans.findIndex(p => p.id === currentPlan) < plans.findIndex(p => p.id === plan.id);

          return (
            <div
              key={plan.id}
              className="card-flat"
              style={{
                padding: 28,
                borderRadius: 20,
                border: plan.highlight ? "2px solid var(--emerald-500)" : "1px solid var(--border-subtle)",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.3s ease",
              }}
            >
              {/* Popular badge */}
              {plan.highlight && (
                <div style={{
                  position: "absolute",
                  top: 14,
                  right: -30,
                  background: "linear-gradient(135deg, #10B981, #34D399)",
                  color: "#fff",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  padding: "4px 36px",
                  transform: "rotate(45deg)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  Popular
                </div>
              )}

              {/* Name */}
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 4 }}>
                {plan.name}
              </h3>

              {/* Price */}
              <div style={{ marginBottom: 20 }}>
                <span style={{
                  fontSize: "2.5rem",
                  fontWeight: 900,
                  background: plan.highlight
                    ? "linear-gradient(135deg, #10B981, #34D399)"
                    : "linear-gradient(135deg, var(--text-primary), var(--text-secondary))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  ${plan.price}
                </span>
                <span style={{ color: "var(--text-tertiary)", fontSize: "0.9rem" }}>/mes</span>
              </div>

              {/* Minutes info */}
              <div style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "var(--bg-subtle)",
                marginBottom: 20,
                fontSize: "0.85rem",
              }}>
                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  {plan.minutes.toLocaleString()} minutos de audio
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "0.8rem" }}>
                  {plan.hours} · {plan.meetings}/mes
                </div>
              </div>

              {/* Features */}
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map((feat) => (
                  <li key={feat} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
                    <span style={{ color: "#10B981", fontSize: "0.9rem" }}>✓</span>
                    <span style={{ color: "var(--text-secondary)" }}>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <button
                  className="btn btn-ghost"
                  disabled
                  style={{ width: "100%", opacity: 0.6 }}
                >
                  Plan actual
                </button>
              ) : isUpgrade ? (
                <button
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  onClick={() => alert("Contactanos para actualizar tu plan: hola@growlabs.app")}
                >
                  ⚡ Actualizar
                </button>
              ) : (
                <button
                  className="btn btn-ghost"
                  disabled
                  style={{ width: "100%", opacity: 0.4 }}
                >
                  —
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="animate-in delay-3" style={{ maxWidth: 600, margin: "0 auto 64px" }}>
        <h2 style={{ textAlign: "center", marginBottom: 24, fontSize: "1.3rem", fontWeight: 800 }}>
          Preguntas Frecuentes
        </h2>
        {[
          {
            q: "¿Qué pasa si excedo mi límite?",
            a: "Tu servicio no se cortará durante una reunión activa. Pero no podrás iniciar nuevas transcripciones hasta que actualices tu plan o comience el próximo ciclo.",
          },
          {
            q: "¿Cuándo se reinicia el contador?",
            a: "Cada 30 días desde la activación del plan. Todos los minutos se reinician a 0.",
          },
          {
            q: "¿Puedo cambiar de plan en cualquier momento?",
            a: "Sí, podés actualizar en cualquier momento. El cambio es inmediato y se prorratea.",
          },
        ].map((faq) => (
          <div
            key={faq.q}
            style={{
              padding: 20,
              borderRadius: 14,
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              marginBottom: 12,
            }}
          >
            <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 6 }}>{faq.q}</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", lineHeight: 1.6 }}>{faq.a}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
