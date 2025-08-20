// src/modules/tratamiento/tratamiento.schema.ts
import { z } from 'zod';

// Esquema principal que coincide con el frontend
export const TratamientoSchema = z.object({
  pacienteId: z.number({ required_error: "El ID del paciente es requerido." }),
  consultaId: z.number().optional(),

  medicamentos: z.string().optional(),
  indicaciones: z.string().optional(),
  recomendaciones: z.string().optional(),
  proximaCita: z.string().optional(),
});

export const CreateTratamientoSchema = TratamientoSchema;
export const UpdateTratamientoSchema = TratamientoSchema.partial();

// Tipos de TypeScript
export type TratamientoData = z.infer<typeof TratamientoSchema>;
