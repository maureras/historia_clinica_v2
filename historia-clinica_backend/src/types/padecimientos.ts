export interface PadecimientoResponse {
  id: number;
  pacienteId: number;
  motivo?: string;
  tiempo?: string;
  sintomasAsociados?: string;
  descripcion?: string;
  tratamientoPrevio?: string;
  estado: 'EN_PROCESO' | 'COMPLETADO' | 'PENDIENTE' | 'CANCELADO';
  consultaId?: number;
  createdAt: string;
  updatedAt: string;
  paciente: {
    id: number;
    nombres: string;
    apellidos: string;
    numeroIdentificacion: string;
  };
  consulta?: {
    id: number;
    fecha: string;
    tipo: string;
  };
}

export interface ListarPadecimientosResponse {
  padecimientos: PadecimientoResponse[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
  detalles?: any[];
}