// src/modules/labs/labs.service.ts
import fs from 'node:fs/promises';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { DocumentoAnalizado } from './labs.types';

// La definición de tu tipo de entrada, que viene del controller
type ParseInput = {
  filePath: string;
  originalname: string;
  incluirResumen: boolean;
};

/**
 * Extrae texto de un archivo PDF usando el motor pdf.js de Mozilla.
 * Es más robusto que pdf-parse para PDFs con codificación de texto compleja.
 * @param filePath La ruta al archivo PDF en el servidor.
 * @returns Una cadena con el texto extraído del PDF.
 */
async function extractTextWithPdfJs(filePath: string): Promise<string> {
  // Carga dinámica de la librería para que funcione en Node.js
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const fileBuffer = await fs.readFile(filePath);

  const pdfDocument = await pdfjs.getDocument(new Uint8Array(fileBuffer)).promise;
  const allPagesText: string[] = [];

  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => (item as TextItem).str).join(' ');
    allPagesText.push(pageText);
  }
  
  return allPagesText.join('\n\n');
}

/**
 * Orquesta el proceso: extrae texto de un PDF y lo envía a OpenAI para análisis.
 * @param input Objeto con la información del archivo subido.
 * @returns Un objeto con los datos estructurados del laboratorio.
 */
export async function parsePdfWithGPT(input: ParseInput) {
  let extractedText = '';
  try {
    // 1. EXTRAER TEXTO DEL PDF
    extractedText = await extractTextWithPdfJs(input.filePath);

    // Si no se pudo extraer texto, detenemos el proceso aquí.
    if (!extractedText || extractedText.trim().length < 30) {
      console.warn(`PDF sin texto legible: ${input.originalname}`);
      // Devuelve una estructura de error consistente
      return {
        documentos: [{
          archivo: input.originalname,
          fecha_informe: null,
          identificadores: {nombres: null, documento: null},
          resultados: [{ prueba: "ERROR", valor: "El documento está vacío o es una imagen sin texto legible.", unidad: null, rango: null }]
        }],
        resumen_hallazgos: "No se pudo procesar el archivo."
      };
    }

    // 2. LLAMAR A LA API DE OPENAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("La variable de entorno OPENAI_API_KEY no está configurada.");
    }

    // El prompt le dice a la IA exactamente qué hacer y cómo formatear la respuesta.
    const systemPrompt = `Eres un asistente de laboratorio experto en analizar resultados médicos. Extrae la siguiente información del texto de un informe de laboratorio que te proporcionaré. Debes devolver SÓLO un objeto JSON válido, sin explicaciones adicionales. La estructura del JSON debe ser la siguiente:
    {
      "fecha_informe": "YYYY-MM-DD o null si no se encuentra",
      "identificadores": { "nombres": "Nombres y Apellidos del paciente o null", "documento": "Cédula o ID del paciente o null" },
      "resultados": [
        { "prueba": "Nombre del exámen", "valor": "Valor numérico o textual", "unidad": "Unidad de medida o null", "rango": "Rango de referencia o null" }
      ]
    }`;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Modelo potente y eficiente
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analiza el siguiente texto del informe de laboratorio:\n\n---\n${extractedText}\n---` }
        ],
        response_format: { "type": "json_object" } // ¡Fuerza la respuesta a ser JSON!
      }),
    });

    if (!resp.ok) {
      const errorBody = await resp.text();
      throw new Error(`Error en la API de OpenAI (${resp.status}): ${errorBody}`);
    }

    const openAiResponse = await resp.json();
    const content = openAiResponse.choices[0].message.content;
    
    // 3. PROCESAR LA RESPUESTA DE OPENAI
    const parsedJson = JSON.parse(content) as Omit<DocumentoAnalizado, 'archivo'>;

    return {
        documentos: [{
            ...parsedJson,
            archivo: input.originalname // Añadimos el nombre del archivo original
        }],
        resumen_hallazgos: null, // Puedes añadir una segunda llamada a OpenAI para el resumen si lo necesitas
    };

  } finally {
    // 4. LIMPIAR EL ARCHIVO TEMPORAL
    // Es muy importante borrar el archivo subido para no llenar el disco.
    try {
      await fs.unlink(input.filePath);
    } catch (cleanupError) {
      console.error(`Error al limpiar el archivo ${input.filePath}:`, cleanupError);
    }
  }
}