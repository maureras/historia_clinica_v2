// src/modules/diagnosticos/diagnosticos.controller.ts
import { Request, Response, NextFunction } from 'express';
import { DiagnosticosService, CIE10Service } from './diagnosticos.service.js';
import { 
  CreateDiagnosticoSchema, 
  UpdateDiagnosticoSchema,
  BuscarDiagnosticosSchema,
  BuscarCIE10Schema,
  CodigoCIE10Schema 
} from './diagnostico.schema.js';

// Interfaz para códigos CIE-10 devueltos por el servicio
interface CodigoCIE10Response {
  codigo: string;
  descripcion: string;
  categoria?: string | null;
  subcategoria?: string | null;
}

export const DiagnosticosController = {
  // ✅ CREAR DIAGNÓSTICO (desde el formulario del frontend)
  crear: async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🔍 [DIAGNOSTICOS_CONTROLLER] Creando diagnóstico...');
      console.log('📦 [FRONTEND_DATA]', {
        origen: req.get('origin'),
        userAgent: req.get('user-agent')?.substring(0, 50),
        contentType: req.get('content-type'),
        bodySize: JSON.stringify(req.body).length,
        hasImpresionClinica: !!req.body.impresionClinica,
        hasPrincipal: !!req.body.principal,
        hasSecundarios: !!req.body.secundarios,
        hasDiferencial: !!req.body.diferencial,
        hasCIE10: !!req.body.cie10
      });

      // Validar datos del frontend usando el esquema que coincide con DiagnosticoData
      const validationResult = CreateDiagnosticoSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.log('❌ [DIAGNOSTICOS_CONTROLLER] Datos inválidos:', validationResult.error.errors);
        return res.status(400).json({ 
          ok: false, 
          error: "Datos inválidos",
          detalles: validationResult.error.errors.map(e => ({
            campo: e.path.join('.'),
            mensaje: e.message,
            valorRecibido: 'received' in e ? e.received : undefined
          }))
        });
      }

      const data = validationResult.data;
      
      // Validar mínimos requeridos
      if (!data.pacienteId) {
        return res.status(400).json({ 
          ok: false, 
          error: "pacienteId es requerido" 
        });
      }

      if (!data.principal || data.principal.trim() === '') {
        return res.status(400).json({ 
          ok: false, 
          error: "El diagnóstico principal es requerido" 
        });
      }

      // Crear diagnóstico
      const diagnostico = await DiagnosticosService.crear(data);

      console.log('✅ [DIAGNOSTICOS_CONTROLLER] Diagnóstico creado exitosamente:', diagnostico.id);

      // Respuesta que el frontend espera
      res.status(201).json({ 
        ok: true, 
        data: diagnostico,
        message: 'Diagnóstico creado exitosamente'
      });

    } catch (error: any) {
      console.error('❌ [DIAGNOSTICOS_CONTROLLER] Error al crear diagnóstico:', error);
      next(error);
    }
  },

  // ✅ BUSCAR DIAGNÓSTICOS (desde buscadores del frontend)
  buscar: async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🔍 [DIAGNOSTICOS_CONTROLLER] Búsqueda desde frontend...');
      console.log('🔎 [SEARCH_PARAMS]', req.query);

      const validationResult = BuscarDiagnosticosSchema.safeParse(req.query);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          ok: false, 
          error: "Parámetros de búsqueda inválidos",
          detalles: validationResult.error.errors
        });
      }

      const params = validationResult.data;
      
      // Validar fechas si están presentes (convertir para validación solamente)
      if (params.desde) {
        const fechaDesde = new Date(params.desde);
        if (isNaN(fechaDesde.getTime())) {
          return res.status(400).json({ 
            ok: false, 
            error: "La fecha 'desde' no es válida" 
          });
        }
      }

      if (params.hasta) {
        const fechaHasta = new Date(params.hasta);
        if (isNaN(fechaHasta.getTime())) {
          return res.status(400).json({ 
            ok: false, 
            error: "La fecha 'hasta' no es válida" 
          });
        }
      }

      const resultados = await DiagnosticosService.buscar(params);

      res.json({
        ok: true,
        data: resultados.diagnosticos,
        pagination: {
          total: resultados.total,
          pagina: resultados.pagina,
          limite: resultados.limite,
          totalPaginas: resultados.totalPaginas
        },
        filtros: resultados.filtros
      });

    } catch (error: any) {
      console.error('❌ [DIAGNOSTICOS_CONTROLLER] Error en búsqueda:', error);
      next(error);
    }
  },

  // ✅ LISTAR DIAGNÓSTICOS POR PACIENTE
  listarPorPaciente: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pacienteId } = req.params;
      
      if (!pacienteId) {
        return res.status(400).json({ 
          ok: false, 
          error: "pacienteId es requerido" 
        });
      }

      const pacienteIdNum = parseInt(pacienteId, 10);
      if (isNaN(pacienteIdNum)) {
        return res.status(400).json({ 
          ok: false, 
          error: "pacienteId debe ser un número válido" 
        });
      }

      // Obtener parámetros de paginación de query string
      const limite = parseInt(req.query.limite as string, 10) || 20;
      const pagina = parseInt(req.query.pagina as string, 10) || 1;

      const resultados = await DiagnosticosService.listarPorPaciente(pacienteIdNum, limite, pagina);

      res.json({
        ok: true,
        data: resultados.diagnosticos,
        pagination: {
          total: resultados.total,
          pagina: resultados.pagina,
          limite: resultados.limite,
          totalPaginas: resultados.totalPaginas
        }
      });

    } catch (error: any) {
      console.error('❌ [DIAGNOSTICOS_CONTROLLER] Error al listar por paciente:', error);
      next(error);
    }
  },

  // ✅ OBTENER DIAGNÓSTICO POR ID
  obtenerPorId: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          ok: false, 
          error: "ID es requerido" 
        });
      }

      const idNum = parseInt(id, 10);
      if (isNaN(idNum)) {
        return res.status(400).json({ 
          ok: false, 
          error: "ID debe ser un número válido" 
        });
      }

      const diagnostico = await DiagnosticosService.obtenerPorId(idNum);

      if (!diagnostico) {
        return res.status(404).json({ 
          ok: false, 
          error: "Diagnóstico no encontrado" 
        });
      }

      res.json({ 
        ok: true, 
        data: diagnostico 
      });

    } catch (error: any) {
      console.error('❌ [DIAGNOSTICOS_CONTROLLER] Error al obtener por ID:', error);
      next(error);
    }
  },

  // ✅ ACTUALIZAR DIAGNÓSTICO (desde formulario de edición del frontend)
  actualizar: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          ok: false, 
          error: "ID es requerido" 
        });
      }

      const idNum = parseInt(id, 10);
      if (isNaN(idNum)) {
        return res.status(400).json({ 
          ok: false, 
          error: "ID debe ser un número válido" 
        });
      }

      // Validar datos del frontend
      const validationResult = UpdateDiagnosticoSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          ok: false, 
          error: "Datos inválidos",
          detalles: validationResult.error.errors
        });
      }

      const data = validationResult.data;
      const diagnosticoActualizado = await DiagnosticosService.actualizar(idNum, data);

      if (!diagnosticoActualizado) {
        return res.status(404).json({ 
          ok: false, 
          error: "Diagnóstico no encontrado" 
        });
      }

      res.json({ 
        ok: true, 
        data: diagnosticoActualizado,
        message: 'Diagnóstico actualizado exitosamente'
      });

    } catch (error: any) {
      console.error('❌ [DIAGNOSTICOS_CONTROLLER] Error al actualizar:', error);
      next(error);
    }
  },

  // ✅ ELIMINAR/ANULAR DIAGNÓSTICO
  eliminar: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          ok: false, 
          error: "ID es requerido" 
        });
      }

      const idNum = parseInt(id, 10);
      if (isNaN(idNum)) {
        return res.status(400).json({ 
          ok: false, 
          error: "ID debe ser un número válido" 
        });
      }

      const diagnosticoEliminado = await DiagnosticosService.eliminar(idNum);

      if (!diagnosticoEliminado) {
        return res.status(404).json({ 
          ok: false, 
          error: "Diagnóstico no encontrado" 
        });
      }

      res.json({ 
        ok: true, 
        message: "Diagnóstico anulado exitosamente",
        data: diagnosticoEliminado
      });

    } catch (error: any) {
      console.error('❌ [DIAGNOSTICOS_CONTROLLER] Error al eliminar:', error);
      next(error);
    }
  },

  // ✅ TEST DE FUNCIONALIDAD
  test: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ 
        ok: true, 
        message: "Módulo de diagnósticos funcionando correctamente",
        timestamp: new Date().toISOString(),
        endpoints: [
          'POST /api/diagnosticos - Crear diagnóstico',
          'GET /api/diagnosticos/buscar - Buscar diagnósticos',
          'GET /api/diagnosticos/paciente/:id - Listar por paciente',
          'GET /api/diagnosticos/:id - Obtener por ID',
          'PUT /api/diagnosticos/:id - Actualizar',
          'DELETE /api/diagnosticos/:id - Eliminar/Anular',
          'GET /api/diagnosticos/cie10/buscar - Buscar códigos CIE-10'
        ]
      });
    } catch (error: any) {
      next(error);
    }
  }
};

