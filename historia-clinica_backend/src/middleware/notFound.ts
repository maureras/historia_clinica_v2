// src/middleware/notFound.ts
import { Request, Response } from "express";

export function notFound(req: Request, res: Response) {
  res.status(404).json({ 
    ok: false, 
    error: "NOT_FOUND",
    message: "Recurso no encontrado",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    suggestion: "Revise la documentación de API en GET /"
  });
}