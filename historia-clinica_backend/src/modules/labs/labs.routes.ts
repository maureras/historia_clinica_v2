// src/modules/labs/labs.routes.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

import { LabsController } from './labs.controller.js';

export const routerLabs = Router();

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

routerLabs.post('/upload', upload.single('file'), LabsController.upload);