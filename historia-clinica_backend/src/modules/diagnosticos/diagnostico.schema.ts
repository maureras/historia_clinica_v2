// src/modules/diagnosticos/diagnostico.schema.ts
import { z } from 'zod';

// Esquema principal para crear/actualizar diagnósticos (coincide con DiagnosticoData del frontend)
export const DiagnosticoSchema = z.object({
  // Campos del frontend
  impresionClinica: z.string().optional(),
  principal: z.string()
    .min(3, 'El diagnóstico principal debe tener al menos 3 caracteres')
    .max(1000, 'El diagnóstico principal es muy largo'),
  secundarios: z.string()
    .max(1500, 'Los diagnósticos secundarios son muy largos')
    .optional()
    .or(z.literal('')),
  diferencial: z.string()
    .max(1500, 'El diagnóstico diferencial es muy largo')
    .optional()
    .or(z.literal('')),
  cie10: z.string()
    .max(50, 'El código CIE-10 es muy largo')
    .optional()
    .or(z.literal('')),
  
  // Campos adicionales del backend
  consultaId: z.number().optional(),
  pacienteId: z.number(),
  medicoId: z.number().optional(),
  observaciones: z.string().max(2000, 'Las observaciones son muy largas').optional(),
  estado: z.enum(['ACTIVO', 'MODIFICADO', 'ANULADO']).optional()
});

// Esquema para crear diagnóstico desde el frontend
export const CreateDiagnosticoSchema = DiagnosticoSchema.omit({ 
  medicoId: true, 
  estado: true 
});

// Esquema para actualizar diagnóstico
export const UpdateDiagnosticoSchema = DiagnosticoSchema.partial();

// Esquema para búsqueda de diagnósticos
export const BuscarDiagnosticosSchema = z.object({
  pacienteId: z.string().optional()
    .transform(val => val ? parseInt(val, 10) : undefined),
  consultaId: z.string().optional()
    .transform(val => val ? parseInt(val, 10) : undefined),
  cie10: z.string().optional(),
  principal: z.string().optional(), // Búsqueda por texto en diagnóstico principal
  estado: z.enum(['ACTIVO', 'MODIFICADO', 'ANULADO']).optional(),
  desde: z.string().optional(), // Fecha como string del query parameter
  hasta: z.string().optional(), // Fecha como string del query parameter
  limite: z.string().optional()
    .transform(val => val ? parseInt(val, 10) : 20),
  pagina: z.string().optional()
    .transform(val => val ? parseInt(val, 10) : 1)
});

// Esquema para parámetros de ruta
export const DiagnosticoParamsSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10))
});

// Esquema para códigos CIE-10
export const CodigoCIE10Schema = z.object({
  codigo: z.string()
    .min(1, 'El código es requerido')
    .max(10, 'El código es muy largo')
    .regex(/^[A-Z]\d{2}(\.\d{1,2})?$/, 'Formato de código CIE-10 inválido'),
  descripcion: z.string()
    .min(5, 'La descripción debe tener al menos 5 caracteres')
    .max(500, 'La descripción es muy larga'),
  categoria: z.string().max(200, 'La categoría es muy larga').optional(),
  subcategoria: z.string().max(200, 'La subcategoría es muy larga').optional(),
  activo: z.boolean().optional()
});

// Esquema para búsqueda de códigos CIE-10 (usado por el buscador del frontend)
export const BuscarCIE10Schema = z.object({
  q: z.string().optional(), // Término de búsqueda general
  codigo: z.string().optional(), // Búsqueda específica por código
  categoria: z.string().optional(), // Filtro por categoría
  limite: z.string().optional()
    .transform(val => val ? parseInt(val, 10) : 50),
  pagina: z.string().optional()
    .transform(val => val ? parseInt(val, 10) : 1)
});

// Esquema para respuesta del frontend (lo que espera el componente React)
export const DiagnosticoResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    id: z.number(),
    consultaId: z.number().nullable(),
    pacienteId: z.number(),
    impresionClinica: z.string().nullable(),
    principal: z.string(),
    secundarios: z.string().nullable(),
    diferencial: z.string().nullable(),
    cie10: z.string().nullable(),
    fechaDiagnostico: z.string(), // ISO date string
    estado: z.string(),
    observaciones: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    // Relaciones incluidas
    paciente: z.object({
      id: z.number(),
      nombres: z.string(),
      apellidos: z.string(),
      numeroIdentificacion: z.string()
    }).optional(),
    consulta: z.object({
      id: z.number(),
      fecha: z.string(),
      tipo: z.string(),
      estado: z.string()
    }).optional().nullable()
  }),
  message: z.string().optional()
});

// Tipos TypeScript derivados de los esquemas
export type DiagnosticoData = z.infer<typeof DiagnosticoSchema>;
export type CreateDiagnosticoData = z.infer<typeof CreateDiagnosticoSchema>;
export type UpdateDiagnosticoData = z.infer<typeof UpdateDiagnosticoSchema>;
export type BuscarDiagnosticosParams = z.infer<typeof BuscarDiagnosticosSchema>;
export type CodigoCIE10Data = z.infer<typeof CodigoCIE10Schema>;
export type BuscarCIE10Params = z.infer<typeof BuscarCIE10Schema>;