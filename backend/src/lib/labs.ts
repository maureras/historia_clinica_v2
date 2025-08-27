// src/lib/labs.ts
export interface AnalyzeLabParams {
  patientId: string
  consultationId?: string
  // En backend no usamos `File` del DOM; usa Buffer o path del archivo si lo requieres.
  fileBuffer?: Buffer
  fileName?: string
  mimeType?: string
  texto?: string
}

export interface AnalyzeLabResult {
  resumen?: string
  fecha_informe?: string | null
  resumen_hallazgos?: string | null
  values?: Array<{
    prueba: string
    valor: string
    unidad?: string
    rango?: string
    flag?: string
    categoria?: string
  }>
}

// Implementa aquí la llamada a tu proveedor de IA (Gemini, etc.) si quieres reutilizarla
// desde el handler. De momento dejamos una función stub para evitar importaciones erróneas.
export async function analyzeLabInternal(_params: AnalyzeLabParams): Promise<AnalyzeLabResult> {
  throw new Error(
    'analyzeLabInternal(): Implementa la integración con tu proveedor de IA aquí o invoca directamente desde el handler en /routes/labs.ts. No importes \'@/lib/api\' en el backend.'
  )
}