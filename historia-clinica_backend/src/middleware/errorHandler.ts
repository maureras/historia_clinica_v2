// src/middleware/errorHandler.ts
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  let status = err.status || 500;
  let message = err.message || "Error interno del servidor";
  let code: string | undefined;
  let details: any;

  // Zod validation errors
  if (err instanceof ZodError) {
    status = 400;
    message = "Error de validación";
    code = "VALIDATION_ERROR";
    details = err.issues;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    code = err.code;
    if (code === "P2002") {
      status = 409;
      message = `Ya existe un registro con ese valor único (${(err.meta as any)?.target?.join?.(", ") || "campo único"})`;
    } else if (code === "P2009") {
      status = 400;
      message = "Valor inválido para algún campo";
    } else if (code === "P2025") {
      status = 404;
      message = "Registro no encontrado";
    }
    details = err.meta || details;
  }

  // Log error in development
  if (process.env.NODE_ENV !== "production") {
    console.error("[ERROR HANDLER]", { 
      status, 
      message, 
      code, 
      details, 
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  res.status(status).json({ 
    ok: false, 
    error: code || "INTERNAL_ERROR",
    message, 
    ...(details && { details }),
    timestamp: new Date().toISOString()
  });
}