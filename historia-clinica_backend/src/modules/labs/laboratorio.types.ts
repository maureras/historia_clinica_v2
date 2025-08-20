// =====================================================
// 📁 src/modules/laboratorio/laboratorio.types.ts
// =====================================================

export interface LaboratorioResultado {
  prueba: string;
  valor: string;
  unidad?: string;
  rango?: string;
}

export interface LaboratorioAnalisis {
  fecha_informe: string;
  resumen_hallazgos: string;
  resultados: LaboratorioResultado[];
}

export interface LaboratorioArchivoResponse {
  id: number;
  archivo: string;
  url: string;
  fecha_informe: string | null;
  resumen_hallazgos: string | null;
  resultados: LaboratorioResultado[];
  paciente: {
    nombres: string;
    apellidos: string;
    numeroIdentificacion: string;
  };
}

export interface LaboratorioArchivoCompleto {
  id: number;
  nombreArchivo: string;
  urlArchivo: string;
  fechaInforme: Date | null;
  resumenHallazgos: string | null;
  createdAt: Date;
  resultados: Array<{
    id: number;
    prueba: string;
    valor: string;
    unidad: string | null;
    rango: string | null;
  }>;
  paciente?: {
    nombres: string;
    apellidos: string;
    numeroIdentificacion: string;
  };
  consulta?: {
    id: number;
    fecha: Date;
    motivo: string | null;
  };
}