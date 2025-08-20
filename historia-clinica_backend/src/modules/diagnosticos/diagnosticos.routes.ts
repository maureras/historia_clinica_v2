// src/modules/diagnosticos/diagnosticos.routes.ts
import { Router } from 'express';
import { DiagnosticosController, CIE10Controller } from './diagnosticos.controller.js';

export const routerDiagnosticos = Router();

// ===== RUTAS ESPECÍFICAS (deben ir antes de las rutas con parámetros) =====

// 🔍 Buscar diagnósticos con filtros
routerDiagnosticos.get('/buscar', DiagnosticosController.buscar);

// 🧪 Test de funcionalidad
routerDiagnosticos.get('/test', DiagnosticosController.test);

// 📋 Buscar códigos CIE-10 (para el buscador del frontend)
routerDiagnosticos.get('/cie10/buscar', CIE10Controller.buscar);

// 📚 Obtener códigos CIE-10 comunes
routerDiagnosticos.get('/cie10/comunes', CIE10Controller.obtenerComunes);

// 🆕 Crear código CIE-10 (administración)
routerDiagnosticos.post('/cie10', CIE10Controller.crear);

// ===== RUTAS CRUD BÁSICAS =====

// 📝 Crear nuevo diagnóstico (desde formulario del frontend)
routerDiagnosticos.post('/', DiagnosticosController.crear);

// 👤 Listar diagnósticos de un paciente específico
routerDiagnosticos.get('/paciente/:pacienteId', DiagnosticosController.listarPorPaciente);

// ===== RUTAS CON ID DE DIAGNÓSTICO =====

// 🔍 Obtener diagnóstico por ID
routerDiagnosticos.get('/:id', DiagnosticosController.obtenerPorId);

// ✏️ Actualizar diagnóstico existente (desde formulario de edición)
routerDiagnosticos.put('/:id', DiagnosticosController.actualizar);

// 🗑️ Eliminar/Anular diagnóstico
routerDiagnosticos.delete('/:id', DiagnosticosController.eliminar);

// ===== RESUMEN DE RUTAS DISPONIBLES =====
/*
ENDPOINTS PRINCIPALES (para el frontend):
POST   /api/diagnosticos                    # ✅ Crear diagnóstico (desde DiagnosticoForm)
GET    /api/diagnosticos/buscar             # ✅ Buscar con filtros avanzados
GET    /api/diagnosticos/paciente/:id       # ✅ Listar diagnósticos del paciente
GET    /api/diagnosticos/:id                # ✅ Obtener diagnóstico específico
PUT    /api/diagnosticos/:id                # ✅ Actualizar diagnóstico (edición)
DELETE /api/diagnosticos/:id                # ✅ Anular diagnóstico

ENDPOINTS CIE-10 (para el buscador del frontend):
GET    /api/diagnosticos/cie10/buscar       # ✅ Buscar códigos CIE-10 (searchTerm)
GET    /api/diagnosticos/cie10/comunes      # ✅ Códigos CIE-10 más comunes
POST   /api/diagnosticos/cie10              # ✅ Crear nuevo código (admin)

ENDPOINT DE PRUEBA:
GET    /api/diagnosticos/test               # ✅ Test de funcionamiento

EJEMPLOS DE USO DESDE EL FRONTEND:

1. CREAR DIAGNÓSTICO:
fetch('/api/diagnosticos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pacienteId: 15,
    impresionClinica: "Paciente presenta síntomas compatibles con...",
    principal: "Hipertensión arterial esencial",
    secundarios: "Diabetes mellitus tipo 2, Obesidad",
    diferencial: "Hipertensión secundaria a descartar",
    cie10: "I10 - Hipertensión esencial (primaria)",
    consultaId: 5  // opcional
  })
})

2. BUSCAR CÓDIGOS CIE-10 (para el searchTerm del frontend):
fetch('/api/diagnosticos/cie10/buscar?q=hipertension&limite=10')

3. LISTAR DIAGNÓSTICOS DE UN PACIENTE:
fetch('/api/diagnosticos/paciente/15?limite=20&pagina=1')

4. ACTUALIZAR DIAGNÓSTICO:
fetch('/api/diagnosticos/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    principal: "Hipertensión arterial esencial - diagnóstico confirmado",
    cie10: "I10 - Hipertensión esencial (primaria)",
    observaciones: "Confirmado con mediciones ambulatorias"
  })
})

5. BUSCAR DIAGNÓSTICOS CON FILTROS:
fetch('/api/diagnosticos/buscar?pacienteId=15&estado=ACTIVO&cie10=I10&limite=10')
*/