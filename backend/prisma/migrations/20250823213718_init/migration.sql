/*
  Warnings:

  - You are about to drop the column `emergencyEmail` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyName` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyPhone` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyRelationship` on the `Patient` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Consultation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "estado" TEXT,
    "motivo" TEXT,
    "resumen" TEXT,
    "medico" TEXT,
    "padecimientoActual" TEXT,
    "signosVitales" TEXT,
    "exploracionFisica" TEXT,
    "diagnostico" TEXT,
    "tratamiento" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Consultation" ("createdAt", "diagnostico", "estado", "exploracionFisica", "fecha", "id", "medico", "padecimientoActual", "patientId", "signosVitales", "tratamiento", "updatedAt") SELECT "createdAt", "diagnostico", "estado", "exploracionFisica", "fecha", "id", "medico", "padecimientoActual", "patientId", "signosVitales", "tratamiento", "updatedAt" FROM "Consultation";
DROP TABLE "Consultation";
ALTER TABLE "new_Consultation" RENAME TO "Consultation";
CREATE INDEX "Consultation_patientId_idx" ON "Consultation"("patientId");
CREATE INDEX "Consultation_fecha_idx" ON "Consultation"("fecha");
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" TEXT,
    "dateOfBirth" DATETIME,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "bloodType" TEXT,
    "emergencyContact" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Patient" ("address", "bloodType", "createdAt", "dateOfBirth", "documentNumber", "documentType", "email", "firstName", "gender", "id", "isActive", "lastName", "phone", "updatedAt") SELECT "address", "bloodType", "createdAt", "dateOfBirth", "documentNumber", "documentType", "email", "firstName", "gender", "id", "isActive", "lastName", "phone", "updatedAt" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
