// src/modules/exploracion-fisica/exploracionFisica.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ExploracionFisicaService } from './exploracionFisica.service.js';
import { CreateExploracionFisicaSchema, UpdateExploracionFisicaSchema } from './exploracionFisica.schema.js';

export const ExploracionFisicaController = {
  crear: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = CreateExploracionFisicaSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ ok: false, error: "Datos inválidos", details: validationResult.error.errors });
      }
      const exploracion = await ExploracionFisicaService.crear(validationResult.data);
      res.status(201).json({ ok: true, data: exploracion, message: "Exploración física registrada." });
    } catch (error) {
      next(error);
    }
  },

  obtenerUltimoPorPaciente: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pacienteId = parseInt(req.params.pacienteId, 10);
      const registro = await ExploracionFisicaService.obtenerUltimoPorPaciente(pacienteId);
      if (!registro) {
        return res.status(404).json({ ok: false, error: "No se encontró exploración física para este paciente." });
      }
      res.json({ ok: true, data: registro });
    } catch (error) {
      next(error);
    }
  },

  obtenerPorConsulta: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const consultaId = parseInt(req.params.consultaId, 10);
      const registro = await ExploracionFisicaService.obtenerPorConsulta(consultaId);
      if (!registro) {
        return res.status(404).json({ ok: false, error: "No se encontró exploración física para esta consulta." });
      }
      res.json({ ok: true, data: registro });
    } catch (error) {
      next(error);
    }
  },

  actualizar: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const validationResult = UpdateExploracionFisicaSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ ok: false, error: "Datos inválidos", details: validationResult.error.errors });
      }
      const registro = await ExploracionFisicaService.actualizar(id, validationResult.data);
      res.json({ ok: true, data: registro, message: "Exploración física actualizada." });
    } catch (error) {
      next(error);
    }
  },
};
