// src/modules/pacientes/patient.schema.ts
import { z } from "zod";

const nullableStr = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => (v == null || v.trim() === "" ? undefined : v));

const flexibleDate = z
  .union([z.string().datetime(), z.string().date(), z.literal("")])
  .nullable()
  .optional()
  .transform((v) => (v ? v : undefined));

export const pacienteCreateSchema = z.object({
  nombres: z.string().min(1, "Nombres es requerido."),
  apellidos: z.string().min(1, "Apellidos es requerido."),
  numeroIdentificacion: z.string().min(1, "Número de Identificación es requerido."),
  
  fechaNacimiento: flexibleDate,
  sexo: nullableStr,
  email: z.string().email().or(z.literal("")).nullable().optional().transform(v => v || undefined),
  telefono: nullableStr,
  direccion: nullableStr,
  grupoSanguineo: nullableStr,
  foto: nullableStr,
  notas: nullableStr,
  
  // ===================================================================
  // ✅ LÍNEA AÑADIDA PARA VALIDAR EL CAMPO 'edad'
  // ===================================================================
  edad: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),

  alergias: z.any().optional(),
  contactoEmergencia: z.any().optional(),
  
  qrData: z.string().optional(),
  qrCode: z.string().optional(),
  qr_code: z.string().optional(),
});

export type PacienteCreateInput = z.infer<typeof pacienteCreateSchema>;