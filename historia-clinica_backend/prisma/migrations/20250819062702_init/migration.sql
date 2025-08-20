-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'MEDICO',
    "especialidad" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastFailedLogin" DATETIME
);

-- CreateTable
CREATE TABLE "AccesoLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fechaAcceso" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "exitoso" BOOLEAN NOT NULL,
    "motivoFallo" TEXT,
    "usuarioId" INTEGER,
    "emailIntento" TEXT NOT NULL,
    CONSTRAINT "AccesoLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accion" TEXT NOT NULL,
    "tabla" TEXT NOT NULL,
    "registroId" INTEGER,
    "datosAnteriores" JSONB,
    "datosNuevos" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,
    CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "numeroIdentificacion" TEXT NOT NULL,
    "fechaNacimiento" DATETIME,
    "sexo" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "grupoSanguineo" TEXT,
    "foto" TEXT,
    "alergias" JSONB,
    "contactoEmergencia" JSONB,
    "qrCode" TEXT,
    "qrData" TEXT,
    "notas" TEXT,
    "edad" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Consulta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fechaConsulta" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT,
    "padecimientoActual" TEXT,
    "signosVitales" TEXT,
    "exploracionFisica" TEXT,
    "diagnostico" TEXT,
    "tratamiento" TEXT,
    "examenes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    CONSTRAINT "Consulta_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Laboratorio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "archivo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fechaInforme" DATETIME,
    "resumenHallazgos" TEXT NOT NULL,
    "resultados" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "consultaId" INTEGER,
    CONSTRAINT "Laboratorio_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Laboratorio_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "Consulta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LaboratorioArchivo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombreArchivo" TEXT NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "fechaInforme" DATETIME,
    "resumenHallazgos" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "consultaId" INTEGER,
    CONSTRAINT "LaboratorioArchivo_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LaboratorioArchivo_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "Consulta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LaboratorioResultado" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "prueba" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "unidad" TEXT,
    "rango" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "laboratorioArchivoId" INTEGER NOT NULL,
    CONSTRAINT "LaboratorioResultado_laboratorioArchivoId_fkey" FOREIGN KEY ("laboratorioArchivoId") REFERENCES "LaboratorioArchivo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_numeroIdentificacion_key" ON "Paciente"("numeroIdentificacion");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_email_key" ON "Paciente"("email");
