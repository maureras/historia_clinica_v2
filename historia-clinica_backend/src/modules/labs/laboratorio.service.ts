// =====================================================
// 📁 src/modules/laboratorio/laboratorio.service.ts
// =====================================================
import { prisma } from "../../db/prisma";
import fs from 'fs/promises';
import path from 'path';
import type { LaboratorioAnalisis, LaboratorioResultado } from './laboratorio.types';

// Tipos mínimos para la respuesta de Gemini
type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };
type GeminiContent = { parts: GeminiPart[] };
type GeminiCandidate = { content: GeminiContent };
interface GeminiResponse { candidates: GeminiCandidate[] }

// Asegurar que el directorio de subida exista
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const ensureUploadDirExists = async () => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    console.log('📁 Directorio de uploads verificado:', UPLOAD_DIR);
  } catch (error) {
    console.error("Error creating upload directory:", error);
  }
};
ensureUploadDirExists();

export const LaboratorioService = {
  /**
   * Procesa un archivo de laboratorio subido, lo analiza con IA y guarda los resultados.
   */
  async procesarArchivo(file: Express.Multer.File, pacienteId: number, consultaId?: number) {
    if (!file) {
      throw new Error("No se proporcionó ningún archivo.");
    }

    console.log('🔬 Iniciando procesamiento de archivo:', file.originalname);

    // 1. Guardar el archivo físicamente
    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const newFileName = `lab_${pacienteId}_${timestamp}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, newFileName);
    
    await fs.rename(file.path, filePath);
    const fileUrl = `/uploads/${newFileName}`;

    console.log('📁 Archivo guardado en:', filePath);

    // 2. Verificar que el paciente existe
    const paciente = await prisma.paciente.findUnique({
      where: { id: pacienteId }
    });

    if (!paciente) {
      // Limpiar archivo si el paciente no existe
      await fs.unlink(filePath).catch(console.error);
      throw new Error(`Paciente con ID ${pacienteId} no encontrado`);
    }

    // 3. Inicializar variable dataFromAI con valor por defecto
    let dataFromAI: LaboratorioAnalisis = {
      fecha_informe: new Date().toISOString().split('T')[0],
      resumen_hallazgos: "Procesando análisis...",
      resultados: []
    };

    try {
      // 4. Convertir el archivo a base64 para la API de IA
      const fileBuffer = await fs.readFile(filePath);
      const base64Data = fileBuffer.toString('base64');

      // 5. Definir el prompt y el esquema JSON para la IA
      const prompt = `
        Analiza este informe de laboratorio médico. Extrae la siguiente información en formato JSON:
        1. 'fecha_informe': La fecha en que se emitió el informe (formato YYYY-MM-DD).
        2. 'resultados': Una lista de todas las pruebas. Cada prueba debe tener: 'prueba', 'valor', 'unidad' y 'rango' de referencia.
        3. 'resumen_hallazgos': Un resumen conciso (máximo 50 palabras) de los hallazgos más importantes o anormales. Si todo es normal, indícalo.
        
        IMPORTANTE: Si no puedes extraer la información, devuelve valores por defecto razonables.
      `;

      const jsonSchema = {
        type: "object",
        properties: {
          fecha_informe: { 
            type: "string", 
            description: "Fecha del informe en formato YYYY-MM-DD" 
          },
          resumen_hallazgos: { 
            type: "string", 
            description: "Resumen de los hallazgos principales" 
          },
          resultados: {
            type: "array",
            items: {
              type: "object",
              properties: {
                prueba: { type: "string" },
                valor: { type: "string" },
                unidad: { type: "string" },
                rango: { type: "string" },
              },
              required: ["prueba", "valor"]
            }
          }
        },
        required: ["resumen_hallazgos", "resultados"]
      };

      // 6. Llamar a la API de Gemini (solo si hay API key)
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (apiKey) {
        console.log('🤖 Analizando con IA...');
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
        
        const payload = {
          contents: [{
            parts: [
              { text: prompt },
              { 
                inlineData: { 
                  mimeType: file.mimetype, 
                  data: base64Data 
                } 
              }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: jsonSchema
          }
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = (await response.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };

          // Busca el primer 'part' con texto
          const textPart = result?.candidates?.[0]?.content?.parts?.find(
            (p) => typeof p.text === "string"
          );
          const jsonText = textPart?.text ?? "{}";

          try {
            dataFromAI = JSON.parse(jsonText) as LaboratorioAnalisis;
          } catch {
            // Fallback si el texto no es JSON válido
            dataFromAI = {
              fecha_informe: new Date().toISOString().split("T")[0],
              resumen_hallazgos: "No se pudo parsear el JSON devuelto por la IA.",
              resultados: [
                {
                  prueba: "Archivo",
                  valor: file.originalname,
                  unidad: "archivo",
                  rango: "N/A",
                },
              ],
            };
          }

          console.log("✅ Análisis IA completado:", dataFromAI);
        } else {
          throw new Error(`Error en la API de IA: ${response.statusText}`);
        }
      }
    } catch (aiError) {
      console.error('❌ Error en análisis IA:', aiError);
      // Fallback si falla la IA
      dataFromAI = {
        fecha_informe: new Date().toISOString().split('T')[0],
        resumen_hallazgos: "Archivo subido correctamente. Error en análisis automático.",
        resultados: [
          {
            prueba: "Archivo procesado",
            valor: file.originalname,
            unidad: "archivo",
            rango: "Revisar manualmente"
          }
        ]
      };
    }

const archivoLab = await (prisma as any).laboratorioArchivo.create({
      data: {
        pacienteId: pacienteId,
        consultaId: consultaId,
        nombreArchivo: file.originalname,
        urlArchivo: fileUrl,
        fechaInforme: dataFromAI.fecha_informe ? new Date(dataFromAI.fecha_informe) : new Date(),
        resumenHallazgos: dataFromAI.resumen_hallazgos,
        resultados: {
          create: dataFromAI.resultados.map((resultado: LaboratorioResultado) => ({
            prueba: resultado.prueba,
            valor: String(resultado.valor),
            unidad: resultado.unidad || null,
            rango: resultado.rango || null,
          }))
        }
      },
      include: {
        resultados: true,
        paciente: {
          select: {
            nombres: true,
            apellidos: true,
            numeroIdentificacion: true
          }
        }
      }
    });

    console.log('💾 Laboratorio guardado en BD:', archivoLab.id);

    // 8. Formatear la respuesta para el frontend
    return {
      id: archivoLab.id,
      archivo: archivoLab.nombreArchivo,
      url: archivoLab.urlArchivo,
      fecha_informe: archivoLab.fechaInforme?.toISOString().split('T')[0] || null,
      resumen_hallazgos: archivoLab.resumenHallazgos,
resultados: archivoLab.resultados.map((resultado: LaboratorioResultado) => ({
  prueba: resultado.prueba,
  valor: resultado.valor,
  unidad: resultado.unidad,
  rango: resultado.rango,
})),
      paciente: archivoLab.paciente
    };
  },

  /**
   * Obtiene todos los laboratorios de un paciente
   */
  async obtenerPorPaciente(pacienteId: number) {
return await (prisma as any).laboratorioArchivo.findMany({
      where: { pacienteId },
      include: {
        resultados: true,
        consulta: {
          select: {
            id: true,
            fecha: true,
            motivo: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Obtiene un laboratorio específico por ID
   */
  async obtenerPorId(id: number) {
return await (prisma as any).laboratorioArchivo.findUnique({ 
        where: { id },
      include: {
        resultados: true,
        paciente: {
          select: {
            nombres: true,
            apellidos: true,
            numeroIdentificacion: true
          }
        },
        consulta: {
          select: {
            id: true,
            fecha: true,
            motivo: true
          }
        }
      }
    });
  }
};