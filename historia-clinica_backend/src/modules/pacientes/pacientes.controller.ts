// src/modules/pacientes/pacientes.controller.ts

import { Request, Response } from 'express';
import { z } from 'zod';
import * as pacientesService from './pacientes.service';

// Schema para crear/actualizar paciente
const PacienteSchema = z.object({
  nombres: z.string().min(1, "Los nombres son requeridos"),
  apellidos: z.string().min(1, "Los apellidos son requeridos"), 
  numeroIdentificacion: z.string().min(1, "El número de identificación es requerido"),
  fechaNacimiento: z.string().optional().nullable(),
  sexo: z.string().optional(),
  edad: z.number().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  grupoSanguineo: z.string().optional(),
  alergias: z.array(z.string()).optional(),
  contactoEmergencia: z.object({
    nombre: z.string(),
    telefono: z.string(),
    relacion: z.string()
  }).optional(),
  notas: z.string().optional(),
  foto: z.string().optional(),
  qrData: z.string().optional(),
  qrCode: z.string().optional()
});

const PacienteUpdateSchema = PacienteSchema.partial();

export async function crearPaciente(req: Request, res: Response) {
  try {
    console.log('👤 Creando paciente:', JSON.stringify(req.body, null, 2));
    
    const data = PacienteSchema.parse(req.body);
    const paciente = await pacientesService.crearPaciente(data);
    
    console.log('✅ Paciente creado exitosamente:', paciente.id);
    
    res.status(201).json({
      ok: true,
      message: 'Paciente creado exitosamente',
      data: paciente
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      console.error('❌ Error de validación:', err.issues);
      return res.status(400).json({
        ok: false,
        error: 'VALIDATION_ERROR',
        message: 'Datos de paciente inválidos',
        issues: err.issues
      });
    }

    // 🔴 Aquí devolvemos 409 con mensaje claro
    if (err?.name === 'ConflictError') {
      return res.status(409).json({
        ok: false,
        error: 'CONFLICT',
        message: 'El usuario ya existe',
        field: err.field || 'numeroIdentificacion'
      });
    }
    
    console.error('❌ Error al crear paciente:', err);
    res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor al crear el paciente'
    });
  }
}


export async function obtenerPaciente(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_ID',
        message: 'ID de paciente inválido'
      });
    }
    
    const paciente = await pacientesService.obtenerPaciente(id);
    if (!paciente) {
      return res.status(404).json({
        ok: false,
        error: 'NOT_FOUND',
        message: 'Paciente no encontrado'
      });
    }
    
    res.json({ ok: true, data: paciente });
  } catch (err) {
    console.error('❌ Error al obtener paciente:', err);
    res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
}

export async function listarPacientes(req: Request, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const busqueda = req.query.q as string;
    
    const resultado = await pacientesService.listarPacientes({
      page,
      pageSize,
      busqueda
    });
    
    res.json({
      ok: true,
      data: resultado.pacientes,
      pagination: {
        page: resultado.page,
        pageSize: resultado.pageSize,
        total: resultado.total,
        totalPages: resultado.totalPages
      }
    });
  } catch (err) {
    console.error('❌ Error al listar pacientes:', err);
    res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
}

export async function actualizarPaciente(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_ID'
      });
    }
    
    const data = PacienteUpdateSchema.parse(req.body);
    const paciente = await pacientesService.actualizarPaciente(id, data);
    
    res.json({
      ok: true,
      data: paciente,
      message: 'Paciente actualizado exitosamente'
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        error: 'VALIDATION_ERROR',
        issues: err.issues
      });
    }
    console.error('❌ Error al actualizar paciente:', err);
    res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
}

export async function eliminarPaciente(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_ID'
      });
    }
    
    await pacientesService.eliminarPaciente(id);
    res.json({
      ok: true,
      message: 'Paciente eliminado exitosamente'
    });
  } catch (err) {
    console.error('❌ Error al eliminar paciente:', err);
    res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    });
  }
}