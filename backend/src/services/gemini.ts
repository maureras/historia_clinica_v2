import { env } from '../config/env'

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}

export async function analyzeWithGemini(fileBase64: string, mimeType: string) {
  if (!env.GEMINI_API_KEY) return null

  const prompt = `
Analiza este informe de laboratorio médico. Extrae la siguiente información en formato JSON:
1. 'fecha_informe' (YYYY-MM-DD).
2. 'resultados': [{ 'prueba','valor','unidad','rango' }].
3. 'resumen_hallazgos' (<=100 palabras).
Si no puedes extraer, devuelve valores por defecto razonables.
`

  const jsonSchema = {
    type: "object",
    properties: {
      fecha_informe: { type: "string", description: "Fecha del informe en formato YYYY-MM-DD" },
      resumen_hallazgos: { type: "string", description: "Resumen de los hallazgos principales" },
      resultados: {
        type: "array",
        items: {
          type: "object",
          properties: {
            prueba: { type: "string" },
            valor: { type: "string" },
            unidad: { type: "string" },
            rango: { type: "string" }
          },
          required: ["prueba", "valor"]
        }
      }
    },
    required: ["fecha_informe", "resumen_hallazgos", "resultados"]
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${env.GEMINI_API_KEY}`

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: fileBase64 } }
      ]
    }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: jsonSchema
    }
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const t = await res.text()
    console.error('Gemini error:', res.status, t)
    return null
  }

  const data = await res.json() as GeminiResponse
  const textPart = data?.candidates?.[0]?.content?.parts?.find(p => typeof p.text === 'string')
  if (!textPart?.text) return null

  try {
    return JSON.parse(textPart.text) as {
      fecha_informe: string
      resumen_hallazgos: string
      resultados: Array<{ prueba: string, valor: string, unidad?: string, rango?: string }>
    }
  } catch {
    return null
  }
}
