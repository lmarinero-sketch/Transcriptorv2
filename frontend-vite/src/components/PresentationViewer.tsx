
interface PresentationViewerProps {
  data: {
    titulo_presentacion: string;
    subtitulo?: string;
    slides: any[];
  };
}

export default function PresentationViewer({ data }: PresentationViewerProps) {
  const renderSlide = (slide: any, index: number) => {
    switch (slide.tipo) {
      case "titulo":
        return (
          <div key={index} className="slide slide-titulo">
            <h1>{slide.titulo}</h1>
            {slide.contenido && Array.isArray(slide.contenido) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {slide.contenido.map((c: string, i: number) => (
                  <p key={i} style={{ fontSize: "1.1rem", opacity: 0.85 }}>{c}</p>
                ))}
              </div>
            )}
          </div>
        );

      case "frase_impacto":
        return (
          <div key={index} className="slide slide-frase-impacto">
            <p>&ldquo;{typeof slide.contenido === "string" ? slide.contenido : ""}&rdquo;</p>
          </div>
        );

      case "split_content":
        return (
          <div key={index} className="slide slide-split">
            <div>
              <h2 style={{ marginBottom: 16, color: "var(--emerald-800)" }}>{slide.titulo}</h2>
              {slide.columna_izquierda?.map((t: string, i: number) => (
                <p key={i} style={{ marginBottom: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>{t}</p>
              ))}
            </div>
            <div style={{ borderLeft: "2px solid var(--emerald-200)", paddingLeft: 24 }}>
              {slide.columna_derecha?.map((t: string, i: number) => (
                <div key={i} style={{
                  padding: "12px 16px",
                  background: "var(--emerald-50)",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: 8,
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  color: "var(--emerald-800)",
                }}>
                  {t}
                </div>
              ))}
            </div>
          </div>
        );

      case "grid_cards":
        return (
          <div key={index} className="slide slide-grid-cards">
            <h2 style={{ color: "var(--emerald-800)", marginBottom: 8 }}>{slide.titulo}</h2>
            <div className="slide-grid">
              {slide.items?.map((item: any, i: number) => (
                <div key={i} className="slide-card">
                  <h4 style={{ color: "var(--emerald-700)", marginBottom: 6, fontSize: "0.9rem" }}>
                    {item.titulo}
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {item.texto}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );

      case "grafico":
        return (
          <div key={index} className="slide" style={{ padding: 40 }}>
            <h2 style={{ color: "var(--emerald-800)", marginBottom: 8 }}>{slide.titulo}</h2>
            {slide.descripcion && (
              <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: "0.9rem" }}>
                {slide.descripcion}
              </p>
            )}
            {slide.datos_grafico && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: "60%", padding: "0 32px" }}>
                {slide.datos_grafico.etiquetas?.map((label: string, i: number) => {
                  const max = Math.max(...(slide.datos_grafico.valores || [1]));
                  const val = slide.datos_grafico.valores?.[i] || 0;
                  const pct = (val / max) * 100;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{val}</span>
                      <div style={{
                        width: "100%",
                        height: `${pct}%`,
                        minHeight: 20,
                        background: `linear-gradient(180deg, var(--emerald-400), var(--emerald-600))`,
                        borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                        transition: "height 0.5s ease",
                      }} />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div key={index} className="slide" style={{ padding: 40 }}>
            <h2 style={{ color: "var(--emerald-800)", marginBottom: 16 }}>{slide.titulo || "Slide"}</h2>
            {typeof slide.contenido === "string" ? (
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{slide.contenido}</p>
            ) : Array.isArray(slide.contenido) ? (
              slide.contenido.map((c: string, i: number) => (
                <p key={i} style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 8 }}>{c}</p>
              ))
            ) : null}
          </div>
        );
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{data.titulo_presentacion}</h2>
        {data.subtitulo && (
          <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>{data.subtitulo}</p>
        )}
        <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem", marginTop: 8 }}>
          {data.slides.length} slides generadas
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {data.slides.map((slide, i) => renderSlide(slide, i))}
      </div>
    </div>
  );
}
