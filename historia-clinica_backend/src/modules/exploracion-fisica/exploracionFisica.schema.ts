// src/modules/exploracion-fisica/exploracionFisica.schema.ts
import { z } from 'zod';

// Esquema para la sección de Exploración General
const ExploracionGeneralSchema = z.object({
  aspectoGeneral: z.string().optional(),
  estadoConciencia: z.string().optional(),
  orientacion: z.string().optional(),
  hidratacion: z.string().optional(),
  coloracion: z.string().optional(),
  constitucion: z.string().optional(),
  actitud: z.string().optional(),
  facies: z.string().optional(),
  marcha: z.string().optional(),
});

// Esquema para la sección de Exploración por Sistemas
const ExploracionSistemasSchema = z.object({
  cabezaCuello: z.string().optional(),
  cardiopulmonar: z.string().optional(),
  abdomen: z.string().optional(),
  extremidades: z.string().optional(),
  neurologico: z.string().optional(),
  piel: z.string().optional(),
  ganglios: z.string().optional(),
  genitourinario: z.string().optional(),
});

// Esquema para la sección de Hallazgos Específicos
const HallazgosEspecificosSchema = z.object({
  impresionClinica: z.string().optional(),
});

// Esquema principal que coincide con el frontend
export const ExploracionFisicaSchema = z.object({
  pacienteId: z.number(),
  consultaId: z.number().optional(),

  exploracionGeneral: ExploracionGeneralSchema,
  exploracionSistemas: ExploracionSistemasSchema,
  hallazgosEspecificos: HallazgosEspecificosSchema,
  
  observacionesGenerales: z.string().optional(),
  exploradoPor: z.string().optional(),
});

export const CreateExploracionFisicaSchema = ExploracionFisicaSchema;
export const UpdateExploracionFisicaSchema = ExploracionFisicaSchema.partial();

// Tipos de TypeScript
export type ExploracionFisicaData = z.infer<typeof ExploracionFisicaSchema>;
