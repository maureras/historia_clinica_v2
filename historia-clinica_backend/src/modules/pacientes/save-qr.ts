// =============================================
// File: src/modules/pacientes/save-qr.ts
// =============================================
import fs from "fs";
import path from "path";

/**
 * Guarda una imagen PNG de un QR que viene en base64 (data URL) o puro base64.
 * Devuelve la ruta del archivo guardado.
 */
export async function saveQrPngBase64(
  base64: string,
  outDir = path.resolve(process.cwd(), "storage", "qrs"),
  fileName?: string
) {
  // Acepta "data:image/png;base64,..." o solo base64
  const pure = base64.startsWith("data:")
    ? base64.split(",")[1] ?? ""
    : base64;

  if (!pure) throw new Error("QR base64 inválido");

  await fs.promises.mkdir(outDir, { recursive: true });
  const name = fileName || `qr_${Date.now()}.png`;
  const full = path.join(outDir, name);

  await fs.promises.writeFile(full, Buffer.from(pure, "base64"));
  return full;
}
