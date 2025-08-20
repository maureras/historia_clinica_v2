import { z } from 'zod';

// Subesquemas (flexibles). Puedes añadir/ajustar campos cuando quieras.
export const SignosVitalesSchema = z.object({
  temperatura: z.number().nullable().optional(),
  presion: z.object({
    sistolica: z.number().nullable().optional(),
    diastolica: z.number().nullable().optional(),
  }).partial().optional(),
  frecuenciaCardiaca: z.number().nullable().optional(),
  frecuenciaRespiratoria: z.number().nullable().optional(),
  saturacion: z.number().nullable().optional(),
  pesoKg: z.number().nullable().optional(),
  tallaM: z.number().nullable().optional(),
  imc: z.number().nullable().optional(), // lo calculamos si faltó
}).partial();

export const MedicamentoSchema = z.object({
  nombre: z.string(),
  dosis: z.string().optional(),
  via: z.string().optional(),
  frecuencia: z.string().optional(),
  duracion: z.string().optional(),
});

export const TratamientoSchema = z.object({
  indicaciones: z.string().optional(),
  medicamentos: z.array(MedicamentoSchema).optional().default([]),
}).partial();

export const DiagnosticoSchema = z.object({
  principal: z.string().optional(),
  cie10: z.array(z.string()).optional().default([]),
  diferenciales: z.array(z.string()).optional().default([]),
}).partial();

export const ConsultaCreateSchema = z.object({
  pacienteId: z.number().int(),
  fecha: z.string().datetime().optional(), // o Date; aceptamos ISO
  motivo: z.string().optional(),
  notas: z.string().optional(),

  antecedentes: z.any().optional(),
  padecimientoActual: z.any().optional(),
  signosVitales: SignosVitalesSchema.optional(),
  exploracionFisica: z.any().optional(),
  diagnostico: DiagnosticoSchema.optional(),
  tratamiento: TratamientoSchema.optional(),
  laboratorio: z.any().optional(),
});

export const ConsultaUpdateSchema = ConsultaCreateSchema.partial();

export type ConsultaCreateInput = z.infer<typeof ConsultaCreateSchema>;
export type ConsultaUpdateInput = z.infer<typeof ConsultaUpdateSchema>;
