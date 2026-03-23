
import { useMemo } from "react";

// Common Spanish stop words to exclude from keyword analysis
const STOP_WORDS = new Set([
  "de", "la", "el", "en", "y", "a", "los", "que", "del", "se", "las",
  "por", "un", "para", "con", "no", "una", "su", "al", "lo", "como",
  "más", "pero", "sus", "le", "ya", "o", "este", "si", "porque",
  "esta", "entre", "cuando", "muy", "sin", "sobre", "también", "me",
  "hasta", "hay", "donde", "quien", "desde", "todo", "nos", "durante",
  "todos", "uno", "les", "ni", "contra", "otros", "ese", "eso",
  "ante", "ellos", "e", "esto", "mi", "antes", "algunos", "qué",
  "unos", "yo", "otro", "somos", "otras", "ser", "tiene", "es", "son",
  "era", "fue", "han", "sido", "tiene", "he", "ha", "hacer", "puede",
  "tenemos", "vamos", "algo", "estamos", "hemos", "va", "tiene",
  "creo", "entonces", "bueno", "bien", "así", "ahora", "está", "hay",
  "sea", "cada", "esa", "ese", "esos", "esas", "unas", "dos", "tres",
  "osea", "digamos", "básicamente", "realmente", "verdad", "cierto",
  "tipo", "cosa", "eh", "ah", "mmm", "ok", "sí", "no", "ver", "ir",
  "ser", "tener", "hacer", "dar", "decir", "poder", "como", "cual",
]);

interface LiveInsightsProps {
  transcript: string[];
  timer: number; // seconds
  isRecording: boolean;
}

export default function LiveInsights({ transcript, timer, isRecording }: LiveInsightsProps) {
  const fullText = transcript.join(" ");
  const words = fullText.split(/\s+/).filter((w) => w.length > 0);

  // Memoize keyword extraction
  const keywords = useMemo(() => {
    const freq: Record<string, number> = {};
    words.forEach((w) => {
      const clean = w.toLowerCase().replace(/[^a-záéíóúñü]/gi, "");
      if (clean.length < 3 || STOP_WORDS.has(clean)) return;
      freq[clean] = (freq[clean] || 0) + 1;
    });

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [fullText]);

  // Calculate metrics
  const wordCount = words.length;
  const minutes = timer / 60;
  const wordsPerMinute = minutes > 0.5 ? Math.round(wordCount / minutes) : 0;
  const charCount = fullText.length;
  const sentenceCount = fullText.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;

  // Estimated reading time for the transcript
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  if (transcript.length === 0) return null;

  return (
    <div className="card-flat animate-in" style={{ marginBottom: 24 }}>
      <h3 style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 16px" }}>
        📊 Insights en Vivo
        {isRecording && (
          <span style={{
            fontSize: "0.65rem",
            padding: "2px 8px",
            borderRadius: 20,
            background: "rgba(16, 185, 129, 0.15)",
            color: "var(--emerald-600)",
            fontWeight: 700,
          }}>
            LIVE
          </span>
        )}
      </h3>

      {/* Metrics row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        marginBottom: 20,
      }}>
        {[
          { icon: "📝", value: wordCount.toLocaleString(), label: "Palabras" },
          { icon: "⏱️", value: wordsPerMinute > 0 ? `${wordsPerMinute}` : "—", label: "Palabras/min" },
          { icon: "💬", value: sentenceCount, label: "Oraciones" },
          { icon: "📖", value: `${readingTime} min`, label: "Lectura est." },
        ].map((m) => (
          <div key={m.label} style={{
            textAlign: "center",
            padding: "12px 8px",
            borderRadius: 12,
            background: "var(--bg-subtle)",
            border: "1px solid var(--border-light)",
          }}>
            <div style={{ fontSize: "0.85rem", marginBottom: 4 }}>{m.icon}</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {m.value}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: 2 }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Keywords */}
      {keywords.length > 0 && (
        <div>
          <div style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "var(--text-secondary)",
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            🏷️ Temas Detectados
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {keywords.map(([word, count]) => (
              <span
                key={word}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  background: `rgba(16, 185, 129, ${Math.min(0.25, 0.08 + count * 0.03)})`,
                  color: "var(--emerald-700)",
                  border: `1px solid rgba(16, 185, 129, ${Math.min(0.4, 0.1 + count * 0.05)})`,
                  transition: "all 0.3s ease",
                }}
              >
                {word}
                <span style={{
                  marginLeft: 6,
                  fontSize: "0.65rem",
                  opacity: 0.7,
                  fontFamily: "JetBrains Mono, monospace",
                }}>
                  ×{count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
