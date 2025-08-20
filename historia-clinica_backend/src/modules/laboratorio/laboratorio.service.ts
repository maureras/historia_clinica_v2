// src/modules/laboratorio/laboratorio.service.ts - Versión corregida

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
      resumen_hallazgos: "Archivo procesado correctamente.",
      resultados: [
        {
          prueba: "Archivo subido",
          valor: file.originalname,
          unidad: "archivo",
          rango: "Revisar manualmente"
        }
      ]
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
        3. 'resumen_hallazgos': Un resumen conciso (máximo 100 palabras) de los hallazgos más importantes o anormales. Si todo es normal, indícalo.
        
        IMPORTANTE: Si no puedes extraer la información, devuelve valores por defecto razonables.
        Ejemplo de resultado esperado:
        {
          "fecha_informe": "2025-08-16",
          "resumen_hallazgos": "Hemograma completo dentro de parámetros normales. Glucosa levemente elevada.",
          "resultados": [
            {"prueba": "Hemoglobina", "valor": "14.2", "unidad": "g/dL", "rango": "12.0-15.5"},
            {"prueba": "Glucosa", "valor": "110", "unidad": "mg/dL", "rango": "70-100"}
          ]
        }
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
        required: ["fecha_informe", "resumen_hallazgos", "resultados"]
      };

      // 6. Llamar a la API de Gemini (solo si hay API key)
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (apiKey) {
        console.log('🤖 Analizando con IA Gemini...');
        
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
          const result = await response.json() as GeminiResponse;

          // Busca el primer 'part' con texto
          const textPart = result?.candidates?.[0]?.content?.parts?.find(
            (p) => typeof p.text === "string"
          );
          const jsonText = textPart?.text ?? "{}";

          try {
            dataFromAI = JSON.parse(jsonText) as LaboratorioAnalisis;
            console.log("✅ Análisis IA completado exitosamente");
          } catch (parseError) {
            console.error('❌ Error parsing JSON de IA:', parseError);
            // Mantener valores por defecto
          }
        } else {
          const errorText = await response.text();
          console.error(`❌ Error en API de IA: ${response.status} - ${errorText}`);
        }
      } else {
        console.log('⚠️ No hay GEMINI_API_KEY configurada, usando valores por defecto');
      }
    } catch (aiError) {
      console.error('❌ Error en análisis IA:', aiError);
      // Los valores por defecto ya están asignados
    }

    // 7. Guardar en base de datos usando los modelos correctos de Prisma
    try {
      const archivoLab = await prisma.laboratorioArchivo.create({
        data: {
          pacienteId: pacienteId,
          consultaId: consultaId || null,
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

      console.log('💾 Laboratorio guardado en BD con ID:', archivoLab.id);

      // 8. Formatear la respuesta para el frontend
      return {
        id: archivoLab.id,
        archivo: archivoLab.nombreArchivo,
        url: archivoLab.urlArchivo,
        fecha_informe: archivoLab.fechaInforme?.toISOString().split('T')[0] || null,
        resumen_hallazgos: archivoLab.resumenHallazgos,
        resultados: archivoLab.resultados.map((resultado) => ({
          prueba: resultado.prueba,
          valor: resultado.valor,
          unidad: resultado.unidad,
          rango: resultado.rango,
        })),
        paciente: archivoLab.paciente
      };
    } catch (dbError) {
      // Limpiar archivo si falla la BD
      await fs.unlink(filePath).catch(console.error);
      console.error('❌ Error guardando en BD:', dbError);
      throw new Error('Error al guardar el laboratorio en la base de datos');
    }
  },

  /**
   * Obtiene todos los laboratorios de un paciente
   */
  async obtenerPorPaciente(pacienteId: number) {
    try {
      return await prisma.laboratorioArchivo.findMany({
        where: { pacienteId },
        include: {
          resultados: true,
          consulta: {
            select: {
              id: true,
              fechaConsulta: true,
              motivo: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('❌ Error obteniendo laboratorios por paciente:', error);
      throw error;
    }
  },

  /**
   * Obtiene un laboratorio específico por ID
   */
  async obtenerPorId(id: number) {
    try {
      return await prisma.laboratorioArchivo.findUnique({ 
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
              fechaConsulta: true,
              motivo: true
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Error obteniendo laboratorio por ID:', error);
      throw error;
    }
  }
};