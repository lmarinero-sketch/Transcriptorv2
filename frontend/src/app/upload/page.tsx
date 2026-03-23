"use client";

import { useState } from "react";
import FileUploader from "@/components/FileUploader";
import ProcessingStatus from "@/components/ProcessingStatus";
import PresentationViewer from "@/components/PresentationViewer";
import UsageLimitCard from "@/components/UsageLimitCard";
import { transcribeAudio, analyzeText, generatePresentation } from "@/lib/api";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [analysisType, setAnalysisType] = useState("resumen-general");
  const [generateSlides, setGenerateSlides] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [transcriptionStep, setTranscriptionStep] = useState("");
  const [steps, setSteps] = useState<{ label: string; status: "pending" | "active" | "completed" | "error" }[]>([
    { label: "Transcribiendo audio con Whisper...", status: "pending" },
    { label: "Analizando contenido con GPT-4o...", status: "pending" },
    { label: "Generando presentación...", status: "pending" },
  ]);

  const analysisOptions = [
    { value: "minutas", icon: "📋", label: "Minutas", desc: "Actas formales con tareas y decisiones" },
    { value: "resumen-general", icon: "📝", label: "Resumen General", desc: "Puntos clave y conclusiones" },
    { value: "reunion-cliente", icon: "🤝", label: "Reunión de Cliente", desc: "Requerimientos y tareas" },
    { value: "entrevista-trabajo", icon: "💼", label: "Entrevista", desc: "Evaluación de candidato" },
  ];

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError("");
    setTranscriptionProgress(0);
    setTranscriptionStep("");

    const freshSteps = [
      { label: "Transcribiendo audio con Whisper...", status: "pending" as const },
      { label: "Analizando contenido con GPT-4o...", status: "pending" as const },
      { label: "Generando presentación...", status: "pending" as const },
    ];
    setSteps(freshSteps);

    const updateStep = (idx: number, status: string) => {
      setSteps((prev) =>
        prev.map((s, i) => ({
          ...s,
          status: i === idx ? status : i < idx ? "completed" : s.status,
        })) as any
      );
    };

    try {
      // Step 1: Transcribe with progress tracking
      updateStep(0, "active");
      const tRes = await transcribeAudio(file, (progress, step) => {
        setTranscriptionProgress(progress);
        setTranscriptionStep(step);
      });
      const transcription = tRes.data.text;
      setTranscriptionProgress(100);
      updateStep(0, "completed");

      // Step 2: Analyze
      updateStep(1, "active");
      const aRes = await analyzeText(transcription, analysisType);
      const analysis = aRes.data.analysis;
      updateStep(1, "completed");

      // Step 3: Presentation
      let presentation = null;
      if (generateSlides) {
        updateStep(2, "active");
        const pRes = await generatePresentation(analysis);
        presentation = pRes.data;
        updateStep(2, "completed");
      } else {
        updateStep(2, "completed");
      }

      setResult({
        transcription,
        analysis,
        presentation,
        title: title || file.name.replace(/\.[^/.]+$/, ""),
      });
    } catch (e: any) {
      setError(e.message || "Error al procesar");
      setSteps((prev) =>
        prev.map((s) => (s.status === "active" ? { ...s, status: "error" as const } : s))
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <main className="page-container">
        <div className="page-header animate-in">
          <h1>📁 Subir Audio</h1>
          <p>Sube un archivo de audio para transcribirlo y analizarlo con IA.</p>
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* Usage limits */}
          <UsageLimitCard />

          {/* File Uploader */}
          <div className="animate-in delay-1" style={{ marginBottom: 24 }}>
            <FileUploader
              onFileSelect={(f) => { setFile(f); setResult(null); setError(""); }}
              isProcessing={isProcessing}
            />
          </div>

          {/* Settings */}
          {file && !result && (
            <div className="card-flat animate-in" style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <label className="label">Título</label>
                <input
                  className="input"
                  placeholder="Ej: Reunión semanal del equipo..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="label">Tipo de Análisis</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  {analysisOptions.map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => !isProcessing && setAnalysisType(opt.value)}
                      className={`card ${analysisType === opt.value ? "card-selected" : ""}`}
                      style={{ cursor: isProcessing ? "default" : "pointer", textAlign: "center", padding: 16 }}
                    >
                      <span style={{ fontSize: "1.5rem" }}>{opt.icon}</span>
                      <h4 style={{ marginTop: 8, fontSize: "0.85rem" }}>{opt.label}</h4>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: 4 }}>{opt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--emerald-50)", borderRadius: "var(--radius-md)", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.2rem" }}>📊</span>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>Generar Presentación</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Crea slides HTML automáticamente</p>
                  </div>
                </div>
                <button
                  className={`toggle ${generateSlides ? "active" : ""}`}
                  onClick={() => setGenerateSlides(!generateSlides)}
                  disabled={isProcessing}
                >
                  <div className="toggle-knob" />
                </button>
              </div>

              <button
                className="btn btn-primary btn-lg"
                onClick={handleProcess}
                disabled={isProcessing}
                style={{ width: "100%" }}
              >
                {isProcessing ? <><div className="spinner" /> Procesando...</> : <>⚡ Procesar Audio</>}
              </button>
            </div>
          )}

          {/* Processing */}
          {isProcessing && (
            <div className="card-flat animate-in" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Procesando...</h3>

              {/* Progress Bar */}
              {steps[0]?.status === "active" && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                      {transcriptionStep || "Iniciando Whisper..."}
                    </span>
                    <span style={{
                      fontSize: "1.1rem",
                      fontWeight: 800,
                      background: "linear-gradient(135deg, #10B981, #34D399)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}>
                      {transcriptionProgress}%
                    </span>
                  </div>
                  <div style={{
                    width: "100%",
                    height: 12,
                    background: "var(--bg-subtle)",
                    borderRadius: 999,
                    overflow: "hidden",
                    position: "relative",
                  }}>
                    <div style={{
                      width: `${transcriptionProgress}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #10B981, #34D399, #6EE7B7)",
                      borderRadius: 999,
                      transition: "width 0.5s ease-out",
                      position: "relative",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                        animation: "shimmer 2s infinite",
                      }} />
                    </div>
                  </div>
                  <style>{`
                    @keyframes shimmer {
                      0% { transform: translateX(-100%); }
                      100% { transform: translateX(200%); }
                    }
                  `}</style>
                </div>
              )}

              <ProcessingStatus steps={steps} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="card-flat animate-in" style={{ marginBottom: 24, background: "#FEF2F2", borderColor: "#FECACA" }}>
              <p style={{ color: "var(--color-error)", fontWeight: 600 }}>❌ {error}</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="animate-in" style={{ marginBottom: 64 }}>
              <div className="card-flat" style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>📝 Transcripción</h3>
                <div style={{
                  background: "var(--bg-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: 20,
                  maxHeight: 300,
                  overflow: "auto",
                  fontSize: "0.9rem",
                  lineHeight: 1.7,
                  color: "var(--text-secondary)",
                }}>
                  {result.transcription}
                </div>
              </div>

              <div className="card-flat" style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>🤖 Análisis</h3>
                <div style={{
                  fontSize: "0.9rem",
                  lineHeight: 1.8,
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap",
                }}>
                  {result.analysis}
                </div>
              </div>

              {result.presentation && (
                <div className="card-flat" style={{ marginBottom: 24 }}>
                  <PresentationViewer data={result.presentation} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
