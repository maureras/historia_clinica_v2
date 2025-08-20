// src/modules/consultas/consultas.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import * as consultasService from './consultas.service';

// Schema para finalizar consulta (desde el frontend)
const FinalizarConsultaSchema = z.object({
  pacienteId: z.number({ required_error: "El ID del paciente es requerido." }),
  
  padecimientoActual: z.object({
    motivo: z.string().nullable().optional(),
    tiempo: z.string().nullable().optional(),
    descripcion: z.string().nullable().optional(),
    intensidad: z.enum(['leve', 'moderado', 'severo']).nullable().optional(),
  }).nullable().optional(),
  
  signosVitales: z.object({
    frecuenciaCardiaca: z.number().nullable().optional(),
    frecuenciaRespiratoria: z.number().nullable().optional(),
    presionArterial: z.string().nullable().optional(),
    temperatura: z.number().nullable().optional(),
    saturacion: z.number().nullable().optional(),
    peso: z.number().nullable().optional(),
    talla: z.number().nullable().optional(),
  }).nullable().optional(),
  
  exploracionFisica: z.object({
    aspectoGeneral: z.string().nullable().optional(),
    sistemaCardiovascular: z.string().nullable().optional(),
    sistemaRespiratorio: z.string().nullable().optional(),
    sistemaDigestivo: z.string().nullable().optional(),
    sistemaNeurologico: z.string().nullable().optional(),
    sistemaMusculoesqueletico: z.string().nullable().optional(),
    pielFaneras: z.string().nullable().optional(),
    hallazgosRelevantes: z.string().nullable().optional(),
    observaciones: z.string().nullable().optional(),
  }).nullable().optional(),
  
  diagnostico: z.object({
    descripcion: z.string().nullable().optional(),
    impresionClinica: z.string().nullable().optional(),
    codigoCIE10: z.string().nullable().optional(),
  }).nullable().optional(),
  
  tratamiento: z.object({
    prescripcionesResumen: z.string().nullable().optional(),
    indicacionesGenerales: z.string().nullable().optional(),
    proximaCita: z.string().nullable().optional(),
  }).nullable().optional(),
  
  examenes: z.object({
    tipo: z.string().nullable().optional(),
    examenes: z.string().nullable().optional(),
    indicaciones: z.string().nullable().optional(),
    urgencia: z.enum(['Normal', 'Urgente', 'STAT']).nullable().optional(),
  }).nullable().optional(),
});

// 🆕 Schema para búsqueda de consultas
const BuscarConsultasSchema = z.object({
  pacienteId: z.coerce.number().optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10)
});

export async function finalizarConsulta(req: Request, res: Response) {
  try {
    console.log('🏥 Recibiendo datos de consulta:', JSON.stringify(req.body, null, 2));
    
    const data = FinalizarConsultaSchema.parse(req.body);
    const consulta = await consultasService.crearConsulta(data);
    
    console.log('✅ Consulta creada exitosamente:', consulta.id);
    
    res.status(201).json({
      ok: true,
      message: 'Consulta registrada exitosamente',
      data: {
        consultaId: consulta.id,
        pacienteId: consulta.pacienteId,
        fecha: consulta.fechaConsulta,
        motivo: (consulta as any).motivo || data.padecimientoActual?.motivo || 'Consulta médica' // Cast temporal para evitar error de TS
      }
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      console.error('❌ Error de validación:', err.issues);
      return res.status(400).json({
        ok: false,
        error: 'VALIDATION_ERROR',
        message: 'Datos de consulta inválidos',
        issues: err.issues
      });
    }
    
    console.error('❌ Error al finalizar consulta:', err);
    res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor al guardar la consulta'
    });
  }
}

export async function obtenerConsulta(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ 
        ok: false, 
        error: 'INVALID_ID',
        message: 'ID de consulta inválido'
      });
    }
    
    const consulta = await consultasService.obtenerConsulta(id);
    if (!consulta) {
      return res.status(404).json({ 
        ok: false, 
        error: 'NOT_FOUND',
        message: 'Consulta no encontrada'
      });
    }
    
    res.json({ ok: true, data: consulta });
  } catch (err) {
    console.error('❌ Error al obtener consulta:', err);
    res.status(500).json({ 
      ok: false, 
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
}

export async function listarConsultas(req: Request, res: Response) {
  try {
    const queryParams = BuscarConsultasSchema.parse(req.query);
    
    const resultado = await consultasService.listarConsultas(queryParams);
    
    res.json({ 
      ok: true, 
      data: resultado.consultas,
      pagination: {
        page: resultado.page,
        pageSize: resultado.pageSize,
        total: resultado.total,
        totalPages: resultado.totalPages
      }
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        error: 'VALIDATION_ERROR',
        issues: err.issues
      });
    }
    console.error('❌ Error al listar consultas:', err);
    res.status(500).json({ 
      ok: false, 
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
}

export async function actualizarConsulta(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ 
        ok: false, 
        error: 'INVALID_ID' 
      });
    }

    const data = FinalizarConsultaSchema.partial().parse(req.body);
    const consulta = await consultasService.actualizarConsulta(id, data);
    
    res.json({ 
      ok: true, 
      data: consulta,
      message: 'Consulta actualizada exitosamente'
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ 
        ok: false, 
        error: 'VALIDATION_ERROR', 
        issues: err.issues 
      });
    }
    console.error('❌ Error al actualizar consulta:', err);
    res.status(500).json({ 
      ok: false, 
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
}

export async function eliminarConsulta(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ 
        ok: false, 
        error: 'INVALID_ID' 
      });
    }

    await consultasService.eliminarConsulta(id);
    res.json({ 
      ok: true, 
      message: 'Consulta eliminada exitosamente' 
    });
  } catch (err) {
    console.error('❌ Error al eliminar consulta:', err);
    res.status(500).json({ 
      ok: false, 
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
}

// 🆕 Endpoint para obtener historial de un paciente
export async function obtenerHistorialPaciente(req: Request, res: Response) {
  try {
    const pacienteId = Number(req.params.pacienteId);
    if (isNaN(pacienteId)) {
      return res.status(400).json({ 
        ok: false, 
        error: 'INVALID_ID',
        message: 'ID de paciente inválido'
      });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    
    const resultado = await consultasService.obtenerHistorialPaciente(pacienteId, page, limit);
    
    res.json({ 
      ok: true, 
      data: resultado.consultas,
      pagination: {
        page: resultado.page,
        limit: resultado.limit,
        total: resultado.total,
        totalPages: resultado.totalPages
      }
    });
  } catch (err) {
    console.error('❌ Error al obtener historial del paciente:', err);
    res.status(500).json({ 
      ok: false, 
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
}