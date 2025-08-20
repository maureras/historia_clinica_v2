// =====================================================
// 📁 src/modules/laboratorio/laboratorio.controller.ts
// =====================================================
import { Request, Response, NextFunction } from 'express';
import { LaboratorioService } from './laboratorio.service';
import { UploadLaboratorioSchema } from './laboratorio.types';

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
  }
};