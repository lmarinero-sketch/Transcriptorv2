"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getMeetings } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
  const { usage } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMeetings()
      .then((res) => setMeetings(res.data || []))
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  }, []);

  const analysisIcons: Record<string, string> = {
    "entrevista-trabajo": "💼",
    "reunion-cliente": "🤝",
    "resumen-general": "📝",
  };

  const analysisLabels: Record<string, string> = {
    "entrevista-trabajo": "Entrevista",
    "reunion-cliente": "Cliente",
    "resumen-general": "Resumen",
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <main className="page-container">
        {/* Hero Section */}
        <div className="page-header animate-in" style={{ textAlign: "center", paddingTop: 64, paddingBottom: 48 }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--color-sanatorio-primary)" }}>
            Sanatorio Argentino
          </h1>
          <p style={{ fontSize: "1.1rem", maxWidth: 500, margin: "12px auto 0" }}>
            Tu inteligencia artificial para reuniones. Graba, transcribe y analiza en minutos.
          </p>
        </div>

        {/* Action Cards */}
        <div className="animate-in delay-1" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 48,
        }}>
          <Link href="/record" style={{ textDecoration: "none" }}>
            <div className="card" style={{ cursor: "pointer", textAlign: "center", padding: "32px 24px" }}>
              <div className="card-icon card-icon-emerald" style={{ margin: "0 auto 16px" }}>
                🎙️
              </div>
              <h3 style={{ marginBottom: 6 }}>Grabar Reunión</h3>
              <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
                Graba directamente desde tu micrófono
              </p>
            </div>
          </Link>

          <Link href="/upload" style={{ textDecoration: "none" }}>
            <div className="card" style={{ cursor: "pointer", textAlign: "center", padding: "32px 24px" }}>
              <div className="card-icon card-icon-info" style={{ margin: "0 auto 16px" }}>
                📁
              </div>
              <h3 style={{ marginBottom: 6 }}>Subir Audio</h3>
              <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
                Sube un archivo MP3, WAV, M4A u otros
              </p>
            </div>
          </Link>

          <Link href="/history" style={{ textDecoration: "none" }}>
            <div className="card" style={{ cursor: "pointer", textAlign: "center", padding: "32px 24px" }}>
              <div className="card-icon card-icon-warning" style={{ margin: "0 auto 16px" }}>
                📊
              </div>
              <h3 style={{ marginBottom: 6 }}>Ver Historial</h3>
              <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
                Consulta análisis y presentaciones previas
              </p>
            </div>
          </Link>
        </div>

        {/* Guide Section */}
        <div className="guide-section animate-in delay-2" style={{ marginBottom: 48 }}>
          <div className="guide-title">
            <span>ℹ️</span>
            Guía Rápida
          </div>
          <div className="guide-grid">
            <div className="guide-item">
              <div className="card-icon card-icon-error" style={{ width: 40, height: 40, fontSize: "1rem" }}>
                🎤
              </div>
              <h4>Graba o Sube</h4>
              <p>Graba tu reunión en vivo o sube un archivo de audio existente.</p>
            </div>
            <div className="guide-item">
              <div className="card-icon card-icon-warning" style={{ width: 40, height: 40, fontSize: "1rem" }}>
                🤖
              </div>
              <h4>IA Analiza</h4>
              <p>La inteligencia artificial transcribe y genera un análisis detallado.</p>
            </div>
            <div className="guide-item">
              <div className="card-icon card-icon-emerald" style={{ width: 40, height: 40, fontSize: "1rem" }}>
                📊
              </div>
              <h4>Presentación</h4>
              <p>Genera automáticamente una presentación profesional HTML.</p>
            </div>
          </div>
        </div>

        {/* Stats + Usage */}
        <div className="stats-row animate-in delay-3" style={{ marginBottom: 48 }}>
          <div className="stat-card">
            <div className="stat-value">{meetings.length}</div>
            <div className="stat-label">Reuniones Analizadas</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--emerald-600)" }}>AI</div>
            <div className="stat-label">Whisper + GPT-4o</div>
          </div>
          {usage ? (
            <div className="stat-card" style={{ gridColumn: "span 2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <div className="stat-label" style={{ marginBottom: 2 }}>Tu plan</div>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, textTransform: "uppercase" }}>
                    {usage.plan}
                  </span>
                </div>
                <Link href="/planes" className="btn btn-sm btn-ghost">
                  💎 Ver Planes
                </Link>
              </div>
              <div style={{
                width: "100%",
                height: 8,
                borderRadius: 4,
                background: "var(--bg-subtle)",
                overflow: "hidden",
                marginBottom: 6,
              }}>
                <div style={{
                  width: `${Math.min(100, usage.usage_percentage)}%`,
                  height: "100%",
                  borderRadius: 4,
                  background: usage.usage_percentage > 90 ? "#DC2626"
                    : usage.usage_percentage > 70 ? "#D97706"
                    : "linear-gradient(90deg, var(--color-sanatorio-primary), var(--color-sanatorio-secondary))",
                  transition: "width 0.5s ease",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-tertiary)" }}>
                <span>{usage.audio_minutes_used.toFixed(0)} min usados</span>
                <span>{usage.audio_minutes_remaining.toFixed(0)} min restantes</span>
              </div>
            </div>
          ) : (
            <>
              <div className="stat-card">
                <div className="stat-value">3</div>
                <div className="stat-label">Tipos de Análisis</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">∞</div>
                <div className="stat-label">Presentaciones</div>
              </div>
            </>
          )}
        </div>

        {/* Recent Meetings */}
        <div className="animate-in delay-4" style={{ marginBottom: 64 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2>Reuniones Recientes</h2>
            {meetings.length > 0 && (
              <Link href="/history" className="btn btn-ghost btn-sm">
                Ver todas →
              </Link>
            )}
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 72, borderRadius: "var(--radius-lg)" }} />
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎙️</div>
              <h3>No hay reuniones aún</h3>
              <p>Graba o sube tu primera reunión para comenzar a usar el Transcriptor de Sanatorio Argentino.</p>
              <Link href="/record" className="btn btn-primary">
                <span>⚡</span> Grabar Primera Reunión
              </Link>
            </div>
          ) : (
            <div className="meeting-list">
              {meetings.slice(0, 5).map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/meeting/${meeting.id}`}
                  className="meeting-item"
                >
                  <div className="meeting-avatar">
                    {analysisIcons[meeting.analysis_type] || "📄"}
                  </div>
                  <div className="meeting-info">
                    <div className="meeting-title">{meeting.title}</div>
                    <div className="meeting-preview">{meeting.preview}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span className="badge badge-emerald">
                      {analysisLabels[meeting.analysis_type] || meeting.analysis_type}
                    </span>
                    <span className="meeting-meta">{formatDate(meeting.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
