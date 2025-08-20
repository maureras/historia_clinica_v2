// src/modules/padecimientos/padecimientos.routes.ts
import { Router } from 'express';
import { PadecimientosController } from './padecimientos.controller.js';

export const routerPadecimientos = Router();

// ✅ RUTAS ESPECÍFICAS (deben ir antes de las rutas con parámetros)

// Buscar padecimientos con filtros
routerPadecimientos.get('/buscar', PadecimientosController.buscar);

// Ruta temporal para testing (ELIMINAR DESPUÉS)
routerPadecimientos.post('/test/:pacienteId', PadecimientosController.test);

// ✅ RUTAS CRUD BÁSICAS

// Crear nuevo padecimiento
routerPadecimientos.post('/', PadecimientosController.crear);

// Listar padecimientos de un paciente específico
routerPadecimientos.get('/paciente/:pacienteId', PadecimientosController.listarPorPaciente);

// Obtener padecimiento activo de un paciente
routerPadecimientos.get('/paciente/:pacienteId/activo', PadecimientosController.obtenerActivo);

// ✅ RUTAS CON ID DE PADECIMIENTO

// Obtener padecimiento por ID
routerPadecimientos.get('/:id', PadecimientosController.obtenerPorId);

// Actualizar padecimiento existente
routerPadecimientos.put('/:id', PadecimientosController.actualizar);

// Eliminar padecimiento
routerPadecimientos.delete('/:id', PadecimientosController.eliminar);

// Completar padecimiento (cambiar estado a COMPLETADO)
routerPadecimientos.post('/:id/completar', PadecimientosController.completar);

// ✅ RESUMEN DE RUTAS DISPONIBLES:
/*
POST   /padecimientos                        # Crear nuevo padecimiento
GET    /padecimientos/buscar                 # Buscar con filtros
GET    /padecimientos/paciente/:pacienteId   # Listar por paciente
GET    /padecimientos/paciente/:pacienteId/activo # Obtener activo
GET    /padecimientos/:id                    # Obtener por ID
PUT    /padecimientos/:id                    # Actualizar
DELETE /padecimientos/:id                    # Eliminar
POST   /padecimientos/:id/completar          # Completar

// TEMPORAL (ELIMINAR DESPUÉS):
POST   /padecimientos/test/:pacienteId       # Test
*/