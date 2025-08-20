// src/modules/consultas/consultas.schema.ts
import { z } from 'zod';

// Esquema para Padecimiento Actual
const PadecimientoSchema = z.object({
  motivo: z.string().nullable().optional(),
  tiempo: z.string().nullable().optional(), // Tiempo de evolución
  descripcion: z.string().nullable().optional(),
  intensidad: z.enum(['leve', 'moderado', 'severo']).nullable().optional(),
}).nullable();

// Esquema para Signos Vitales
const SignosVitalesSchema = z.object({
  frecuenciaCardiaca: z.coerce.number().nullable().optional(), // FC (lpm)
  frecuenciaRespiratoria: z.coerce.number().nullable().optional(), // FR (rpm)
  presionArterial: z.string().nullable().optional(), // "120/80"
  temperatura: z.coerce.number().nullable().optional(), // Temperatura (°C)
  saturacion: z.coerce.number().nullable().optional(), // Saturación O2 (%)
  peso: z.coerce.number().nullable().optional(), // Peso (kg)
  talla: z.coerce.number().nullable().optional(), // Talla (cm)
}).nullable();

// Esquema para Exploración Física
const ExploracionFisicaSchema = z.object({
  aspectoGeneral: z.string().nullable().optional(),
  sistemaCardiovascular: z.string().nullable().optional(),
  sistemaRespiratorio: z.string().nullable().optional(),
  sistemaDigestivo: z.string().nullable().optional(),
  sistemaNeurologico: z.string().nullable().optional(),
  sistemaMusculoesqueletico: z.string().nullable().optional(),
  pielFaneras: z.string().nullable().optional(),
  hallazgosRelevantes: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
}).nullable();

// Esquema para Diagnóstico
const DiagnosticoSchema = z.object({
  descripcion: z.string().nullable().optional(), // Diagnóstico principal
  impresionClinica: z.string().nullable().optional(),
  codigoCIE10: z.string().nullable().optional(),
  secundarios: z.string().nullable().optional(), // Diagnósticos secundarios
  tipo: z.enum(['Presuntivo', 'Definitivo', 'Diferencial']).nullable().optional(),
  gravedad: z.enum(['Leve', 'Moderado', 'Grave']).nullable().optional(),
}).nullable();

// Esquema para Tratamiento
const TratamientoSchema = z.object({
  // Campos que llegan del frontend
  indicacionesGenerales: z.string().nullable().optional(),
  prescripcionesResumen: z.string().nullable().optional(), // Medicamentos
  
  // Campos adicionales
  dietaRecomendaciones: z.string().nullable().optional(),
  actividadFisica: z.string().nullable().optional(),
  cuidadosEspeciales: z.string().nullable().optional(),
  proximaCita: z.string().nullable().optional(), // Fecha como string ISO
  controlEn: z.string().nullable().optional(), // "3 días", "1 semana"
  recomendacionesAlta: z.string().nullable().optional(),
}).nullable();

// Esquema para Exámenes de Laboratorio
const ExamenesLaboratorioSchema = z.object({
  tipo: z.string().nullable().optional(), // "Sangre", "Orina", etc.
  examenes: z.string().nullable().optional(), // Lista de exámenes
  indicaciones: z.string().nullable().optional(), // Indicaciones especiales
  urgencia: z.enum(['Normal', 'Urgente', 'STAT']).nullable().optional(),
}).nullable();

// ✅ Esquema principal para finalizar consulta (actualizado)
export const FinalizarConsultaSchema = z.object({
  pacienteId: z.coerce.number({ required_error: "El ID del paciente es requerido." }),
  
  // Componentes de la consulta
  padecimientoActual: PadecimientoSchema,
  signosVitales: SignosVitalesSchema,
  exploracionFisica: ExploracionFisicaSchema,
  diagnostico: DiagnosticoSchema,
  tratamiento: TratamientoSchema,
  examenes: ExamenesLaboratorioSchema,
});

// ✅ Esquema para búsqueda de pacientes
export const BuscarPacientesSchema = z.object({
  q: z.string().min(2, "Mínimo 2 caracteres para buscar"),
});

// ✅ Esquema para consultar historial
export const HistorialPacienteSchema = z.object({
  pacienteId: z.coerce.number(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
});

// ✅ Esquema para búsqueda de consultas
export const BuscarConsultasSchema = z.object({
  pacienteId: z.coerce.number().optional(),
  fechaInicio: z.string().optional().transform(val => val ? new Date(val) : undefined),
  fechaFin: z.string().optional().transform(val => val ? new Date(val) : undefined),
  diagnostico: z.string().optional(),
  estado: z.enum(['EN_PROCESO', 'FINALIZADA', 'CANCELADA']).optional(),
});

// ✅ Tipos TypeScript inferidos
export type FinalizarConsultaData = z.infer<typeof FinalizarConsultaSchema>;
export type BuscarPacientesData = z.infer<typeof BuscarPacientesSchema>;
export type HistorialPacienteData = z.infer<typeof HistorialPacienteSchema>;
export type BuscarConsultasData = z.infer<typeof BuscarConsultasSchema>;