// src/modules/signos-vitales/signosVitales.controller.ts
import { Request, Response, NextFunction } from 'express';
import { SignosVitalesService } from './signosVitales.service.js';
import { CreateSignosVitalesSchema, UpdateSignosVitalesSchema } from './signosVitales.schema.js';

export const SignosVitalesController = {
  /**
   * ✅ CREAR: Maneja la creación de un nuevo registro de signos vitales.
   */
  crear: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = CreateSignosVitalesSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ ok: false, error: "Datos inválidos", details: validationResult.error.errors });
      }

      const signosVitales = await SignosVitalesService.crear(validationResult.data);
      res.status(201).json({ ok: true, data: signosVitales, message: "Signos vitales registrados exitosamente" });
    } catch (error) {
      next(error);
    }
  },

  /**
   * ✅ OBTENER ÚLTIMO POR PACIENTE: Busca el registro más reciente para un paciente.
   */
  obtenerUltimoPorPaciente: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pacienteId = parseInt(req.params.pacienteId, 10);
      if (isNaN(pacienteId)) {
        return res.status(400).json({ ok: false, error: "ID de paciente inválido" });
      }

      const registro = await SignosVitalesService.obtenerUltimoPorPaciente(pacienteId);
      if (!registro) {
        return res.status(404).json({ ok: false, error: "No se encontraron signos vitales para este paciente" });
      }
      res.json({ ok: true, data: registro });
    } catch (error) {
      next(error);
    }
  },

  /**
   * ✅ OBTENER POR CONSULTA: Busca el registro asociado a una consulta.
   */
  obtenerPorConsulta: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const consultaId = parseInt(req.params.consultaId, 10);
      if (isNaN(consultaId)) {
        return res.status(400).json({ ok: false, error: "ID de consulta inválido" });
      }

      const registro = await SignosVitalesService.obtenerPorConsulta(consultaId);
      if (!registro) {
        return res.status(404).json({ ok: false, error: "No se encontraron signos vitales para esta consulta" });
      }
      res.json({ ok: true, data: registro });
    } catch (error) {
      next(error);
    }
  },

  /**
   * ✅ ACTUALIZAR: Modifica un registro de signos vitales existente.
   */
  actualizar: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ ok: false, error: "ID de registro inválido" });
      }

      const validationResult = UpdateSignosVitalesSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ ok: false, error: "Datos inválidos", details: validationResult.error.errors });
      }

      const registroActualizado = await SignosVitalesService.actualizar(id, validationResult.data);
      res.json({ ok: true, data: registroActualizado, message: "Signos vitales actualizados" });
    } catch (error) {
      next(error);
    }
  },

  /**
   * ✅ ELIMINAR: Borra un registro de signos vitales.
   */
  eliminar: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ ok: false, error: "ID de registro inválido" });
      }

      await SignosVitalesService.eliminar(id);
      res.json({ ok: true, message: "Registro de signos vitales eliminado" });
    } catch (error) {
      next(error);
    }
  },
};
