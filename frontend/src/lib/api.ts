const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("gl_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function transcribeAudio(
  file: File,
  onProgress?: (progress: number, step: string) => void
): Promise<any> {
  const formData = new FormData();
  formData.append("audio", file);

  // Step 1: Start the job
  const startRes = await fetch(`${API_URL}/api/v1/transcribe`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: formData,
  });

  if (!startRes.ok) {
    const err = await startRes.json().catch(() => ({ error: "Error de red" }));
    throw new Error(err.detail || err.error || "Error al transcribir");
  }

  const { job_id } = await startRes.json();

  // Step 2: Poll for progress
  while (true) {
    await new Promise((r) => setTimeout(r, 2000)); // Poll every 2s

    const statusRes = await fetch(`${API_URL}/api/v1/transcribe/status/${job_id}`, {
      headers: { ...getAuthHeaders() },
    });
    if (!statusRes.ok) throw new Error("Error al verificar progreso");

    const status = await statusRes.json();

    if (onProgress) {
      onProgress(status.progress || 0, status.step || "Procesando...");
    }

    if (status.status === "completed") {
      return { success: true, data: status.data };
    }

    if (status.status === "error") {
      throw new Error(status.error || "Error en la transcripción");
    }
  }
}

export async function transcribeChunk(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "chunk.webm");

  try {
    const res = await fetch(`${API_URL}/api/v1/transcribe-chunk`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
      body: formData,
    });
    if (!res.ok) {
      console.error(`[transcribeChunk] Failed: ${res.status} ${res.statusText}`);
      const errText = await res.text().catch(() => "");
      console.error(`[transcribeChunk] Body: ${errText}`);
      return "";
    }
    const data = await res.json();
    return data.text || "";
  } catch (err) {
    console.error("[transcribeChunk] Network error:", err);
    return "";
  }
}

export async function analyzeText(
  text: string,
  analysisType: string
): Promise<any> {
  const res = await fetch(`${API_URL}/api/v1/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ text, analysis_type: analysisType }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error de red" }));
    const detail = Array.isArray(err.detail) ? err.detail.map((d: any) => d.msg).join(", ") : err.detail;
    throw new Error(detail || err.error || "Error al analizar");
  }

  return res.json();
}

export async function generatePresentation(
  text: string,
  template: string = "standard"
): Promise<any> {
  const res = await fetch(`${API_URL}/api/v1/generate-presentation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ text, template }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error de red" }));
    throw new Error(
      err.detail || err.error || "Error al generar presentación"
    );
  }

  return res.json();
}

export async function processMeeting(
  file: File,
  title: string,
  analysisType: string,
  generateSlides: boolean = false
): Promise<any> {
  const formData = new FormData();
  formData.append("audio", file);
  formData.append("title", title);
  formData.append("analysis_type", analysisType);
  formData.append("generate_slides", String(generateSlides));

  const res = await fetch(`${API_URL}/api/v1/meetings/process`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error de red" }));
    throw new Error(err.detail || err.error || "Error al procesar reunión");
  }

  return res.json();
}

export async function getMeetings(): Promise<any> {
  const res = await fetch(`${API_URL}/api/v1/meetings`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Error al obtener reuniones");
  return res.json();
}

export async function getMeeting(id: number): Promise<any> {
  const res = await fetch(`${API_URL}/api/v1/meetings/${id}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Error al obtener reunión");
  return res.json();
}

export async function deleteMeeting(id: number): Promise<any> {
  const res = await fetch(`${API_URL}/api/v1/meetings/${id}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Error al eliminar reunión");
  return res.json();
}

export async function generateConceptMap(text: string): Promise<any> {
  const res = await fetch(`${API_URL}/api/v1/concept-map`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error de red" }));
    throw new Error(err.detail || err.error || "Error al generar mapa conceptual");
  }

  const data = await res.json();
  return data.data;
}

export async function saveMeeting(data: {
  title: string;
  transcription: string;
  analysis: string;
  analysis_type: string;
  presentation_data?: any;
  concept_map?: any;
  source?: string;
}): Promise<any> {
  const res = await fetch(`${API_URL}/api/v1/meetings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error de red" }));
    throw new Error(err.detail || err.error || "Error al guardar reunión");
  }

  return res.json();
}
