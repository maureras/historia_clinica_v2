// =====================================================
// 📁 src/modules/laboratorio/laboratorio.routes.ts
// =====================================================
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