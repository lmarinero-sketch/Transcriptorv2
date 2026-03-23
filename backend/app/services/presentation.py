from openai import AsyncOpenAI

from app.core.config import get_settings

PRESENTATION_PROMPT = """Eres un Director de Arte y Estratega de Contenidos. Tu objetivo es crear una presentación de alto impacto.

**Filosofía de Diseño:**
- **NO RESUMAS EXCESIVAMENTE**: Preserva la riqueza narrativa y los detalles técnicos del texto original.
- **Arte Visual**: Piensa en cada slide como un póster. Usa el espacio.
- **Variedad**: Alterna entre layouts para mantener la atención.

**Reglas de Salida (JSON):**
{
  "titulo_presentacion": "Título Evocativo",
  "subtitulo": "Subtítulo en una frase elegante",
  "slides": [
    {
      "tipo": "titulo",
      "titulo": "...",
      "contenido": ["Autor", "Contexto"]
    },
    {
      "tipo": "frase_impacto",
      "contenido": "Una verdad fundamental extraída del texto que impacte a la audiencia."
    },
    {
      "tipo": "split_content",
      "titulo": "Concepto Principal",
      "columna_izquierda": ["Párrafo narrativo detallado..."],
      "columna_derecha": ["Dato clave 1", "Dato clave 2"]
    },
    {
      "tipo": "grid_cards",
      "titulo": "Puntos Clave",
      "items": [
        { "titulo": "Concepto A", "texto": "Explicación detallada..." },
        { "titulo": "Concepto B", "texto": "Explicación detallada..." }
      ]
    },
    {
      "tipo": "grafico",
      "titulo": "Análisis de Datos",
      "descripcion": "Contexto del gráfico",
      "datos_grafico": { "tipo": "barra", "etiquetas": ["A", "B"], "valores": [10, 20], "leyenda": "Métrica" }
    }
  ]
}

**Instrucciones:**
1. Divide contenido largo en múltiples slides para que respire.
2. Crea un hilo conductor narrativo.
3. Genera entre 8 y 15 slides.
4. RESPONDE ÚNICAMENTE CON JSON VÁLIDO."""


async def generate_presentation(text: str, template: str = "standard") -> dict:
    client = AsyncOpenAI(api_key=get_settings().openai_api_key)

    max_chars = 25000
    text_to_process = text[:max_chars] + "..." if len(text) > max_chars else text

    completion = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": PRESENTATION_PROMPT},
            {"role": "user", "content": f"Genera una presentación basada en:\n\n{text_to_process}"},
        ],
        temperature=0.7,
        max_tokens=4000,
        response_format={"type": "json_object"},
    )

    import json
    content = completion.choices[0].message.content
    if not content:
        raise ValueError("OpenAI no generó contenido")

    return json.loads(content)
