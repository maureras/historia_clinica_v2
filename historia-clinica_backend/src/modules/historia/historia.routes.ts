// src/modules/historia/historia.routes.ts - Rutas específicas para Historia Clínica

import { Router } from 'express';
import {
  buscarPacientes,
  obtenerLineaTiempo,
  obtenerDetalleEvento,
  obtenerEstadisticasPaciente
} from './historia.controller';

export const historiaRouter = Router();

// ✅ Ruta de prueba
historiaRouter.get('/test', (req, res) => {
  res.json({
    ok: true,
    message: 'Módulo de Historia Clínica funcionando correctamente',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/historia/buscar?q=... - Buscar pacientes',
      'GET /api/historia/paciente/:id - Línea de tiempo del paciente',
      'GET /api/historia/evento/:tipo/:id - Detalles de un evento',
      'GET /api/historia/paciente/:id/estadisticas - Estadísticas del paciente'
    ]
  });
});

// ✅ Búsqueda de pacientes para el frontend
// GET /api/historia/buscar?q=maria
historiaRouter.get('/buscar', buscarPacientes);

// ✅ Obtener línea de tiempo completa de un paciente
// GET /api/historia/paciente/123
historiaRouter.get('/paciente/:id', obtenerLineaTiempo);

// ✅ Obtener detalles específicos de un evento
// GET /api/historia/evento/consulta/456
// GET /api/historia/evento/laboratorio/789
historiaRouter.get('/evento/:tipo/:id', obtenerDetalleEvento);

// ✅ Obtener estadísticas de un paciente
// GET /api/historia/paciente/123/estadisticas
historiaRouter.get('/paciente/:id/estadisticas', obtenerEstadisticasPaciente);

// ✅ Endpoint adicional para exportar historial (futuro)
historiaRouter.get('/paciente/:id/exportar', async (req, res) => {
  res.json({
    ok: false,
    message: 'Funcionalidad de exportación en desarrollo',
    suggestion: 'Usar GET /api/historia/paciente/:id por ahora'
  });
});

export default historiaRouter;