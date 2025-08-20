// src/modules/laboratorio/laboratorio.routes.ts - Rutas completas

import { Router } from 'express';
import multer from 'multer';
import { LaboratorioController } from './laboratorio.controller';
import path from 'path';

export const laboratorioRouter = Router();

// Configuración de Multer para guardar archivos temporalmente
const upload = multer({ 
  dest: path.join(process.cwd(), 'uploads_tmp/'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Permitir solo PDFs e imágenes
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo PDF e imágenes.'));
    }
  }
});

// ✅ RUTAS PRINCIPALES

// Subir y procesar archivo de laboratorio
laboratorioRouter.post('/upload', upload.single('file'), LaboratorioController.upload);

// ✅ NUEVAS RUTAS DE DESCARGA CON MARCA DE AGUA
// Descargar con marca de agua (por defecto)
laboratorioRouter.get('/download/:id', LaboratorioController.downloadWithWatermark);

// Descargar archivo original (sin marca de agua)
laboratorioRouter.get('/download/:id/original', LaboratorioController.downloadOriginal);

// Obtener todos los laboratorios de un paciente
laboratorioRouter.get('/paciente/:pacienteId', LaboratorioController.getByPaciente);

// Obtener un laboratorio específico por ID
laboratorioRouter.get('/:id', LaboratorioController.getById);

// Ruta de prueba
laboratorioRouter.get('/test', (req, res) => {
  res.json({
    ok: true,
    message: 'Módulo de laboratorio funcionando correctamente',
    timestamp: new Date().toISOString(),
    features: [
      'Análisis con IA (Gemini)',
      'Soporte PDF e imágenes',
      'Extracción automática de resultados',
      'Almacenamiento estructurado'
    ]
  });
});

// Middleware de manejo de errores para multer
laboratorioRouter.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        ok: false,
        error: 'FILE_TOO_LARGE',
        message: 'El archivo es muy grande. Máximo 10MB permitido.'
      });
    }
  }
  
  if (error.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      ok: false,
      error: 'INVALID_FILE_TYPE',
      message: 'Tipo de archivo no permitido. Solo se aceptan PDF e imágenes (JPG, PNG, WebP).'
    });
  }
  
  next(error);
});