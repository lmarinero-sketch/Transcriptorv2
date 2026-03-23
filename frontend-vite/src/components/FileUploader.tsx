
import { useState, useRef, useCallback } from "react";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/m4a",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
  "audio/x-m4a",
  "video/mp4",
  "video/webm",
];

const ALLOWED_EXTENSIONS = [
  "mp3", "wav", "m4a", "opus", "ogg", "flac", "webm", "mp4",
];

export default function FileUploader({ onFileSelect, isProcessing }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      alert(`Formato no soportado: .${ext}\nFormatos aceptados: ${ALLOWED_EXTENSIONS.join(", ")}`);
      return false;
    }
    if (file.size > 500 * 1024 * 1024) {
      alert("El archivo supera los 500MB. Intenta con un audio más corto o comprímelo.");
      return false;
    }
    return true;
  };

  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div
        className={`dropzone ${isDragging ? "dropzone-active" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{ pointerEvents: isProcessing ? "none" : "auto", opacity: isProcessing ? 0.5 : 1 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          style={{ display: "none" }}
        />

        <div className="dropzone-icon">
          {selectedFile ? "✅" : "🎵"}
        </div>

        {selectedFile ? (
          <div>
            <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "1rem" }}>
              {selectedFile.name}
            </p>
            <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem", marginTop: 4 }}>
              {formatSize(selectedFile.size)} • Listo para procesar
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "1rem" }}>
              Arrastra tu archivo de audio aquí
            </p>
            <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem", marginTop: 4 }}>
              o haz clic para seleccionar • MP3, WAV, M4A, OGG, WebM, FLAC (máx 500MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
