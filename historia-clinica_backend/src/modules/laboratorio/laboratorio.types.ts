// src/modules/laboratorio/laboratorio.types.ts - Tipos y validación completos

import { z } from 'zod';

// ✅ SCHEMA DE VALIDACIÓN PARA UPLOAD
export const UploadLaboratorioSchema = z.object({
  paciente_id: z.coerce.number({
    required_error: "El ID del paciente es requerido",
    invalid_type_error: "El ID del paciente debe ser un número"
  }).int().positive(),
  consulta_id: z.coerce.number().int().positive().optional()
});

// ✅ TIPOS PARA EL ANÁLISIS DE IA
export interface LaboratorioResultado {
  prueba: string;
  valor: string;
  unidad?: string;
  rango?: string;
}

export interface LaboratorioAnalisis {
  fecha_informe: string;
  resumen_hallazgos: string;
  resultados: LaboratorioResultado[];
}

// ✅ TIPOS PARA RESPUESTAS DE API
export interface LaboratorioArchivoResponse {
  id: number;
  archivo: string;
  url: string;
  fecha_informe: string | null;
  resumen_hallazgos: string | null;
  resultados: LaboratorioResultado[];
  paciente: {
    nombres: string;
    apellidos: string;
    numeroIdentificacion: string;
  };
}

export interface LaboratorioArchivoCompleto {
  id: number;
  nombreArchivo: string;
  urlArchivo: string;
  fechaInforme: Date | null;
  resumenHallazgos: string | null;
  createdAt: Date;
  resultados: Array<{
    id: number;
    prueba: string;
    valor: string;
    unidad: string | null;
    rango: string | null;
  }>;
  paciente?: {
    nombres: string;
    apellidos: string;
    numeroIdentificacion: string;
  };
  consulta?: {
    id: number;
    fechaConsulta: Date;
    motivo: string | null;
  };
}

// ✅ TIPOS PARA ESTADÍSTICAS
export interface LaboratorioEstadisticas {
  total: number;
  hoy: number;
  esteMes: number;
  porPaciente: {
    pacienteId: number;
    nombres: string;
    apellidos: string;
    cantidad: number;
  }[];
}

// ✅ TIPOS PARA FILTROS DE BÚSQUEDA
export interface LaboratorioFiltros {
  pacienteId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}