// src/modules/padecimientos/padecimientos.controller.ts
import type { Request, Response } from "express";
import { PadecimientosService } from "./padecimientos.service.js";
import { PadecimientoSchema, PadecimientoUpdateSchema, BuscarPadecimientosSchema } from "./padecimiento.schema.js";

export const PadecimientosController = {
  // ✅ CREAR PADECIMIENTO
  crear: async (req: Request, res: Response) => {
    console.log('🔍 [PADECIMIENTOS_CONTROLLER] Iniciando crear...');
    console.log('🔍 [PADECIMIENTOS_CONTROLLER] req.body:', JSON.stringify(req.body, null, 2));

    try {
      const payload = req.body ?? {};

      // Validar con Zod
      const validationResult = PadecimientoSchema.safeParse(payload);
      
      if (!validationResult.success) {
        console.log('❌ [PADECIMIENTOS_CONTROLLER] Datos inválidos:', validationResult.error.errors);
        return res.status(400).json({ 
          ok: false, 
          error: "Datos inválidos",
          detalles: validationResult.error.errors
        });
      }

      const data = validationResult.data;
      
      // Validar mínimos requeridos
      if (!data.pacienteId) {
        return res.status(400).json({ 
          ok: false, 
          error: "pacienteId es requerido" 
        });
      }

      const creado = await PadecimientosService.crear({
        pacienteId: data.pacienteId,
        motivo: data.motivo,
        tiempo: data.tiempo,
        sintomasAsociados: data.sintomasAsociados,
        descripcion: data.descripcion,
        tratamientoPrevio: data.tratamientoPrevio,
        estado: data.estado,
        consultaId: data.consultaId
      });

      console.log('✅ [PADECIMIENTOS_CONTROLLER] Padecimiento creado exitosamente:', creado.id);

      res.status(201).json({ ok: true, data: creado });

    } catch (error) {
      console.error('❌ [PADECIMIENTOS_CONTROLLER] Error al crear padecimiento:', error);
      res.status(500).json({ 
        ok: false, 
        error: "Error interno del servidor" 
      });
    }
  },

  // ✅ BUSCAR PADECIMIENTOS
  buscar: async (req: Request, res: Response) => {
    try {
      const validationResult = BuscarPadecimientosSchema.safeParse(req.query);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          ok: false, 
          error: "Parámetros de búsqueda inválidos",
          detalles: validationResult.error.errors
        });
      }

      const data = validationResult.data;
      
      // Convertir fechas de string a Date si están presentes
      const params = {
        ...data,
        desde: data.desde ? new Date(data.desde) : undefined,
        hasta: data.hasta ? new Date(data.hasta) : undefined
      };

      // Validar que las fechas sean válidas si se proporcionaron
      if (data.desde && isNaN(params.desde!.getTime())) {
        return res.status(400).json({ 
          ok: false, 
          error: "La fecha 'desde' no es válida" 
        });
      }

      if (data.hasta && isNaN(params.hasta!.getTime())) {
        return res.status(400).json({ 
          ok: false, 
          error: "La fecha 'hasta' no es válida" 
        });
      }

      const resultados = await PadecimientosService.buscar(params);

      res.status(200).json({ ok: true, data: resultados });
    } catch (error) {
      console.error('❌ [PADECIMIENTOS_CONTROLLER] Error al buscar padecimientos:', error);
      res.status(500).json({ 
        ok: false, 
        error: "Error interno del servidor" 
      });
    }
  },

  // ✅ TEST (método de prueba)
  test: async (req: Request, res: Response) => {
    try {
      res.status(200).json({ 
        ok: true, 
        message: "Módulo de padecimientos funcionando correctamente",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [PADECIMIENTOS_CONTROLLER] Error en test:', error);
      res.status(500).json({ 
        ok: false, 
        error: "Error interno del servidor" 
      });
    }
  },

  // ✅ LISTAR POR PACIENTE
  listarPorPaciente: async (req: Request, res: Response) => {
    try {
      const { pacienteId } = req.params;
      
      if (!pacienteId) {
        return res.status(400).json({ 
          ok: false, 
          error: "pacienteId es requerido" 
        });
      }

      const pacienteIdNum = parseInt(pacienteId, 10);
      if (isNaN(pacienteIdNum)) {
        return res.status(400).json({ 
          ok: false, 
          error: "pacienteId debe ser un número válido" 
        });
      }

      const padecimientos = await PadecimientosService.listarPorPaciente(pacienteIdNum);

      res.status(200).json({ ok: true, data: padecimientos });
    } catch (error) {
      console.error('❌ [PADECIMIENTOS_CONTROLLER] Error al listar por paciente:', error);
      res.status(500).json({ 
        ok: false, 
        error: "Error interno del servidor" 
      });
    }
  },

  // ✅ OBTENER PADECIMIENTO ACTIVO
  obtenerActivo: async (req: Request, res: Response) => {
    try {
      const { pacienteId } = req.params;
      
      if (!pacienteId) {
        return res.status(400).json({ 
          ok: false, 
          error: "pacienteId es requerido" 
        });
      }

      const pacienteIdNum = parseInt(pacienteId, 10);
      if (isNaN(pacienteIdNum)) {
        return res.status(400).json({ 
          ok: false, 
          error: "pacienteId debe ser un número válido" 
        });
      }

      const padecimientoActivo = await PadecimientosService.obtenerActivo(pacienteIdNum);

      if (!padecimientoActivo) {
        return res.status(404).json({ 
          ok: false, 
          error: "No se encontró padecimiento activo para este paciente" 
        });
      }

      res.status(200).json({ ok: true, data: padecimientoActivo });
    } catch (error) {
      console.error('❌ [PADECIMIENTOS_CONTROLLER] Error al obtener padecimiento activo:', error);
      res.status(500).json({ 
        ok: false, 
        error: "Error interno del servidor" 
      });
    }
  },

  // ✅ OBTENER POR ID
  obtenerPorId: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          ok: false, 
          error: "ID es requerido" 
        });
      }

      const idNum = parseInt(id, 10);
      if (isNaN(idNum)) {
        return res.status(400).json({ 
          ok: false, 
          error: "ID debe ser un número válido" 
        });
      }

      const padecimiento = await PadecimientosService.obtenerPorId(idNum);

      if (!padecimiento) {
        return res.status(404).json({ 
          ok: false, 
          error: "Padecimiento no encontrado" 
        });
      }

      res.status(200).json({ ok: true, data: padecimiento });
    } catch (error) {
      console.error('❌ [PADECIMIENTOS_CONTROLLER] Error al obtener por ID:', error);
      res.status(500).json({ 
        ok: false, 
        error: "Error interno del servidor" 
      });
    }
  },

  // ✅ ACTUALIZAR PADECIMIENTO
  actualizar: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const payload = req.body ?? {};
      
      if (!id) {
        return res.status(400).json({ 
          ok: false, 
          error: "ID es requerido" 
        });
      }

      const idNum = parseInt(id, 10);
      if (isNaN(idNum)) {
        return res.status(400).json({ 
          ok: false, 
          error: "ID debe ser un número válido" 
        });
      }

      // Validar con Zod
      const validationResult = PadecimientoUpdateSchema.safeParse(payload);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          ok: false, 
          error: "Datos inválidos",
          detalles: validationResult.error.errors
        });
      }

      const data = validationResult.data;
      const actualizado = await PadecimientosService.actualizar(idNum, data);

      if (!actualizado) {
        return res.status(404).json({ 
          ok: false, 
          error: "Padecimiento no encontrado" 
        });
      }

      res.status(200).json({ ok: true, data: actualizado });
    } catch (error) {
      console.error('❌ [PADECIMIENTOS_CONTROLLER] Error al actualizar:', error);
      res.status(500).json({ 
        ok: false, 
        error: "Error interno del servidor" 
      });
    }
  },

  // ✅ ELIMINAR PADECIMIENTO
  eliminar: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          ok: false, 
          error: "ID es requerido" 
        });
      }

      const idNum = parseInt(id, 10);
      if (isNaN(idNum)) {
        return res.status(400).json({ 
          ok: false, 
          error: "ID debe ser un número válido" 
        });
      }

      const eliminado = await PadecimientosService.eliminar(idNum);

      if (!eliminado) {
        return res.status(404).json({ 
          ok: false, 
          error: "Padecimiento no encontrado" 
        });
      }

      res.status(200).json({ 
        ok: true, 
        message: "Padecimiento eliminado exitosamente" 
      });
    } catch (error) {
      console.error('❌ [PADECIMIENTOS_CONTROLLER] Error al eliminar:', error);
      res.status(500).json({ 
        ok: false, 
        error: "Error interno del servidor" 
      });
    }
  },

  // ✅ COMPLETAR PADECIMIENTO
  completar: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          ok: false, 
          error: "ID es requerido" 
        });
      }

      const idNum = parseInt(id, 10);
      if (isNaN(idNum)) {
        return res.status(400).json({ 
          ok: false, 
          error: "ID debe ser un número válido" 
        });
      }

      const completado = await PadecimientosService.completar(idNum);

      if (!completado) {
        return res.status(404).json({ 
          ok: false, 
          error: "Padecimiento no encontrado" 
        });
      }

      res.status(200).json({ 
        ok: true, 
        data: completado,
        message: "Padecimiento completado exitosamente" 
      });
    } catch (error) {
      console.error('❌ [PADECIMIENTOS_CONTROLLER] Error al completar:', error);
      res.status(500).json({ 
        ok: false, 
        error: "Error interno del servidor" 
      });
    }
  }
};