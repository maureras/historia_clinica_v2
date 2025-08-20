// src/modules/padecimientos/padecimiento.schema.ts
import { z } from "zod";

export const PadecimientoSchema = z.object({
  pacienteId: z.number().int().positive(),
  motivo: z.string().optional().default(""),
  tiempo: z.string().optional().default(""),
  sintomasAsociados: z.string().optional().default(""),
  descripcion: z.string().optional().default(""),
  tratamientoPrevio: z.string().optional().default(""),
  estado: z.enum(["EN_PROCESO", "COMPLETADO", "PENDIENTE", "CANCELADO"]).optional().default("EN_PROCESO"),
  consultaId: z.number().int().positive().optional().nullable()
});

export const PadecimientoUpdateSchema = z.object({
  motivo: z.string().optional(),
  tiempo: z.string().optional(),
  sintomasAsociados: z.string().optional(),
  descripcion: z.string().optional(),
  tratamientoPrevio: z.string().optional(),
  estado: z.enum(["EN_PROCESO", "COMPLETADO", "PENDIENTE", "CANCELADO"]).optional(),
  consultaId: z.number().int().positive().optional().nullable()
});

export const BuscarPadecimientosSchema = z.object({
  pacienteId: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  estado: z.enum(["EN_PROCESO", "COMPLETADO", "PENDIENTE", "CANCELADO"]).optional(),
  motivo: z.string().optional(),
  desde: z.string().optional(), // Se convertirá a Date en el controlador
  hasta: z.string().optional(), // Se convertirá a Date en el controlador
  limite: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  pagina: z.string().optional().transform(val => val ? parseInt(val, 10) : 1)
});

export type PadecimientoDTO = z.infer<typeof PadecimientoSchema>;
export type PadecimientoUpdateDTO = z.infer<typeof PadecimientoUpdateSchema>;
export type BuscarPadecimientosDTO = z.infer<typeof BuscarPadecimientosSchema>;