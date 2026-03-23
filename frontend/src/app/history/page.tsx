"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getMeetings, deleteMeeting } from "@/lib/api";

export default function HistoryPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getMeetings()
      .then((res) => setMeetings(res.data || []))
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta reunión? Esta acción no se puede deshacer.")) return;
    try {
      await deleteMeeting(id);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    } catch {
      alert("Error al eliminar");
    }
  };

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

  const filtered = filter === "all" ? meetings : meetings.filter((m) => m.analysis_type === filter);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <main className="page-container">
        <div className="page-header animate-in">
          <h1>📋 Historial de Reuniones</h1>
          <p>Todas tus reuniones analizadas con IA.</p>
        </div>

        {/* Filter Tabs */}
        <div className="animate-in delay-1" style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {[
            { value: "all", label: "Todas" },
            { value: "resumen-general", label: "📝 Resumen" },
            { value: "reunion-cliente", label: "🤝 Cliente" },
            { value: "entrevista-trabajo", label: "💼 Entrevista" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`btn btn-sm ${filter === f.value ? "btn-primary" : "btn-ghost"}`}
            >
              {f.label}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: "0.85rem", color: "var(--text-tertiary)", alignSelf: "center" }}>
            {filtered.length} reunión{filtered.length !== 1 ? "es" : ""}
          </span>
        </div>

        {/* List */}
        <div className="animate-in delay-2" style={{ marginBottom: 64 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton" style={{ height: 72, borderRadius: "var(--radius-lg)" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>Sin reuniones</h3>
              <p>{filter === "all" ? "No hay reuniones analizadas aún." : "No hay reuniones de este tipo."}</p>
              <Link href="/record" className="btn btn-primary">
                <span>⚡</span> Grabar Reunión
              </Link>
            </div>
          ) : (
            <div className="meeting-list">
              {filtered.map((meeting) => (
                <div key={meeting.id} className="meeting-item" style={{ cursor: "default" }}>
                  <div className="meeting-avatar">
                    {analysisIcons[meeting.analysis_type] || "📄"}
                  </div>
                  <div className="meeting-info">
                    <div className="meeting-title">{meeting.title}</div>
                    <div className="meeting-preview">{meeting.preview}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span className="badge badge-emerald">
                        {analysisLabels[meeting.analysis_type] || meeting.analysis_type}
                      </span>
                      <span className="meeting-meta">{formatDate(meeting.created_at)}</span>
                    </div>
                    <Link href={`/meeting/${meeting.id}`} className="btn btn-sm btn-secondary">
                      Ver
                    </Link>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleDelete(meeting.id)}
                      style={{ color: "var(--color-error)" }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
