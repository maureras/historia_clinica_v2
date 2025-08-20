// src/modules/laboratorio/laboratorio.controller.ts - TypeScript Safe

import { Request, Response, NextFunction } from 'express';
import { LaboratorioService } from './laboratorio.service';
import { UploadLaboratorioSchema } from './laboratorio.types';
import { WatermarkService } from '../../services/watermark.service';
import path from 'path';
import fs from 'fs/promises';

export const LaboratorioController = {
  /**
   * Maneja la subida y procesamiento de un archivo de laboratorio.
   */
  upload: async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('📁 Recibiendo archivo de laboratorio:', req.file);
      console.log('📋 Body recibido:', req.body);

      if (!req.file) {
        return res.status(400).json({ 
          ok: false, 
          error: "No se ha subido ningún archivo.",
          message: "Por favor seleccione un archivo para subir."
        });
      }

      const validationResult = UploadLaboratorioSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          ok: false, 
          error: "Datos inválidos", 
          message: "ID de paciente requerido",
          details: validationResult.error.errors 
        });
      }
      
      const { paciente_id, consulta_id } = validationResult.data;

      console.log(`🔬 Procesando laboratorio para paciente ${paciente_id}, consulta ${consulta_id || 'N/A'}`);

      const resultado = await LaboratorioService.procesarArchivo(
        req.file, 
        paciente_id, 
        consulta_id
      );

      console.log('✅ Laboratorio procesado exitosamente:', resultado);

      res.status(201).json({
        ok: true,
        data: resultado,
        message: "Archivo procesado y guardado exitosamente."
      });

    } catch (error: any) {
      console.error("[LAB_CONTROLLER] Error:", error);
      
      res.status(500).json({
        ok: false,
        error: "PROCESSING_ERROR",
        message: error.message || "Error al procesar el archivo de laboratorio"
      });
    }
  },

  /**
   * Descarga un archivo con marca de agua
   */
  downloadWithWatermark: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const watermarkModel = req.query.watermark as string || 'grid';
      const intensity = parseFloat(req.query.intensity as string) || 0.15;

      console.log(`📥 Descargando laboratorio ${id} con marca de agua: ${watermarkModel}`);

      // 1. Obtener información del laboratorio
      const laboratorio = await LaboratorioService.obtenerPorId(Number(id));
      
      if (!laboratorio) {
        return res.status(404).json({
          ok: false,
          error: 'NOT_FOUND',
          message: 'Laboratorio no encontrado'
        });
      }

      // 2. ✅ ACCESO SEGURO A PROPIEDADES usando notación de índice
      const labAny = laboratorio as any;
      
      // Buscar la URL del archivo en diferentes posibles propiedades
      const fileUrl = labAny['url'] || 
                     labAny['ruta'] || 
                     labAny['archivo_url'] || 
                     labAny['archivoUrl'] ||
                     labAny['rutaArchivo'] ||
                     labAny['path'];
                     
      // Buscar el nombre del archivo
      const fileName = labAny['archivo'] || 
                      labAny['nombreArchivo'] || 
                      labAny['nombre_archivo'] || 
                      labAny['archivo_nombre'] ||
                      labAny['filename'] ||
                      labAny['name'];
      
      console.log('🔍 Propiedades encontradas:', {
        fileUrl,
        fileName,
        allKeys: Object.keys(laboratorio)
      });
      
      if (!fileUrl) {
        return res.status(404).json({
          ok: false,
          error: 'FILE_URL_NOT_FOUND',
          message: 'URL del archivo no encontrada',
          debug: {
            availableProperties: Object.keys(laboratorio),
            laboratorio: laboratorio
          }
        });
      }

      const filePath = path.join(process.cwd(), 'uploads', path.basename(fileUrl));
      
      // Verificar que el archivo existe
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          ok: false,
          error: 'FILE_NOT_FOUND',
          message: `Archivo no encontrado en el servidor: ${filePath}`
        });
      }

      // 3. Obtener datos del usuario actual
      const user = WatermarkService.getCurrentUser();

      // 4. Procesar archivo según tipo
      let processedFile: Buffer;
      
      if (WatermarkService.isPDF(filePath)) {
        // Agregar marca de agua a PDF
        processedFile = await WatermarkService.addWatermarkToPDF(filePath, {
          model: watermarkModel as any,
          intensity,
          user
        });

        res.setHeader('Content-Type', 'application/pdf');
      } else {
        // Para imágenes, por ahora usar archivo original
        // TODO: Implementar marca de agua para imágenes
        processedFile = await WatermarkService.addWatermarkToImage(filePath, {
          model: watermarkModel as any,
          intensity,
          user
        });

        // Detectar tipo de imagen
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
          case '.jpg':
          case '.jpeg':
            res.setHeader('Content-Type', 'image/jpeg');
            break;
          case '.png':
            res.setHeader('Content-Type', 'image/png');
            break;
          case '.webp':
            res.setHeader('Content-Type', 'image/webp');
            break;
          default:
            res.setHeader('Content-Type', 'application/octet-stream');
        }
      }

      // 5. Configurar headers de descarga
      const downloadFileName = `${fileName || 'laboratorio'}_con_marca_agua.pdf`;
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
      res.setHeader('Content-Length', processedFile.length);
      
      // 6. Log de auditoría
      console.log(`✅ Archivo descargado con marca de agua por ${user.nombre} (${user.id})`);

      // 7. Enviar archivo procesado
      res.send(processedFile);

    } catch (error: any) {
      console.error('[LAB_CONTROLLER] Error en descarga con marca de agua:', error);
      res.status(500).json({
        ok: false,
        error: 'DOWNLOAD_ERROR',
        message: 'Error al procesar el archivo para descarga',
        details: error.message
      });
    }
  },

  /**
   * Descarga archivo original (sin marca de agua)
   */
  downloadOriginal: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      console.log(`📥 Descargando laboratorio original ${id}`);

      // 1. Obtener información del laboratorio
      const laboratorio = await LaboratorioService.obtenerPorId(Number(id));
      
      if (!laboratorio) {
        return res.status(404).json({
          ok: false,
          error: 'NOT_FOUND',
          message: 'Laboratorio no encontrado'
        });
      }

      // 2. ✅ ACCESO SEGURO A PROPIEDADES usando notación de índice
      const labAny = laboratorio as any;
      
      // Buscar la URL del archivo en diferentes posibles propiedades
      const fileUrl = labAny['url'] || 
                     labAny['ruta'] || 
                     labAny['archivo_url'] || 
                     labAny['archivoUrl'] ||
                     labAny['rutaArchivo'] ||
                     labAny['path'];
                     
      // Buscar el nombre del archivo
      const fileName = labAny['archivo'] || 
                      labAny['nombreArchivo'] || 
                      labAny['nombre_archivo'] || 
                      labAny['archivo_nombre'] ||
                      labAny['filename'] ||
                      labAny['name'];
      
      console.log('🔍 Propiedades encontradas:', {
        fileUrl,
        fileName,
        allKeys: Object.keys(laboratorio)
      });
      
      if (!fileUrl) {
        return res.status(404).json({
          ok: false,
          error: 'FILE_URL_NOT_FOUND',
          message: 'URL del archivo no encontrada',
          debug: {
            availableProperties: Object.keys(laboratorio),
            laboratorio: laboratorio
          }
        });
      }

      const filePath = path.join(process.cwd(), 'uploads', path.basename(fileUrl));
      
      // 3. Verificar que el archivo existe
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          ok: false,
          error: 'FILE_NOT_FOUND',
          message: `Archivo no encontrado en el servidor: ${filePath}`
        });
      }

      // 4. Configurar headers
      const downloadFileName = fileName || `laboratorio_${id}`;
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
      
      // 5. Log de auditoría
      const user = WatermarkService.getCurrentUser();
      console.log(`✅ Archivo original descargado por ${user.nombre} (${user.id})`);

      // 6. Enviar archivo
      res.sendFile(filePath);

    } catch (error: any) {
      console.error('[LAB_CONTROLLER] Error en descarga original:', error);
      res.status(500).json({
        ok: false,
        error: 'DOWNLOAD_ERROR',
        message: 'Error al descargar el archivo',
        details: error.message
      });
    }
  },

  /**
   * Obtiene todos los laboratorios de un paciente
   */
  getByPaciente: async (req: Request, res: Response) => {
    try {
      const pacienteId = Number(req.params.pacienteId);
      
      if (isNaN(pacienteId)) {
        return res.status(400).json({
          ok: false,
          error: "INVALID_ID",
          message: "ID de paciente inválido"
        });
      }

      const laboratorios = await LaboratorioService.obtenerPorPaciente(pacienteId);

      res.json({
        ok: true,
        data: laboratorios
      });

    } catch (error: any) {
      console.error("[LAB_CONTROLLER] Error al obtener laboratorios:", error);
      res.status(500).json({
        ok: false,
        error: "INTERNAL_ERROR",
        message: "Error al obtener laboratorios"
      });
    }
  },

  /**
   * Obtiene un laboratorio específico por ID
   */
  getById: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          ok: false,
          error: "INVALID_ID"
        });
      }

      const laboratorio = await LaboratorioService.obtenerPorId(id);
      
      if (!laboratorio) {
        return res.status(404).json({
          ok: false,
          error: "NOT_FOUND"
        });
      }

      res.json({
        ok: true,
        data: laboratorio
      });

    } catch (error: any) {
      console.error("[LAB_CONTROLLER] Error:", error);
      res.status(500).json({
        ok: false,
        error: "INTERNAL_ERROR"
      });
    }
  },

  /**
   * ✅ MÉTODO DE DEBUG - Para ver estructura del objeto laboratorio
   */
  debug: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const laboratorio = await LaboratorioService.obtenerPorId(Number(id));
      
      if (!laboratorio) {
        return res.status(404).json({
          ok: false,
          error: 'NOT_FOUND'
        });
      }

      // Mostrar todas las propiedades disponibles
      console.log('🔍 Estructura del objeto laboratorio:');
      console.log(JSON.stringify(laboratorio, null, 2));
      
      // Analizar propiedades que podrían contener archivo/url
      const labAny = laboratorio as any;
      const fileProperties = Object.keys(laboratorio).filter(key => 
        key.toLowerCase().includes('archivo') || 
        key.toLowerCase().includes('file') || 
        key.toLowerCase().includes('url') || 
        key.toLowerCase().includes('ruta') || 
        key.toLowerCase().includes('path')
      );

      res.json({
        ok: true,
        debug: true,
        data: laboratorio,
        analysis: {
          totalProperties: Object.keys(laboratorio).length,
          allProperties: Object.keys(laboratorio),
          fileRelatedProperties: fileProperties,
          possibleFileUrl: labAny['url'] || labAny['ruta'] || labAny['archivo_url'] || labAny['archivoUrl'] || 'NOT_FOUND',
          possibleFileName: labAny['archivo'] || labAny['nombreArchivo'] || labAny['filename'] || 'NOT_FOUND'
        },
        message: 'Revisa la consola del servidor y la respuesta JSON para ver la estructura completa'
      });

    } catch (error: any) {
      console.error('[LAB_CONTROLLER] Error en debug:', error);
      res.status(500).json({
        ok: false,
        error: 'DEBUG_ERROR',
        message: error.message
      });
    }
  }
};