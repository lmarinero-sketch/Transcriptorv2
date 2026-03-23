"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import PresentationViewer from "@/components/PresentationViewer";
import { getMeeting } from "@/lib/api";

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"transcription" | "analysis" | "presentation">("analysis");
  const [downloading, setDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMeeting(Number(id))
      .then((res) => setMeeting(res.data))
      .catch(() => setMeeting(null))
      .finally(() => setLoading(false));
  }, [id]);

  const analysisLabels: Record<string, string> = {
    "entrevista-trabajo": "💼 Entrevista de Trabajo",
    "reunion-cliente": "🤝 Reunión de Cliente",
    "resumen-general": "📝 Resumen General",
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      // Build HTML content for PDF
      const date = new Date(meeting.created_at).toLocaleDateString("es-AR", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      });

      const tabLabel = activeTab === "analysis" ? "Análisis"
        : activeTab === "transcription" ? "Transcripción"
        : "Presentación";

      let bodyContent = "";

      if (activeTab === "analysis") {
        bodyContent = `<div style="font-size: 13px; line-height: 1.9; white-space: pre-wrap; color: #333;">${meeting.analysis}</div>`;
      } else if (activeTab === "transcription") {
        bodyContent = `<div style="font-size: 13px; line-height: 1.9; white-space: pre-wrap; color: #333;">${meeting.transcription}</div>`;
      } else if (activeTab === "presentation" && meeting.presentation_data) {
        const slides = meeting.presentation_data.slides || [];
        bodyContent = slides.map((slide: any, i: number) => `
          <div style="page-break-inside: avoid; margin-bottom: 24px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h3 style="color: #059669; margin: 0 0 8px; font-size: 16px;">Slide ${i + 1}: ${slide.title || ""}</h3>
            <div style="font-size: 13px; line-height: 1.8; color: #333;">${slide.content || ""}</div>
          </div>
        `).join("");
      }

      const htmlContent = `
        <div style="font-family: 'Inter', 'Helvetica', sans-serif; padding: 0; color: #111;">
          <div style="border-bottom: 3px solid #059669; padding-bottom: 16px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <img src="/logogrow.png" style="width: 36px; height: 36px; border-radius: 50%;" />
              <span style="font-size: 11px; color: #059669; font-weight: 700; letter-spacing: 0.05em;">GROW LABS</span>
            </div>
            <h1 style="font-size: 22px; font-weight: 900; margin: 0 0 4px; color: #111;">${meeting.title}</h1>
            <p style="font-size: 12px; color: #888; margin: 0;">${tabLabel} • ${date}</p>
          </div>
          ${bodyContent}
          <div style="margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 10px; color: #bbb;">Generado por Sanatorio Argentino</p>
          </div>
        </div>
      `;

      const container = document.createElement("div");
      container.innerHTML = htmlContent;
      container.style.width = "210mm";
      document.body.appendChild(container);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (html2pdf() as any)
        .set({
          margin: [15, 15, 15, 15],
          filename: `${meeting.title.replace(/[^a-zA-Z0-9]/g, "_")}_${tabLabel}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(container)
        .save();

      document.body.removeChild(container);
    } catch (err) {
      console.error("PDF Error:", err);
      alert("Error al generar el PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <>
        <main className="page-container" style={{ paddingTop: 48 }}>
          <div className="skeleton" style={{ height: 40, width: 300, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 20, width: 200, marginBottom: 32 }} />
          <div className="skeleton" style={{ height: 400, borderRadius: "var(--radius-lg)" }} />
        </main>
      </>
    );
  }

  if (!meeting) {
    return (
      <>
        <main className="page-container">
          <div className="empty-state" style={{ paddingTop: 64 }}>
            <div className="empty-state-icon">❌</div>
            <h3>Reunión no encontrada</h3>
            <p>La reunión que buscas no existe o fue eliminada.</p>
            <Link href="/history" className="btn btn-primary">← Volver al Historial</Link>
          </div>
        </main>
      </>
    );
  }

  const tabs = [
    { key: "analysis", label: "🤖 Análisis", icon: "🤖" },
    { key: "transcription", label: "📝 Transcripción", icon: "📝" },
    ...(meeting.presentation_data ? [{ key: "presentation", label: "📊 Presentación", icon: "📊" }] : []),
  ];

  return (
    <>
      <main className="page-container">
        <div className="page-header animate-in">
          <Link href="/history" style={{ color: "var(--text-tertiary)", textDecoration: "none", fontSize: "0.85rem" }}>
            ← Volver al historial
          </Link>
          <h1 style={{ marginTop: 8 }}>{meeting.title}</h1>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
            <span className="badge badge-emerald">
              {analysisLabels[meeting.analysis_type] || meeting.analysis_type}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>
              {new Date(meeting.created_at).toLocaleDateString("es-AR", {
                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Tabs + Download */}
        <div className="animate-in delay-1" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          borderBottom: "1px solid var(--border-light)",
          paddingBottom: 8,
        }}>
          <div style={{ display: "flex", gap: 8 }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`btn btn-sm ${activeTab === tab.key ? "btn-primary" : "btn-ghost"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleDownloadPDF}
            disabled={downloading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {downloading ? (
              <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Generando...</>
            ) : (
              <>📄 Descargar PDF</>
            )}
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="animate-in delay-2" style={{ maxWidth: 900, marginBottom: 64 }}>
          {activeTab === "transcription" && (
            <div className="card-flat">
              <h3 style={{ marginBottom: 16 }}>Transcripción Original</h3>
              <div style={{
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius-md)",
                padding: 24,
                fontSize: "0.9rem",
                lineHeight: 1.8,
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
              }}>
                {meeting.transcription}
              </div>
            </div>
          )}

          {activeTab === "analysis" && (
            <div className="card-flat">
              <h3 style={{ marginBottom: 16 }}>Análisis con IA</h3>
              <div style={{
                fontSize: "0.9rem",
                lineHeight: 1.8,
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
              }}>
                {meeting.analysis}
              </div>
            </div>
          )}

          {activeTab === "presentation" && meeting.presentation_data && (
            <PresentationViewer data={meeting.presentation_data} />
          )}
        </div>
      </main>
    </>
  );
}
