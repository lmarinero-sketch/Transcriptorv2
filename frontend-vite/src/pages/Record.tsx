
import { useState, useRef, useCallback, useEffect } from "react";
import FileUploader from "@/components/FileUploader";
import ProcessingStatus from "@/components/ProcessingStatus";
import PresentationViewer from "@/components/PresentationViewer";
import ConceptMap from "@/components/ConceptMap";
import LiveInsights from "@/components/LiveInsights";
import UsageLimitCard from "@/components/UsageLimitCard";
import MeetingObjectives from "@/components/MeetingObjectives";
import type { Objective } from "@/components/MeetingObjectives";
import { useAuth } from "@/context/AuthContext";
import { transcribeAudio, transcribeChunk, analyzeText, generatePresentation, generateConceptMap, saveMeeting } from "@/lib/api";

type InputMode = "record" | "upload";

// Helper: detect the best supported audio mimeType for this browser
function getSupportedMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return ''; // fallback: let browser choose
}

export default function RecordPage() {
  const { refreshUsage } = useAuth();
  const [mode, setMode] = useState<InputMode>("record");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [timer, setTimer] = useState(0);
  const [title, setTitle] = useState("");
  const [analysisType, setAnalysisType] = useState("minutas");
  const [generateSlides, setGenerateSlides] = useState(true);
  const [objectives, setObjectives] = useState<Objective[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState<{ label: string; status: "pending" | "active" | "completed" | "error" }[]>([
    { label: "Transcribiendo y puliendo audio con Whisper + GPT...", status: "pending" },
    { label: "Generando análisis / minutas con GPT-4o...", status: "pending" },
    { label: "Generando presentación...", status: "pending" },
    { label: "Guardando en base de datos...", status: "pending" },
  ]);

  // Live transcription
  const [liveTranscript, setLiveTranscript] = useState<string[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const liveRecorderRef = useRef<MediaRecorder | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [waveformBars, setWaveformBars] = useState<number[]>(new Array(32).fill(4));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Wake Lock — prevents screen from turning off during recording
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  const acquireWakeLock = useCallback(async () => {
    // 1. Try Screen Wake Lock API
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current?.addEventListener('release', () => {
          console.log('[WakeLock] Released');
        });
        console.log('[WakeLock] Acquired');
      }
    } catch (e) {
      console.warn('[WakeLock] Failed:', e);
    }

    // 2. Silent audio trick — keeps browser process alive on iOS/Android
    try {
      const audio = new Audio();
      // Generate a tiny silent WAV in base64
      audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      audio.loop = true;
      audio.volume = 0.01;
      await audio.play();
      silentAudioRef.current = audio;
    } catch (e) {
      console.warn('[SilentAudio] Failed:', e);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
    if (silentAudioRef.current) {
      silentAudioRef.current.pause();
      silentAudioRef.current = null;
    }
  }, []);

  // Re-acquire wake lock when page becomes visible again (e.g. switching apps)
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && isRecording && !isPaused) {
        await acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isRecording, isPaused, acquireWakeLock]);

  const hasAudio = mode === "record" ? (!!audioBlob || liveTranscript.length > 0) : !!uploadedFile;

  // Auto-scroll transcript log (only if user is near bottom)
  useEffect(() => {
    const el = transcriptContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [liveTranscript]);

  const updateWaveform = useCallback(() => {
    if (analyserRef.current && isRecording && !isPaused) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const bars = Array.from({ length: 32 }, (_, i) => {
        const idx = Math.floor((i / 32) * data.length);
        return Math.max(4, (data[idx] / 255) * 40);
      });
      setWaveformBars(bars);
    }
    animationRef.current = requestAnimationFrame(updateWaveform);
  }, [isRecording, isPaused]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      animationRef.current = requestAnimationFrame(updateWaveform);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRecording, isPaused, updateWaveform]);
  const liveLoopActiveRef = useRef(false);
  const chunkCountRef = useRef(0);
  const [chunkCount, setChunkCount] = useState(0);
  const [recoveredTranscript, setRecoveredTranscript] = useState<string[] | null>(null);

  // ── LocalStorage persistence ──
  const STORAGE_KEY = "growlabs_live_transcript";
  const STORAGE_TIMER_KEY = "growlabs_recording_timer";

  const persistTranscript = useCallback((segments: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(segments));
      localStorage.setItem(STORAGE_TIMER_KEY, String(Date.now()));
    } catch { /* quota exceeded — ignore */ }
  }, []);

  const clearPersistedTranscript = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TIMER_KEY);
  }, []);

  // Check for recovered transcript on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const savedTime = localStorage.getItem(STORAGE_TIMER_KEY);
      if (saved && savedTime) {
        const segments = JSON.parse(saved) as string[];
        const age = Date.now() - Number(savedTime);
        // Only recover if less than 4 hours old and has content
        if (segments.length > 0 && age < 4 * 60 * 60 * 1000) {
          setRecoveredTranscript(segments);
        } else {
          clearPersistedTranscript();
        }
      }
    } catch { /* ignore */ }
  }, [clearPersistedTranscript]);

  const recoverTranscript = () => {
    if (recoveredTranscript) {
      setLiveTranscript(recoveredTranscript);
      setRecoveredTranscript(null);
    }
  };

  const dismissRecovery = () => {
    clearPersistedTranscript();
    setRecoveredTranscript(null);
  };

  // Stops the live recorder and returns the complete audio blob (with proper WebM headers)
  const collectLiveBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const lr = liveRecorderRef.current;
      if (!lr || lr.state !== "recording") {
        resolve(null);
        return;
      }

      const chunks: Blob[] = [];
      const origHandler = lr.ondataavailable;

      lr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      lr.onstop = () => {
        lr.ondataavailable = origHandler;
        if (chunks.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(chunks, { type: "audio/webm" });
        resolve(blob.size > 1000 ? blob : null);
      };

      lr.stop();
    });
  }, []);

  // Starts (or restarts) the live recorder on the current stream
  const restartLiveRecorder = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = getSupportedMimeType();
    const opts: MediaRecorderOptions = mimeType ? { mimeType } : {};
    const lr = new MediaRecorder(stream, opts);
    lr.start(); // No timeslice — we manually stop it each cycle
    liveRecorderRef.current = lr;
  }, []);

  // Transcribe a chunk with retry logic (up to 2 retries)
  const transcribeWithRetry = useCallback(async (blob: Blob, maxRetries = 2): Promise<string | null> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const text = await transcribeChunk(blob);
        return text;
      } catch (err) {
        console.warn(`Chunk transcription attempt ${attempt + 1} failed:`, err);
        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
    }
    return null;
  }, []);

  const startLiveLoop = useCallback(() => {
    liveLoopActiveRef.current = true;
    chunkCountRef.current = 0;

    const loop = async () => {
      if (!liveLoopActiveRef.current) return;

      // 1. Stop current recorder → get a complete audio blob
      const blob = await collectLiveBlob();

      // 2. Immediately restart recording for the next segment
      if (liveLoopActiveRef.current) {
        restartLiveRecorder();
      }

      // 3. Send the blob to Whisper API with retry
      if (blob) {
        setIsTranscribing(true);
        try {
          const text = await transcribeWithRetry(blob);
          if (text && text.length > 2) {
            chunkCountRef.current += 1;
            setChunkCount(chunkCountRef.current);
            setLiveTranscript((prev) => {
              const updated = [...prev, text];
              // Persist to localStorage for crash recovery
              persistTranscript(updated);
              return updated;
            });
          }
        } catch (err) {
          console.warn("Live chunk transcription error (all retries failed):", err);
        } finally {
          setIsTranscribing(false);
        }
      }

      // 4. Schedule next cycle (15s for long meeting friendly rate)
      if (liveLoopActiveRef.current) {
        setTimeout(loop, 15000);
      }
    };

    // First send after 15 seconds
    setTimeout(loop, 15000);
  }, [collectLiveBlob, restartLiveRecorder, transcribeWithRetry, persistTranscript]);

  const stopLiveLoop = () => {
    liveLoopActiveRef.current = false;
  };

  const startRecording = async () => {
    // ── Pre-flight checks for mobile compatibility ──
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Tu navegador no soporta grabación de audio. Usá Safari en iPhone o Chrome en Android.");
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setError("MediaRecorder no disponible. En iPhone, usá Safari (no Chrome). En Android, actualizá Chrome.");
      return;
    }
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      setError("La grabación requiere HTTPS. Accede desde https:// para grabar.");
      return;
    }

    try {
      // Request microphone — this triggers the iOS/Android permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // AudioContext — must be created/resumed from a user gesture on iOS
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Main recorder (full audio)
      const mimeType = getSupportedMimeType();
      const recorderOpts: MediaRecorderOptions = mimeType ? { mimeType } : {};
      
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, recorderOpts);
      } catch (e) {
        // Fallback: try without options
        recorder = new MediaRecorder(stream);
      }
      
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blobType = mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      
      // Use 5s timeslice for main recorder
      recorder.start(5000);
      mediaRecorder.current = recorder;

      // Live transcription recorder
      restartLiveRecorder();

      // Start the self-scheduling live transcription loop
      startLiveLoop();

      // Clear any recovered transcript
      clearPersistedTranscript();
      setRecoveredTranscript(null);

      setIsRecording(true);
      setIsPaused(false);
      setAudioBlob(null);
      setResult(null);
      setError("");
      setTimer(0);
      setChunkCount(0);
      setLiveTranscript([]);

      // Acquire Wake Lock
      await acquireWakeLock();

      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } catch (err: any) {
      console.error('[Recording] Error:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setError("Permiso de micrófono denegado. Abrí Configuración > Safari > Micrófono y permitilo para este sitio.");
      } else if (err?.name === 'NotFoundError') {
        setError("No se encontró micrófono. Verificá que tu dispositivo tenga micrófono disponible.");
      } else {
        setError(err?.message || "Error al iniciar la grabación. Intentá con Safari en iPhone.");
      }
    }
  };

  const stopRecording = async () => {
    // Stop the live transcription loop
    stopLiveLoop();

    // Collect final live segment
    const finalBlob = await collectLiveBlob();
    if (finalBlob) {
      setIsTranscribing(true);
      try {
        const text = await transcribeChunk(finalBlob);
        if (text && text.length > 2) {
          setLiveTranscript((prev) => [...prev, text]);
        }
      } catch (err) {
        console.warn("Final chunk transcription error:", err);
      } finally {
        setIsTranscribing(false);
      }
    }

    // Stop main recorder
    mediaRecorder.current?.stop();
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setWaveformBars(new Array(32).fill(4));

    // Release Wake Lock
    releaseWakeLock();
  };

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const switchMode = (newMode: InputMode) => {
    if (isProcessing || isRecording) return;
    setMode(newMode);
    setAudioBlob(null);
    setUploadedFile(null);
    setResult(null);
    setError("");
    setTimer(0);
    setSteps([
      { label: "Transcribiendo audio con Whisper...", status: "pending" as const },
      { label: "Analizando contenido con GPT-4o...", status: "pending" as const },
      { label: "Generando presentación...", status: "pending" as const },
      { label: "Guardando en base de datos...", status: "pending" as const },
    ]);
  };

  const handleProcess = async () => {
    // For upload mode, we need a file. For record mode, we can use live transcript or the audio blob.
    if (mode === "upload" && !uploadedFile) return;
    if (mode === "record" && !audioBlob && liveTranscript.length === 0) return;

    setIsProcessing(true);
    setError("");

    const hasLiveText = mode === "record" && liveTranscript.length > 0;
    setSteps([
      { label: hasLiveText ? "Usando transcripción en vivo capturada ✅" : "Transcribiendo audio con Whisper...", status: "pending" as const },
      { label: "Analizando contenido con GPT-4o...", status: "pending" as const },
      { label: "Generando mapa conceptual...", status: "pending" as const },
      { label: "Generando presentación...", status: "pending" as const },
      { label: "Guardando reunión...", status: "pending" as const },
    ]);

    const updateStep = (idx: number, status: string) => {
      setSteps((prev) =>
        prev.map((s, i) => ({
          ...s,
          status: i === idx ? status : i < idx ? "completed" : s.status,
        })) as any
      );
    };

    try {
      const meetingTitle = title || `Reunión ${new Date().toLocaleDateString("es-AR")}`;

      let transcription: string;

      if (hasLiveText) {
        updateStep(0, "active");
        transcription = liveTranscript.join(" ");
        updateStep(0, "completed");
      } else {
        updateStep(0, "active");
        let file: File;
        if (mode === "record") {
          file = new File([audioBlob!], `reunion_${Date.now()}.webm`, { type: "audio/webm" });
        } else {
          file = uploadedFile!;
        }
        const transcriptionRes = await transcribeAudio(file);
        transcription = transcriptionRes.data.text;
        updateStep(0, "completed");
      }

      // Step 2: Analyze
      updateStep(1, "active");
      const analysisRes = await analyzeText(transcription, analysisType);
      const analysis = analysisRes.data.analysis;
      updateStep(1, "completed");

      // Step 3: Concept Map
      updateStep(2, "active");
      let conceptMap = null;
      try {
        conceptMap = await generateConceptMap(analysis);
      } catch (err) {
        console.warn("Concept map generation failed:", err);
      }
      updateStep(2, "completed");

      // Step 4: Presentation
      let presentation = null;
      if (generateSlides) {
        updateStep(3, "active");
        const presRes = await generatePresentation(analysis);
        presentation = presRes.data;
        updateStep(3, "completed");
      } else {
        updateStep(3, "completed");
      }

      // Step 5: Save to history
      updateStep(4, "active");
      try {
        await saveMeeting({
          title: meetingTitle,
          transcription,
          analysis,
          analysis_type: analysisType,
          presentation_data: presentation,
          concept_map: conceptMap,
          objectives: objectives.map(o => o.text),
          source: hasLiveText ? "live" : "upload",
        });
      } catch (err) {
        console.warn("Failed to save meeting:", err);
      }
      updateStep(4, "completed");

      // Refresh usage to update the minutes counter
      await refreshUsage();

      // Clear persisted transcript since we saved successfully
      clearPersistedTranscript();

      setResult({
        transcription,
        analysis,
        conceptMap,
        presentation,
        title: meetingTitle,
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

  const downloadPDF = async () => {
    const html2pdf = (await import("html2pdf.js")).default;

    const meetingTitle = result?.title || "Reunión";
    const dateStr = new Date().toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Convert markdown-like formatting to HTML
    const formatAnalysis = (text: string) => {
      return text
        .replace(/^### (.*$)/gm, '<h3 style="color:#00FF88;margin:16px 0 8px;font-size:14px;">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 style="color:#00FF88;margin:20px 0 10px;font-size:16px;border-bottom:1px solid #333;padding-bottom:6px;">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 style="color:#00FF88;margin:24px 0 12px;font-size:18px;">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e0e0e0;">$1</strong>')
        .replace(/^\- (.*$)/gm, '<li style="margin:4px 0;color:#9CA3AF;">$1</li>')
        .replace(/^\d+\. (.*$)/gm, '<li style="margin:4px 0;color:#9CA3AF;">$1</li>')
        .replace(/\n\n/g, '<br/><br/>')
        .replace(/\n/g, '<br/>');
    };

    const content = document.createElement("div");
    content.innerHTML = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #d1d5db; background: #000; padding: 40px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #00FF88; padding-bottom: 24px;">
          <h1 style="color: #00A99D; font-size: 28px; margin: 0 0 4px; letter-spacing: -0.5px;">
            Sanatorio Argentino
          </h1>
          <p style="color: #6b7280; font-size: 11px; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 2px;">
            AI-Powered Meeting Intelligence
          </p>
          <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 8px;">
            ${meetingTitle}
          </h2>
          <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
            📅 ${dateStr}
          </p>
        </div>

        <!-- Transcription -->
        <div style="margin-bottom: 32px;">
          <h2 style="color: #00D1FF; font-size: 16px; margin: 0 0 12px; display: flex; align-items: center; gap: 8px;">
            📝 Transcripción
          </h2>
          <div style="background: #111; border: 1px solid #222; border-radius: 8px; padding: 16px; font-size: 12px; line-height: 1.7; color: #9CA3AF;">
            ${result?.transcription || ""}
          </div>
        </div>

        <!-- Analysis -->
        <div style="margin-bottom: 32px;">
          <h2 style="color: #00D1FF; font-size: 16px; margin: 0 0 12px;">
            🤖 Análisis
          </h2>
          <div style="background: #111; border: 1px solid #222; border-radius: 8px; padding: 16px; font-size: 12px; line-height: 1.8;">
            ${formatAnalysis(result?.analysis || "")}
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 16px; border-top: 1px solid #222;">
          <p style="color: #4b5563; font-size: 10px; margin: 0;">
            Generado por Sanatorio Argentino • ${dateStr}
          </p>
        </div>
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `${meetingTitle.replace(/\s+/g, "_")}_${Date.now()}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: "#000000" },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
    };

    html2pdf().set(opt).from(content).save();
  };

  const analysisOptions = [
    { value: "minutas", icon: "📋", label: "Minutas", desc: "Actas formales con tareas y decisiones" },
    { value: "resumen-general", icon: "📝", label: "Resumen General", desc: "Puntos clave y conclusiones" },
    { value: "reunion-cliente", icon: "🤝", label: "Reunión de Cliente", desc: "Requerimientos y tareas" },
    { value: "entrevista-trabajo", icon: "💼", label: "Entrevista", desc: "Evaluación de candidato" },
  ];

  // Auto-refresh usage counter every 30s while recording
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      refreshUsage();
    }, 30000);
    return () => clearInterval(interval);
  }, [isRecording, refreshUsage]);

  return (
    <>
      <main className="page-container">
        <div className="page-header animate-in">
          <h1>🎙️ Nueva Reunión</h1>
          <p>Graba desde tu micrófono o sube un archivo de audio para analizarlo con IA.</p>
        </div>

        {/* Usage limits */}
        <div style={{ maxWidth: 720, margin: "0 auto 0" }}>
          <UsageLimitCard />
        </div>

        {/* Recovery banner */}
        {recoveredTranscript && (
          <div style={{
            maxWidth: 720,
            margin: "0 auto 16px",
            padding: "16px 24px",
            background: "linear-gradient(135deg, rgba(250, 204, 21, 0.1), rgba(250, 204, 21, 0.05))",
            border: "1px solid rgba(250, 204, 21, 0.3)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}>
            <div>
              <p style={{ fontWeight: 700, color: "#FACC15", margin: 0, fontSize: "0.9rem" }}>
                ⚠️ Transcripción recuperada
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                Se encontró una transcripción de una sesión anterior ({recoveredTranscript.length} fragmentos).
                ¿Deseas recuperarla?
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button className="btn btn-primary" onClick={recoverTranscript} style={{ fontSize: "0.8rem", padding: "8px 16px" }}>
                Recuperar
              </button>
              <button className="btn" onClick={dismissRecovery} style={{
                fontSize: "0.8rem", padding: "8px 16px",
                background: "transparent", border: "1px solid var(--border-light)", color: "var(--text-secondary)",
              }}>
                Descartar
              </button>
            </div>
          </div>
        )}

        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* Mode Selector */}
          <div className="animate-in delay-1" style={{
            display: "flex",
            background: "var(--bg-subtle)",
            borderRadius: "var(--radius-full)",
            padding: 4,
            marginBottom: 24,
            border: "1px solid var(--border-light)",
          }}>
            <button
              onClick={() => switchMode("record")}
              disabled={isProcessing || isRecording}
              style={{
                flex: 1,
                padding: "12px 20px",
                borderRadius: "var(--radius-full)",
                border: "none",
                cursor: isProcessing || isRecording ? "default" : "pointer",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                background: mode === "record"
                  ? "linear-gradient(135deg, var(--emerald-700), var(--emerald-600))"
                  : "transparent",
                color: mode === "record" ? "white" : "var(--text-secondary)",
                boxShadow: mode === "record" ? "var(--shadow-emerald)" : "none",
              }}
            >
              🎤 Grabar Audio
            </button>
            <button
              onClick={() => switchMode("upload")}
              disabled={isProcessing || isRecording}
              style={{
                flex: 1,
                padding: "12px 20px",
                borderRadius: "var(--radius-full)",
                border: "none",
                cursor: isProcessing || isRecording ? "default" : "pointer",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                background: mode === "upload"
                  ? "linear-gradient(135deg, var(--emerald-700), var(--emerald-600))"
                  : "transparent",
                color: mode === "upload" ? "white" : "var(--text-secondary)",
                boxShadow: mode === "upload" ? "var(--shadow-emerald)" : "none",
              }}
            >
              📁 Subir Archivo
            </button>
          </div>

          {/* ===== RECORD MODE ===== */}
          {mode === "record" && (
            <>
              {(!audioBlob && !isProcessing) && (
                <MeetingObjectives 
                  objectives={objectives} 
                  setObjectives={setObjectives} 
                  isRecording={isRecording} 
                />
              )}
            <div className="card-flat animate-in" style={{ textAlign: "center", padding: 40, marginBottom: 24 }}>
              {/* Waveform */}
              <div className="waveform-container" style={{ justifyContent: "center", height: 60, marginBottom: 24 }}>
                {waveformBars.map((h, i) => (
                  <div
                    key={i}
                    className="waveform-bar"
                    style={{
                      height: `${h}px`,
                      background: isRecording
                        ? `linear-gradient(180deg, var(--emerald-400), var(--emerald-600))`
                        : "var(--border-medium)",
                    }}
                  />
                ))}
              </div>

              {/* Timer */}
              <p className="text-mono" style={{
                fontSize: "2.5rem",
                fontWeight: 700,
                color: isRecording ? "var(--emerald-700)" : "var(--text-tertiary)",
                marginBottom: 24,
              }}>
                {formatTimer(timer)}
              </p>

              {/* Controls */}
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                {!isRecording && !audioBlob && (
                  <button className="btn btn-primary btn-lg" onClick={startRecording} disabled={isProcessing}>
                    🎤 Iniciar Grabación
                  </button>
                )}
                {isRecording && (
                  <button className="btn btn-lg" onClick={stopRecording} style={{
                    background: "var(--color-error)",
                    color: "white",
                    boxShadow: "0 4px 20px rgba(220, 38, 38, 0.3)",
                  }}>
                    ⏹ Detener
                  </button>
                )}
                {audioBlob && !isRecording && (
                  <>
                    <button className="btn btn-secondary" onClick={startRecording} disabled={isProcessing}>
                      🔄 Grabar de Nuevo
                    </button>
                    <button className="btn btn-primary btn-lg" onClick={handleProcess} disabled={isProcessing}>
                      {isProcessing ? <><div className="spinner" /> Procesando...</> : <>⚡ Analizar con IA</>}
                    </button>
                  </>
                )}
              </div>
            </div>
            </>
          )}

          {/* ===== LIVE TRANSCRIPT LOG ===== */}
          {(isRecording || liveTranscript.length > 0) && mode === "record" && (
            <div className="card-flat animate-in" style={{ marginBottom: 24 }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                  📝 Transcripción en Vivo
                </h3>
                {isTranscribing && (
                  <span style={{
                    fontSize: "0.75rem",
                    color: "var(--emerald-600)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Transcribiendo...
                  </span>
                )}
              </div>

              <div ref={transcriptContainerRef} style={{
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius-md)",
                padding: 20,
                maxHeight: 300,
                overflowY: "auto",
                fontSize: "0.9rem",
                lineHeight: 1.8,
                color: "var(--text-secondary)",
                border: "1px solid var(--border-light)",
              }}>
                {liveTranscript.length === 0 ? (
                  <p style={{ color: "var(--text-tertiary)", fontStyle: "italic", textAlign: "center", margin: 0 }}>
                    {isRecording ? "Esperando audio... comenzará a transcribir en unos segundos" : "No hay transcripción aún"}
                  </p>
                ) : (
                  liveTranscript.map((text, i) => (
                    <p key={i} style={{
                      margin: "0 0 8px 0",
                      padding: "8px 12px",
                      background: "rgba(16, 185, 129, 0.05)",
                      borderLeft: "3px solid var(--emerald-400)",
                      borderRadius: "0 8px 8px 0",
                      animation: "fadeIn 0.3s ease-out",
                    }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginRight: 8 }}>
                        [{String(Math.floor((i + 1) * 15 / 60)).padStart(2, "0")}:{String(((i + 1) * 15) % 60).padStart(2, "0")}]
                      </span>
                      {text}
                    </p>
                  ))
                )}

              </div>

              {liveTranscript.length > 0 && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: 8, textAlign: "right" }}>
                  {liveTranscript.length} fragmentos • ~{liveTranscript.join(" ").split(" ").length} palabras
                  {isRecording && " • 💾 Auto-guardado activo"}
                </p>
              )}

              <style>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(4px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </div>
          )}

          {/* ===== LIVE INSIGHTS ===== */}
          {liveTranscript.length > 0 && mode === "record" && (
            <LiveInsights
              transcript={liveTranscript}
              timer={timer}
              isRecording={isRecording}
            />
          )}

          {/* ===== UPLOAD MODE ===== */}
          {mode === "upload" && (
            <div className="animate-in" style={{ marginBottom: 24 }}>
              <FileUploader
                onFileSelect={(f) => { setUploadedFile(f); setResult(null); setError(""); }}
                isProcessing={isProcessing}
              />
              {uploadedFile && !result && (
                <div style={{ marginTop: 16, textAlign: "center" }}>
                  <button className="btn btn-primary btn-lg" onClick={handleProcess} disabled={isProcessing} style={{ width: "100%" }}>
                    {isProcessing ? <><div className="spinner" /> Procesando...</> : <>⚡ Procesar Audio</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Settings — show when audio is ready */}
          {hasAudio && !result && (
            <div className="card-flat animate-in" style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <label className="label">Título de la Reunión</label>
                <input
                  className="input"
                  placeholder="Ej: Reunión con equipo de diseño..."
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

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--emerald-50)", borderRadius: "var(--radius-md)" }}>
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
            </div>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <div className="card-flat animate-in" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Procesando...</h3>
              <ProcessingStatus steps={steps} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="card-flat animate-in" style={{
              marginBottom: 24,
              background: "#FEF2F2",
              borderColor: "#FECACA",
            }}>
              <p style={{ color: "var(--color-error)", fontWeight: 600 }}>❌ {error}</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="animate-in" style={{ marginBottom: 64 }}>
              {/* Action toolbar */}
              <div className="card-flat" style={{
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 24px",
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>✅ {result.title}</h3>
                  <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                    Análisis completado • {new Date().toLocaleDateString("es-AR")}
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={downloadPDF}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  📄 Descargar PDF
                </button>
              </div>

              {/* Concept Map */}
              {result.conceptMap && (
                <div className="card-flat" style={{ marginBottom: 24 }}>
                  <h3 style={{ marginBottom: 16 }}>🧠 Mapa Conceptual</h3>
                  <div style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    borderRadius: "var(--radius-md)",
                    padding: 16,
                    border: "1px solid var(--border-light)",
                  }}>
                    <ConceptMap data={result.conceptMap} />
                  </div>
                </div>
              )}

              {/* Transcription */}
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

              {/* Analysis */}
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

              {/* Presentation */}
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
