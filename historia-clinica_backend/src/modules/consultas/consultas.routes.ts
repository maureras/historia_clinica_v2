// src/modules/consultas/consultas.routes.ts
import { Router } from 'express';
import {
  finalizarConsulta,
  obtenerConsulta,
  listarConsultas,
  actualizarConsulta,
  eliminarConsulta,
  obtenerHistorialPaciente
} from './consultas.controller';

export const consultasRouter = Router();

// Endpoint específico usado por el frontend para finalizar consulta
consultasRouter.post('/finalizar', finalizarConsulta);

// Endpoint para obtener historial de un paciente específico
consultasRouter.get('/paciente/:pacienteId/historial', obtenerHistorialPaciente);

// CRUD básico
consultasRouter.get('/', listarConsultas);
consultasRouter.get('/:id', obtenerConsulta);
consultasRouter.put('/:id', actualizarConsulta);
consultasRouter.delete('/:id', eliminarConsulta);

// 🆕 Rutas adicionales para funcionalidades específicas

// Buscar consultas por rango de fechas
consultasRouter.get('/buscar/fechas', listarConsultas); // Usa el mismo endpoint con parámetros

// Obtener consultas recientes (últimas 10)
consultasRouter.get('/recientes', async (req, res) => {
  try {
    // Reutilizar la función listarConsultas con parámetros específicos
    req.query = { page: '1', pageSize: '10' };
    await listarConsultas(req, res);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al obtener consultas recientes'
    });
  }
});