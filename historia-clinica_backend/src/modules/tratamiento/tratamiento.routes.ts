// src/modules/tratamiento/tratamiento.routes.ts
import { Router } from 'express';
import { TratamientoController } from './tratamiento.controller.js';

export const routerTratamiento = Router();

/*
 * =============================================================================
 * ENDPOINTS PARA PLAN DE TRATAMIENTO
 * =============================================================================
 * Base: /api/tratamiento
 */

// [POST] /api/tratamiento
// ✅ Crea un nuevo plan de tratamiento.
routerTratamiento.post('/', TratamientoController.crear);

// [GET] /api/tratamiento/paciente/:pacienteId/ultimo
// ✅ Obtiene el plan MÁS RECIENTE para un paciente.
routerTratamiento.get('/paciente/:pacienteId/ultimo', TratamientoController.obtenerUltimoPorPaciente);

// [GET] /api/tratamiento/consulta/:consultaId
// ✅ Obtiene el plan específico de una consulta.
routerTratamiento.get('/consulta/:consultaId', TratamientoController.obtenerPorConsulta);

// [PUT] /api/tratamiento/:id
// ✅ Actualiza un plan existente.
routerTratamiento.put('/:id', TratamientoController.actualizar);
