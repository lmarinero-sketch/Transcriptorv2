from openai import AsyncOpenAI

from app.core.config import get_settings
from app.services.transcription import estimate_tokens, split_into_chunks

SYSTEM_PROMPTS = {
    "entrevista-trabajo": """Eres un experto en recursos humanos. Analiza esta transcripción de una entrevista de trabajo y proporciona:

1. **Perfil del Candidato**: Resumen de su experiencia y habilidades
2. **Fortalezas Principales**: Lista las 3-5 fortalezas más destacadas
3. **Áreas de Mejora**: Identifica 2-3 debilidades o áreas de desarrollo
4. **Recomendación**: Indica si recomendarías contratar al candidato y por qué
5. **Puntos Clave**: Cualquier información relevante adicional

Formato tu respuesta de manera clara y estructurada.""",

    "reunion-cliente": """Eres un analista de negocios experto. Analiza esta transcripción de una reunión con cliente y extrae:

1. **Requerimientos Identificados**: Lista todos los requerimientos mencionados
2. **Lista de Tareas**: Acciones específicas que deben realizarse
3. **Tono y Actitud del Cliente**: Evalúa el nivel de satisfacción y compromiso
4. **Prioridades**: Identifica qué es más urgente o importante
5. **Próximos Pasos**: Recomendaciones para el seguimiento

Organiza la información de forma clara y accionable.""",

    "resumen-general": """Eres un asistente experto en análisis de contenido. Proporciona un resumen completo de esta transcripción incluyendo:

1. **Resumen Ejecutivo**: Síntesis en 2-3 párrafos del contenido principal
2. **Puntos Clave**: Lista de los 5-7 puntos más importantes
3. **Temas Principales**: Categoriza los temas discutidos
4. **Conclusiones**: Principales conclusiones o decisiones
5. **Información Relevante**: Cualquier dato, fecha o compromiso mencionado

Presenta la información de manera clara y bien estructurada.""",

    "minutas": """Eres un secretario/a ejecutivo/a profesional especializado en generar actas de reunión (minutas) formales.

A partir de la transcripción, genera un documento de MINUTAS profesional con la siguiente estructura:

---

# 📋 MINUTA DE REUNIÓN

**Fecha:** [Extraer del contexto o indicar "Por confirmar"]
**Duración estimada:** [Basado en la extensión del contenido]
**Participantes detectados:** [Listar todos los hablantes o roles identificados]

---

## 1. ORDEN DEL DÍA
Lista numerada de los temas tratados en la reunión.

## 2. DESARROLLO DE LA REUNIÓN
Para cada tema del orden del día, describe:
- Qué se discutió
- Quién intervino (si es identificable)
- Qué posiciones o ideas se plantearon

## 3. ACUERDOS Y DECISIONES
Lista clara y numerada de todas las decisiones tomadas durante la reunión.

## 4. TAREAS Y RESPONSABLES
Tabla o lista con:
- **Tarea**: Descripción de la acción
- **Responsable**: Quién debe ejecutarla (si es identificable)
- **Plazo**: Fecha límite mencionada (si la hay)
- **Prioridad**: Alta / Media / Baja

## 5. TEMAS PENDIENTES
Puntos que quedaron sin resolver o que requieren seguimiento futuro.

## 6. PRÓXIMA REUNIÓN
Si se mencionó, indicar fecha/hora/tema de la siguiente reunión.

---

**IMPORTANTE:**
- Sé exhaustivo: no omitas ningún tema discutido
- Usa lenguaje formal y profesional
- Cita textualmente frases clave cuando sean relevantes
- Si no puedes identificar nombres de participantes, usa "Participante 1", "Participante 2", etc.
- Incluye timestamps aproximados si es posible""",
}

MAX_TOKENS = 6000


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=get_settings().openai_api_key)


