// =============================================
// types/enums.ts - Tipos y Validaciones para Historia Clínica
// =============================================

// --------------------
// CONSTANTES DE ENUMS
// --------------------

export const SEXO = {
  MASCULINO: 'Masculino',
  FEMENINO: 'Femenino',
  OTRO: 'Otro'
} as const;

export const ESTADO_CONSULTA = {
  EN_PROCESO: 'EN_PROCESO',
  FINALIZADA: 'FINALIZADA',
  CANCELADA: 'CANCELADA'
} as const;

export const ESTADO_COMPONENTE = {
  PENDIENTE: 'PENDIENTE',
  COMPLETADO: 'COMPLETADO',
  OMITIDO: 'OMITIDO'
} as const;

// Constantes adicionales para el sistema
export const INTENSIDAD_PADECIMIENTO = {
  LEVE: 'Leve',
  MODERADO: 'Moderado',
  SEVERO: 'Severo'
} as const;

export const TIPO_DIAGNOSTICO = {
  PRESUNTIVO: 'Presuntivo',
  DEFINITIVO: 'Definitivo',
  DIFERENCIAL: 'Diferencial'
} as const;

export const GRAVEDAD_DIAGNOSTICO = {
  LEVE: 'Leve',
  MODERADO: 'Moderado',
  GRAVE: 'Grave'
} as const;

export const URGENCIA_EXAMEN = {
  NORMAL: 'Normal',
  URGENTE: 'Urgente',
  STAT: 'STAT'
} as const;

export const GRUPO_SANGUINEO = {
  A_POSITIVO: 'A+',
  A_NEGATIVO: 'A-',
  B_POSITIVO: 'B+',
  B_NEGATIVO: 'B-',
  AB_POSITIVO: 'AB+',
  AB_NEGATIVO: 'AB-',
  O_POSITIVO: 'O+',
  O_NEGATIVO: 'O-'
} as const;

// --------------------
// TIPOS TYPESCRIPT
// --------------------

export type Sexo = typeof SEXO[keyof typeof SEXO];
export type EstadoConsulta = typeof ESTADO_CONSULTA[keyof typeof ESTADO_CONSULTA];
export type EstadoComponente = typeof ESTADO_COMPONENTE[keyof typeof ESTADO_COMPONENTE];
export type IntensidadPadecimiento = typeof INTENSIDAD_PADECIMIENTO[keyof typeof INTENSIDAD_PADECIMIENTO];
export type TipoDiagnostico = typeof TIPO_DIAGNOSTICO[keyof typeof TIPO_DIAGNOSTICO];
export type GravedadDiagnostico = typeof GRAVEDAD_DIAGNOSTICO[keyof typeof GRAVEDAD_DIAGNOSTICO];
export type UrgenciaExamen = typeof URGENCIA_EXAMEN[keyof typeof URGENCIA_EXAMEN];
export type GrupoSanguineo = typeof GRUPO_SANGUINEO[keyof typeof GRUPO_SANGUINEO];

// --------------------
// FUNCIONES DE VALIDACIÓN
// --------------------

export function isValidSexo(value: string): value is Sexo {
  return Object.values(SEXO).includes(value as Sexo);
}

export function isValidEstadoConsulta(value: string): value is EstadoConsulta {
  return Object.values(ESTADO_CONSULTA).includes(value as EstadoConsulta);
}

export function isValidEstadoComponente(value: string): value is EstadoComponente {
  return Object.values(ESTADO_COMPONENTE).includes(value as EstadoComponente);
}

export function isValidIntensidadPadecimiento(value: string): value is IntensidadPadecimiento {
  return Object.values(INTENSIDAD_PADECIMIENTO).includes(value as IntensidadPadecimiento);
}

export function isValidTipoDiagnostico(value: string): value is TipoDiagnostico {
  return Object.values(TIPO_DIAGNOSTICO).includes(value as TipoDiagnostico);
}

export function isValidGravedadDiagnostico(value: string): value is GravedadDiagnostico {
  return Object.values(GRAVEDAD_DIAGNOSTICO).includes(value as GravedadDiagnostico);
}

export function isValidUrgenciaExamen(value: string): value is UrgenciaExamen {
  return Object.values(URGENCIA_EXAMEN).includes(value as UrgenciaExamen);
}

export function isValidGrupoSanguineo(value: string): value is GrupoSanguineo {
  return Object.values(GRUPO_SANGUINEO).includes(value as GrupoSanguineo);
}

// --------------------
// FUNCIONES DE UTILIDAD
// --------------------

// Obtener todas las opciones como array
export const getSexoOptions = () => Object.values(SEXO);
export const getEstadoConsultaOptions = () => Object.values(ESTADO_CONSULTA);
export const getEstadoComponenteOptions = () => Object.values(ESTADO_COMPONENTE);
export const getIntensidadPadecimientoOptions = () => Object.values(INTENSIDAD_PADECIMIENTO);
export const getTipoDiagnosticoOptions = () => Object.values(TIPO_DIAGNOSTICO);
export const getGravedadDiagnosticoOptions = () => Object.values(GRAVEDAD_DIAGNOSTICO);
export const getUrgenciaExamenOptions = () => Object.values(URGENCIA_EXAMEN);
export const getGrupoSanguineoOptions = () => Object.values(GRUPO_SANGUINEO);

// Funciones para validar y lanzar errores
export function validateSexo(value: string, fieldName: string = 'sexo'): Sexo {
  if (!isValidSexo(value)) {
    throw new Error(`${fieldName} inválido: ${value}. Valores permitidos: ${getSexoOptions().join(', ')}`);
  }
  return value;
}

export function validateEstadoConsulta(value: string, fieldName: string = 'estado'): EstadoConsulta {
  if (!isValidEstadoConsulta(value)) {
    throw new Error(`${fieldName} inválido: ${value}. Valores permitidos: ${getEstadoConsultaOptions().join(', ')}`);
  }
  return value;
}

export function validateEstadoComponente(value: string, fieldName: string = 'estado'): EstadoComponente {
  if (!isValidEstadoComponente(value)) {
    throw new Error(`${fieldName} inválido: ${value}. Valores permitidos: ${getEstadoComponenteOptions().join(', ')}`);
  }
  return value;
}

// --------------------
// HELPER PARA FORMULARIOS
// --------------------

// Para usar en formularios con selects
export const FORM_OPTIONS = {
  sexo: getSexoOptions().map(value => ({ value, label: value })),
  estadoConsulta: getEstadoConsultaOptions().map(value => ({ 
    value, 
    label: value.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) 
  })),
  estadoComponente: getEstadoComponenteOptions().map(value => ({ 
    value, 
    label: value.toLowerCase().replace(/^\w/, c => c.toUpperCase()) 
  })),
  intensidadPadecimiento: getIntensidadPadecimientoOptions().map(value => ({ value, label: value })),
  tipoDiagnostico: getTipoDiagnosticoOptions().map(value => ({ value, label: value })),
  gravedadDiagnostico: getGravedadDiagnosticoOptions().map(value => ({ value, label: value })),
  urgenciaExamen: getUrgenciaExamenOptions().map(value => ({ value, label: value })),
  grupoSanguineo: getGrupoSanguineoOptions().map(value => ({ value, label: value }))
} as const;