// src/modules/signos-vitales/signosVitales.routes.ts
import { Router } from 'express';
import { SignosVitalesController } from './signosVitales.controller.js';

export const routerSignosVitales = Router();

/*
 * =============================================================================
 * ENDPOINTS PARA SIGNOS VITALES
 * =============================================================================
 * Base: /api/signos-vitales
 */

// [POST] /api/signos-vitales
// ✅ Crea un nuevo registro de signos vitales.
// Body: SignosVitalesData
routerSignosVitales.post('/', SignosVitalesController.crear);

// [GET] /api/signos-vitales/paciente/:pacienteId/ultimo
// ✅ Obtiene el registro MÁS RECIENTE de signos vitales para un paciente.
// Útil para pre-rellenar el formulario en una nueva consulta.
routerSignosVitales.get('/paciente/:pacienteId/ultimo', SignosVitalesController.obtenerUltimoPorPaciente);

// [GET] /api/signos-vitales/consulta/:consultaId
// ✅ Obtiene los signos vitales específicos de una consulta.
routerSignosVitales.get('/consulta/:consultaId', SignosVitalesController.obtenerPorConsulta);

// [PUT] /api/signos-vitales/:id
// ✅ Actualiza un registro existente de signos vitales.
// Body: SignosVitalesData (parcial)
routerSignosVitales.put('/:id', SignosVitalesController.actualizar);

// [DELETE] /api/signos-vitales/:id
// 🗑️ Elimina un registro de signos vitales.
routerSignosVitales.delete('/:id', SignosVitalesController.eliminar);

