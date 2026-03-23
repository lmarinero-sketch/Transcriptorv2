import { useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2, Target } from "lucide-react";

export interface Objective {
  id: string;
  text: string;
  isCompleted: boolean;
}

interface MeetingObjectivesProps {
  objectives: Objective[];
  setObjectives: React.Dispatch<React.SetStateAction<Objective[]>>;
  isRecording: boolean;
}

export default function MeetingObjectives({ objectives, setObjectives, isRecording }: MeetingObjectivesProps) {
  const [newObjective, setNewObjective] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjective.trim()) return;
    setObjectives([...objectives, { id: crypto.randomUUID(), text: newObjective.trim(), isCompleted: false }]);
    setNewObjective("");
  };

  const toggleObjective = (id: string) => {
    setObjectives(prev => prev.map(obj => obj.id === id ? { ...obj, isCompleted: !obj.isCompleted } : obj));
  };

  const removeObjective = (id: string) => {
    setObjectives(prev => prev.filter(obj => obj.id !== id));
  };

  return (
    <div className="card-flat animate-in" style={{
      marginBottom: 24,
      background: isRecording ? "var(--bg-card)" : "var(--bg-subtle)",
      border: isRecording ? "2px solid var(--emerald-500)" : "1px solid var(--border-light)",
      transition: "all 0.3s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Target size={24} color={isRecording ? "var(--emerald-600)" : "var(--text-secondary)"} />
        <h3 style={{ margin: 0, fontSize: "1.1rem", color: isRecording ? "var(--emerald-700)" : "var(--text-primary)" }}>
          {isRecording ? "🎯 Tus Objetivos Activos" : "📝 Agenda y Objetivos"}
        </h3>
      </div>

      {!isRecording && (
        <>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
            Define los puntos que no quieres olvidar mencionar durante la reunión. El asistente te los recordará mientras grabas.
          </p>
          <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              type="text"
              className="input"
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              placeholder="Ej: Presupuesto Q3, Nuevas contrataciones..."
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: "10px 16px" }}>
              <Plus size={18} />
            </button>
          </form>
        </>
      )}

      {objectives.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {objectives.map((obj) => (
            <div
              key={obj.id}
              onClick={() => isRecording && toggleObjective(obj.id)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                padding: isRecording ? "16px" : "12px",
                background: obj.isCompleted ? "var(--emerald-50)" : "var(--bg-card)",
                border: obj.isCompleted ? "1px solid var(--emerald-200)" : "1px solid var(--border-medium)",
                borderRadius: "var(--radius-md)",
                cursor: isRecording ? "pointer" : "default",
                transition: "all 0.2s ease",
                opacity: obj.isCompleted && !isRecording ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1 }}>
                {isRecording ? (
                  <button
                    style={{ background: "none", border: "none", padding: 0, marginTop: 2, color: obj.isCompleted ? "var(--emerald-600)" : "var(--text-tertiary)" }}
                  >
                    {obj.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                ) : (
                  <div style={{ marginTop: 4, width: 6, height: 6, borderRadius: "50%", background: "var(--emerald-500)" }} />
                )}
                <span style={{
                  fontSize: isRecording ? "1.05rem" : "0.95rem",
                  fontWeight: isRecording ? (obj.isCompleted ? 500 : 600) : 500,
                  color: obj.isCompleted ? "var(--emerald-700)" : "var(--text-primary)",
                  textDecoration: obj.isCompleted ? "line-through" : "none",
                  wordBreak: "break-word",
                  lineHeight: 1.4,
                }}>
                  {obj.text}
                </span>
              </div>

              {!isRecording && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeObjective(obj.id); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-error)",
                    opacity: 0.6,
                    cursor: "pointer",
                    padding: 4,
                  }}
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        isRecording && (
          <p style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.9rem", fontStyle: "italic", margin: 0 }}>
            No definiste objetivos para esta sesión.
          </p>
        )
      )}
    </div>
  );
}
