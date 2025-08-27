
const pdf: (data: Buffer | Uint8Array) => Promise<{ text: string; numpages?: number; info?: unknown; version?: string }> = require('pdf-parse')

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer)
  return data.text || ''
}

export function parseLabValuesFromText(text: string) {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  const values: Array<{prueba:string, valor:string, unidad?:string, rango?:string}> = []

  const re = /^([A-Za-zÁÉÍÓÚÑáéíóúñ\s\.\-\/]+)\s*[:\-]\s*([0-9]+(?:[\.,][0-9]+)?)\s*([A-Za-z%\/µ\^\d]*)?\s*\(?([0-9]+(?:[\.,][0-9]+)?\s*[-–]\s*[0-9]+(?:[\.,][0-9]+)?)?\)?/u

  for (const ln of lines) {
    const m = ln.match(re)
    if (m) {
      const prueba = m[1].trim()
      const valor = (m[2] ?? '').replace(',', '.')
      const unidad = (m[3] ?? '').trim() || undefined
      const rango  = (m[4] ?? '').replace(',', '.').trim() || undefined
      values.push({ prueba, valor, unidad, rango })
    }
  }
  return values
}
