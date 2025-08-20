// Tipado mínimo para que TS no se queje.
// Si quieres algo más completo, puedes ampliar las propiedades.
declare module "pdf-parse" {
  const pdfParse: (dataBuffer: Buffer) => Promise<{
    text: string;
    numpages?: number;
    numrender?: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    version?: string;
  }>;
  export default pdfParse;
}