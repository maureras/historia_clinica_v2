// src/modules/labs/labs.controller.ts
import type { Request, Response } from 'express';
import { parsePdfWithGPT } from './labs.service.js';

export const LabsController = {
  async upload(req: Request, res: Response) {
    try {
      // multer pone el archivo en req.file
      if (!req.file) {
        return res.status(400).json({ ok: false, error: 'No se envió ningún archivo' });
      }

      const incluirResumen = String(req.body?.incluir_resumen ?? 'false') === 'true';

      const data = await parsePdfWithGPT({
        filePath: req.file.path,
        originalname: req.file.originalname,
        incluirResumen,
      });

      return res.json({ ok: true, ...data });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ ok: false, error: msg });
    }
  },
};