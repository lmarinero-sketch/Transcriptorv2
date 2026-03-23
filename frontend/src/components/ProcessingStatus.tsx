"use client";

interface ProcessingStatusProps {
  steps: { label: string; status: "pending" | "active" | "completed" | "error" }[];
}

export default function ProcessingStatus({ steps }: ProcessingStatusProps) {
  return (
    <div className="step-list">
      {steps.map((step, i) => (
        <div key={i} className={`step-item ${step.status === "active" ? "active" : ""} ${step.status === "completed" ? "completed" : ""}`}>
          <div className={`step-dot step-dot-${step.status === "error" ? "pending" : step.status}`}>
            {step.status === "completed" ? "✓" : step.status === "active" ? (
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            ) : step.status === "error" ? "✗" : (
              i + 1
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{
              fontWeight: step.status === "active" ? 600 : 500,
              fontSize: "0.9rem",
              color: step.status === "completed" ? "var(--emerald-700)" :
                     step.status === "active" ? "var(--text-primary)" :
                     step.status === "error" ? "var(--color-error)" :
                     "var(--text-tertiary)",
            }}>
              {step.label}
            </p>
          </div>
          {step.status === "completed" && (
            <span style={{ color: "var(--emerald-500)", fontSize: "0.8rem", fontWeight: 600 }}>
              Completado
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
