-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LabResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "consultationId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ocr',
    "fechaInforme" DATETIME,
    "resumen" TEXT,
    "documentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LabResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabResult_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LabResult_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LabResult" ("createdAt", "documentId", "fechaInforme", "id", "patientId", "resumen", "source", "updatedAt") SELECT "createdAt", "documentId", "fechaInforme", "id", "patientId", "resumen", "source", "updatedAt" FROM "LabResult";
DROP TABLE "LabResult";
ALTER TABLE "new_LabResult" RENAME TO "LabResult";
CREATE INDEX "LabResult_patientId_idx" ON "LabResult"("patientId");
CREATE INDEX "LabResult_consultationId_idx" ON "LabResult"("consultationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
