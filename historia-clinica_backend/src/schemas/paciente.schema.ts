import { z } from "zod";

export const pacienteBaseSchema = z.object({
  nombres: z.string().min(1),
  apellidos: z.string().min(1),
  tipoIdentificacion: z.string().default("Cédula"),
  numeroIdentificacion: z.string().min(5),
  fechaNacimiento: z.string().datetime().optional().or(z.literal("")).transform(v => v || undefined),
  sexo: z.string().optional(),
  email: z.string().email().optional(),
  celular: z.string().optional(),
  sinCelular: z.boolean().optional().default(false),
  telefono: z.string().optional(),
  aceptaWhatsapp: z.boolean().optional().default(false),
  enviarCorreo: z.boolean().optional().default(false),
  direccion: z.string().optional(),
  pais: z.string().optional(),
  estado: z.string().optional(),
  ciudad: z.string().optional(),
  codigoPostal: z.string().optional(),
  numeroExterior: z.string().optional(),
  numeroInterior: z.string().optional(),
  ocupacion: z.string().optional(),
  estadoCivil: z.string().optional(),
  notas: z.string().optional(),
  foto: z.string().optional(),
  edad: z.string().optional(),
  grupoSanguineo: z.string().optional(),
  alergias: z.any().optional(), // array o string
  contactoEmergencia: z.any().optional(), // objeto o string
  qrCode: z.string().optional(),
  qrData: z.string().optional(),
});

export const pacienteCreateSchema = pacienteBaseSchema;
export const pacienteUpdateSchema = pacienteBaseSchema.partial();