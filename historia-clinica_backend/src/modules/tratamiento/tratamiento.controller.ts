// src/modules/tratamiento/tratamiento.controller.ts
import { Request, Response, NextFunction } from 'express';
import { TratamientoService } from './tratamiento.service.js';
import { CreateTratamientoSchema, UpdateTratamientoSchema } from './tratamiento.schema.js';

export const TratamientoController = {
  crear: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = CreateTratamientoSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ ok: false, error: "Datos inválidos", details: validationResult.error.errors });
      }
      const tratamiento = await TratamientoService.crear(validationResult.data);
      res.status(201).json({ ok: true, data: tratamiento, message: "Plan de tratamiento registrado." });
    } catch (error) {
      next(error);
    }
  },

  obtenerUltimoPorPaciente: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pacienteId = parseInt(req.params.pacienteId, 10);
      const registro = await TratamientoService.obtenerUltimoPorPaciente(pacienteId);
      if (!registro) {
        return res.status(404).json({ ok: false, error: "No se encontró plan de tratamiento para este paciente." });
      }
      res.json({ ok: true, data: registro });
    } catch (error) {
      next(error);
    }
  },

  obtenerPorConsulta: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const consultaId = parseInt(req.params.consultaId, 10);
      const registro = await TratamientoService.obtenerPorConsulta(consultaId);
      if (!registro) {
        return res.status(404).json({ ok: false, error: "No se encontró plan de tratamiento para esta consulta." });
      }
      res.json({ ok: true, data: registro });
    } catch (error) {
      next(error);
    }
  },

  actualizar: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const validationResult = UpdateTratamientoSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ ok: false, error: "Datos inválidos", details: validationResult.error.errors });
      }
      const registro = await TratamientoService.actualizar(id, validationResult.data);
      res.json({ ok: true, data: registro, message: "Plan de tratamiento actualizado." });
    } catch (error) {
      next(error);
    }
  },
};
