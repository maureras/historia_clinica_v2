// src/modules/pacientes/pacientes.routes.ts

import { Router } from 'express';
import { buscarPacientesParaConsultas, obtenerPacienteCompleto } from './pacientes.search.controller';
import { 
  crearPaciente, 
  obtenerPaciente, 
  listarPacientes, 
  actualizarPaciente, 
  eliminarPaciente 
} from './pacientes.controller';

export const pacientesRouter = Router();

// ✅ Rutas específicas (DEBEN ir ANTES de las rutas con parámetros)
pacientesRouter.get('/test', (req, res) => {
  res.json({
    ok: true,
    message: 'Módulo de pacientes funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

pacientesRouter.get('/buscar-consultas', buscarPacientesParaConsultas);
pacientesRouter.get('/completo/:id', obtenerPacienteCompleto);

// ✅ CRUD básico (rutas con parámetros van AL FINAL)
pacientesRouter.post('/', crearPaciente);        // ✅ Crear paciente
pacientesRouter.get('/', listarPacientes);       // ✅ Listar pacientes
pacientesRouter.get('/:id', obtenerPaciente);    // ✅ Obtener paciente específico
pacientesRouter.put('/:id', actualizarPaciente); // ✅ Actualizar paciente
pacientesRouter.delete('/:id', eliminarPaciente); // ✅ Eliminar paciente