// ===== CONTROLADOR PARA CÓDIGOS CIE-10 =====
export const CIE10Controller = {
  // ✅ BUSCAR CÓDIGOS CIE-10 (para el buscador del frontend)
  buscar: async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🔍 [CIE10_CONTROLLER] Búsqueda de códigos CIE-10...');
      console.log('🔎 [SEARCH_QUERY]', req.query);

      const validationResult = BuscarCIE10Schema.safeParse(req.query);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          ok: false, 
          error: "Parámetros de búsqueda inválidos",
          detalles: validationResult.error.errors
        });
      }

      const params = validationResult.data;
      const resultados = await CIE10Service.buscar(params);

      // Formato que espera el buscador del frontend
      res.json({
        ok: true,
        data: resultados.codigos.map((codigo: CodigoCIE10Response) => ({
          code: codigo.codigo,
          description: codigo.descripcion,
          categoria: codigo.categoria,
          subcategoria: codigo.subcategoria
        })),
        pagination: {
          total: resultados.total,
          pagina: resultados.pagina,
          limite: resultados.limite,
          totalPaginas: resultados.totalPaginas
        }
      });

    } catch (error: any) {
      console.error('❌ [CIE10_CONTROLLER] Error en búsqueda:', error);
      next(error);
    }
  },

  // ✅ CREAR CÓDIGO CIE-10 (para administración)
  crear: async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🔍 [CIE10_CONTROLLER] Creando código CIE-10...');

      const validationResult = CodigoCIE10Schema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          ok: false, 
          error: "Datos inválidos",
          detalles: validationResult.error.errors
        });
      }

      const data = validationResult.data;
      const codigo = await CIE10Service.crear(data);

      res.status(201).json({ 
        ok: true, 
        data: codigo,
        message: 'Código CIE-10 creado exitosamente'
      });

    } catch (error: any) {
      console.error('❌ [CIE10_CONTROLLER] Error al crear código:', error);
      next(error);
    }
  },

  // ✅ OBTENER CÓDIGOS COMUNES (para el frontend)
  obtenerComunes: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Códigos CIE-10 más comunes (coincide con los del frontend)
      const codigosComunes = [
        { code: 'I10', description: 'Hipertensión esencial (primaria)' },
        { code: 'E11.9', description: 'Diabetes mellitus tipo 2, sin complicaciones' },
        { code: 'J06.9', description: 'Infección aguda de las vías respiratorias superiores, no especificada' },
        { code: 'R51', description: 'Cefalea' },
        { code: 'K30', description: 'Dispepsia' },
        { code: 'Z00.0', description: 'Examen médico general' },
        { code: 'M79.3', description: 'Panniculitis, no especificada' },
        { code: 'R06.00', description: 'Disnea, no especificada' },
        { code: 'R50.9', description: 'Fiebre, no especificada' },
        { code: 'N39.0', description: 'Infección de vías urinarias, sitio no especificado' }
      ] as const;

      res.json({
        ok: true,
        data: codigosComunes
      });

    } catch (error: any) {
      console.error('❌ [CIE10_CONTROLLER] Error al obtener códigos comunes:', error);
      next(error);
    }
  }
};