async def _analyze_chunk(client: AsyncOpenAI, text: str, analysis_type: str, label: str = "") -> str:
    user_msg = f"{label}\n\nTranscripción a analizar:\n\n{text}" if label else f"Transcripción a analizar:\n\n{text}"

    completion = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPTS[analysis_type]},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.7,
        max_tokens=4000,
    )
    return completion.choices[0].message.content or "No se pudo generar el análisis"


async def analyze_text(text: str, analysis_type: str) -> dict:
    if analysis_type not in SYSTEM_PROMPTS:
        analysis_type = "resumen-general"

    client = _get_client()
    tokens = estimate_tokens(text)
    was_chunked = False

    if tokens <= MAX_TOKENS:
        analysis = await _analyze_chunk(client, text, analysis_type)
    else:
        was_chunked = True
        chunks = split_into_chunks(text, MAX_TOKENS)
        analyses = []
        for i, chunk in enumerate(chunks):
            result = await _analyze_chunk(client, chunk, analysis_type, f"Parte {i+1} de {len(chunks)}")
            analyses.append(result)

        if analysis_type == "minutas":
            # For minutas, merge all parts into one consolidated document
            combined = "\n\n".join(analyses)
            consolidation = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Eres un secretario ejecutivo. Se te entregan las minutas parciales de una misma reunión "
                            "procesada en partes. Tu trabajo es CONSOLIDAR todo en un único documento de minutas "
                            "coherente, sin repetir información. Mantén la estructura formal de minutas."
                        ),
                    },
                    {"role": "user", "content": f"Consolida estas minutas parciales en un solo documento:\n\n{combined}"},
                ],
                temperature=0.5,
                max_tokens=4000,
            )
            analysis = consolidation.choices[0].message.content or combined
        else:
            parts = "\n\n".join(
                f"━━━ PARTE {i+1} DE {len(analyses)} ━━━\n\n{a}"
                for i, a in enumerate(analyses)
            )
            analysis = f"📋 ANÁLISIS COMPLETO (procesado en {len(analyses)} partes)\n\n{parts}"

    return {
        "analysis": analysis,
        "analysis_type": analysis_type,
        "estimated_tokens": tokens,
        "was_chunked": was_chunked,
    }


async def generate_concept_map(text: str) -> dict:
    """Generate a concept map from analysis text using GPT."""
    client = _get_client()

    completion = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Eres un experto en análisis de contenido y visualización de información. "
                    "A partir del texto dado, genera un mapa conceptual estructurado en formato JSON. "
                    "El mapa debe tener un tema central y ramas con sub-temas.\n\n"
                    "Responde ÚNICAMENTE con JSON válido, sin markdown ni comentarios. "
                    "Formato exacto:\n"
                    '{\n'
                    '  "central": "Tema Principal",\n'
                    '  "branches": [\n'
                    '    {\n'
                    '      "topic": "Rama 1",\n'
                    '      "color": "#00FF88",\n'
                    '      "items": ["Sub-tema A", "Sub-tema B"]\n'
                    '    }\n'
                    '  ]\n'
                    '}\n\n'
                    "Reglas:\n"
                    "- Máximo 6 ramas principales\n"
                    "- Máximo 4 items por rama\n"
                    "- Textos cortos y concisos (máximo 6 palabras por item)\n"
                    "- Usa estos colores para las ramas en orden: #00FF88, #00D1FF, #FACC15, #FF3131, #A78BFA, #FB923C\n"
                    "- El tema central debe ser un resumen de 2-4 palabras"
                ),
            },
            {"role": "user", "content": f"Genera el mapa conceptual para este contenido:\n\n{text[:4000]}"},
        ],
        temperature=0.5,
        max_tokens=1500,
    )

    import json
    raw = completion.choices[0].message.content or "{}"
    # Strip markdown code fences if present
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    raw = raw.strip()

    try:
        concept_map = json.loads(raw)
    except json.JSONDecodeError:
        concept_map = {
            "central": "Resumen de la Reunión",
            "branches": [
                {"topic": "Error al parsear", "color": "#FF3131", "items": ["Intenta de nuevo"]}
            ],
        }

    return concept_map
