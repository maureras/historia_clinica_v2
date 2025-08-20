// src/modules/signos-vitales/signosVitales.schema.ts
import { z } from 'zod';

// Esquema base para los datos de Signos Vitales
export const SignosVitalesSchema = z.object({
  pacienteId: z.number({ required_error: "El ID del paciente es requerido." }),
  consultaId: z.number().optional(),
  
  temperatura: z.coerce.number().optional(),
  presionSistolica: z.coerce.number().int().optional(),
  presionDiastolica: z.coerce.number().int().optional(),
  frecuenciaCardiaca: z.coerce.number().int().optional(),
  frecuenciaRespiratoria: z.coerce.number().int().optional(),
  saturacionOxigeno: z.coerce.number().int().optional(),
  peso: z.coerce.number().optional(),
  talla: z.coerce.number().optional(),
  imc: z.coerce.number().optional(), // El backend lo recalculará por seguridad
  tipoSangre: z.string().max(5, "Tipo de sangre inválido").optional().or(z.literal('')),
});

// Esquema para la creación de un nuevo registro de signos vitales
export const CreateSignosVitalesSchema = SignosVitalesSchema;

// Esquema para la actualización (todos los campos son opcionales)
export const UpdateSignosVitalesSchema = SignosVitalesSchema.partial();

// Tipos de TypeScript derivados de los esquemas
export type SignosVitalesData = z.infer<typeof SignosVitalesSchema>;
export type CreateSignosVitalesData = z.infer<typeof CreateSignosVitalesSchema>;
export type UpdateSignosVitalesData = z.infer<typeof UpdateSignosVitalesSchema>;
