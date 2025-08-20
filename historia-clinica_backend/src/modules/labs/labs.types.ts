// src/modules/labs/labs.types.ts

export interface ResultadoItem {
  prueba: string;
  valor: string | number | null;
  unidad: string | null;
  rango: string | null;
}

export interface DocumentoAnalizado {
  archivo: string;
  fecha_informe: string | null;
  identificadores: {
    nombres: string | null;
    documento: string | null;
  };
  resultados: ResultadoItem[];
}

export interface ParseOptions {
  incluirResumen?: boolean;
}

export interface ParseAggregate {
  documentos: DocumentoAnalizado[];
  banderas: Array<{
    prueba: string;
    valor: string | number | null;
    unidad: string | null;
    rango: string | null;
    estado?: "alto" | "bajo" | null;
    archivo?: string | null;
  }>;
  resumen_hallazgos: string | null;
  paginas_procesadas: number;
  resultados_unicos_extraidos: number;
}

// Tipo sencillo que coincide con lo que entrega Multer
export interface UploadedFile {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
}