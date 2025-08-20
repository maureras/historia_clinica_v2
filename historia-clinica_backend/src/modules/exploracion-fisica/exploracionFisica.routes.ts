// src/modules/exploracion-fisica/exploracionFisica.routes.ts
import { Router } from 'express';
import { ExploracionFisicaController } from './exploracionFisica.controller.js';

export const routerExploracionFisica = Router();

/*
 * =============================================================================
 * ENDPOINTS PARA EXPLORACIÓN FÍSICA
 * =============================================================================
 * Base: /api/exploracion-fisica
 */

// [POST] /api/exploracion-fisica
// ✅ Crea un nuevo registro de exploración.
routerExploracionFisica.post('/', ExploracionFisicaController.crear);

// [GET] /api/exploracion-fisica/paciente/:pacienteId/ultimo
// ✅ Obtiene el registro MÁS RECIENTE para un paciente.
routerExploracionFisica.get('/paciente/:pacienteId/ultimo', ExploracionFisicaController.obtenerUltimoPorPaciente);

// [GET] /api/exploracion-fisica/consulta/:consultaId
// ✅ Obtiene la exploración específica de una consulta.
routerExploracionFisica.get('/consulta/:consultaId', ExploracionFisicaController.obtenerPorConsulta);

// [PUT] /api/exploracion-fisica/:id
// ✅ Actualiza un registro existente.
routerExploracionFisica.put('/:id', ExploracionFisicaController.actualizar);
