// src/middleware/index.ts - Middleware principal
import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';

// Middleware de logging personalizado
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const userAgent = req.headers['user-agent'];
  
  console.log(`📝 [${timestamp}] ${method} ${url} - ${userAgent?.slice(0, 100)}`);
  
  // Si es POST/PUT, loguear el body (sin datos sensibles)
  if ((method === 'POST' || method === 'PUT') && req.body) {
    const bodyLog = { ...req.body };
    // Ocultar campos sensibles
    if (bodyLog.password) bodyLog.password = '***';
    if (bodyLog.email) bodyLog.email = bodyLog.email.replace(/(.{1,3}).*@/, '$1***@');
    
    console.log(`📋 Body:`, JSON.stringify(bodyLog, null, 2));
  }
  
  next();
}

// Middleware de seguridad
export function securityMiddleware() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false
  });
}

// Middleware de compresión
export function compressionMiddleware() {
  return compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024, // Solo comprimir archivos > 1KB
    level: 6 // Nivel de compresión
  });
}

// Middleware de logging HTTP
export function httpLogger() {
  const format = process.env.NODE_ENV === 'production' 
    ? 'combined' 
    : '🌐 :method :url :status :response-time ms - :res[content-length]';
    
  return morgan(format, {
    stream: {
      write: (message) => {
        console.log(message.trim());
      }
    }
  });
}

// Middleware de validación de JSON
export function jsonValidation(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      ok: false,
      error: 'INVALID_JSON',
      message: 'El JSON enviado no es válido'
    });
  }
  next(err);
}

// Middleware de rate limiting simple (en memoria)
const requests = new Map<string, { count: number; resetTime: number }>();

export function basicRateLimit(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const clientData = requests.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      // Primera solicitud o ventana expirada
      requests.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        ok: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Demasiadas solicitudes. Intente más tarde.',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
    
    clientData.count++;
    next();
  };
}

// Middleware para limpiar datos de entrada
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Remover caracteres potencialmente peligrosos
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
    } else {
      sanitized[key] = sanitizeObject(value);
    }
  }
  
  return sanitized;
}

// Middleware de headers CORS personalizados
export function corsHeaders(req: Request, res: Response, next: NextFunction) {
  // Headers adicionales para desarrollo
  if (process.env.NODE_ENV === 'development') {
    res.header('X-Development-Mode', 'true');
  }
  
  // Headers de cache para archivos estáticos
  if (req.path.includes('/uploads/')) {
    res.header('Cache-Control', 'public, max-age=86400'); // 1 día
  }
  
  next();
}

// Middleware de timeout
export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          ok: false,
          error: 'REQUEST_TIMEOUT',
          message: 'La solicitud tardó demasiado tiempo'
        });
      }
    }, timeoutMs);
    
    res.on('finish', () => {
      clearTimeout(timeout);
    });
    
    next();
  };
}