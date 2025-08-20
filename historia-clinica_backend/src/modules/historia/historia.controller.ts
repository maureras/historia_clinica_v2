// src/modules/historia/historia.controller.ts - Versión con debugging y manejo robusto de errores

import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';

/**
 * Buscar pacientes para el componente BusquedaPaciente
 * GET /api/historia/buscar?q=...
 */
export async function buscarPacientes(req: Request, res: Response) {
  try {
    console.log('🔍 [DEBUG] Iniciando búsqueda de pacientes...');
    console.log('🔍 [DEBUG] Query params:', req.query);
    
    const query = req.query.q as string;
    
    if (!query || query.length < 2) {
      console.log('🔍 [DEBUG] Query muy corto o vacío, retornando array vacío');
      return res.json([]);
    }

    console.log(`🔍 [DEBUG] Buscando pacientes con query: "${query}"`);

    // Verificar conexión a base de datos
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ [DEBUG] Conexión a BD exitosa');
    } catch (dbError) {
      console.error('❌ [DEBUG] Error de conexión a BD:', dbError);
      return res.status(500).json({
        ok: false,
        error: 'DATABASE_CONNECTION_ERROR',
        message: 'Error de conexión a la base de datos'
      });
    }

    // Verificar que la tabla paciente existe
    try {
      const count = await prisma.paciente.count();
      console.log(`📊 [DEBUG] Total de pacientes en BD: ${count}`);
    } catch (tableError) {
      console.error('❌ [DEBUG] Error accediendo tabla paciente:', tableError);
      return res.status(500).json({
        ok: false,
        error: 'TABLE_ACCESS_ERROR',
        message: 'Error accediendo a la tabla de pacientes. Verifica que la BD esté migrada.'
      });
    }

    // Realizar búsqueda con manejo de errores robusto
    let pacientes;
    try {
      pacientes = await prisma.paciente.findMany({
        where: {
          OR: [
            { nombres: { contains: query } },
            { apellidos: { contains: query } },
            { numeroIdentificacion: { contains: query } },
            { email: { contains: query } }
          ]
        },
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          numeroIdentificacion: true,
          telefono: true,
          consultas: {
            select: { fechaConsulta: true },
            orderBy: { fechaConsulta: 'desc' },
            take: 1
          }
        },
        take: 10,
        orderBy: [
          { nombres: 'asc' },
          { apellidos: 'asc' }
        ]
      });

      console.log(`✅ [DEBUG] Consulta exitosa. Encontrados: ${pacientes.length} pacientes`);

    } catch (searchError) {
      console.error('❌ [DEBUG] Error en búsqueda:', searchError);
      
      // Intentar búsqueda más simple como fallback
      try {
        console.log('🔄 [DEBUG] Intentando búsqueda simplificada...');
        pacientes = await prisma.paciente.findMany({
          where: {
            nombres: { contains: query }
          },
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            numeroIdentificacion: true,
            telefono: true
          },
          take: 5
        });
        console.log(`✅ [DEBUG] Búsqueda simplificada exitosa: ${pacientes.length} resultados`);
      } catch (fallbackError) {
        console.error('❌ [DEBUG] Error en búsqueda simplificada:', fallbackError);
        return res.status(500).json({
          ok: false,
          error: 'SEARCH_ERROR',
          message: 'Error realizando la búsqueda de pacientes'
        });
      }
    }

    // Formatear resultados para el frontend
    const sugerencias = pacientes.map(p => {
      console.log(`📝 [DEBUG] Procesando paciente: ${p.nombres} ${p.apellidos}`);
      
      return {
        id: p.id.toString(),
        nombre: `${p.nombres} ${p.apellidos}`,
        cedula: p.numeroIdentificacion,
        telefono: p.telefono,
        ultimaVisita: (p as any).consultas?.[0]?.fechaConsulta?.toISOString() || null
      };
    });

    console.log(`✅ [DEBUG] Resultados formateados: ${sugerencias.length} sugerencias`);
    console.log('📤 [DEBUG] Enviando respuesta al frontend...');

    res.json(sugerencias);

  } catch (error) {
    console.error('❌ [DEBUG] Error general en buscarPacientes:', error);
    console.error('❌ [DEBUG] Stack trace:', (error as Error).stack);
    
    res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno al buscar pacientes',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

/**
 * Obtener línea de tiempo completa de un paciente
 * GET /api/historia/paciente/:id
 */
export async function obtenerLineaTiempo(req: Request, res: Response) {
  try {
    console.log('📋 [DEBUG] Iniciando obtención de línea de tiempo...');
    
    const pacienteId = parseInt(req.params.id);
    
    if (isNaN(pacienteId)) {
      console.log('❌ [DEBUG] ID de paciente inválido:', req.params.id);
      return res.status(400).json({
        ok: false,
        error: 'INVALID_ID',
        message: 'ID de paciente inválido'
      });
    }

    console.log(`📋 [DEBUG] Obteniendo línea de tiempo del paciente ID: ${pacienteId}`);

    // 1. Verificar que el paciente existe
    const paciente = await prisma.paciente.findUnique({
      where: { id: pacienteId }
    });

    if (!paciente) {
      console.log(`❌ [DEBUG] Paciente ${pacienteId} no encontrado`);
      return res.status(404).json({
        ok: false,
        error: 'PATIENT_NOT_FOUND',
        message: 'Paciente no encontrado'
      });
    }

    console.log(`✅ [DEBUG] Paciente encontrado: ${paciente.nombres} ${paciente.apellidos}`);

    // 2. Obtener consultas con manejo de errores
    let consultas = [];
    try {
      consultas = await prisma.consulta.findMany({
        where: { pacienteId },
        orderBy: { fechaConsulta: 'desc' },
        take: 20
      });
      console.log(`✅ [DEBUG] Consultas obtenidas: ${consultas.length}`);
    } catch (consultaError) {
      console.error('⚠️ [DEBUG] Error obteniendo consultas:', consultaError);
      // Continuar sin consultas
    }

    // 3. Obtener laboratorios con manejo de errores
    let laboratorios = [];
    try {
      laboratorios = await prisma.laboratorioArchivo.findMany({
        where: { pacienteId },
        include: {
          resultados: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      console.log(`✅ [DEBUG] Laboratorios obtenidos: ${laboratorios.length}`);
    } catch (labError) {
      console.error('⚠️ [DEBUG] Error obteniendo laboratorios:', labError);
      // Continuar sin laboratorios
    }

    // 4. Formatear paciente de forma segura
    let alergias: string[] = [];
    let contactoEmergencia: any = null;

    try {
      if (paciente.alergias) {
        if (Array.isArray(paciente.alergias)) {
          alergias = paciente.alergias as string[];
        } else if (typeof paciente.alergias === 'string') {
          alergias = JSON.parse(paciente.alergias);
        }
      }
    } catch (error) {
      console.warn('⚠️ [DEBUG] Error parsing alergias:', error);
      alergias = [];
    }

    try {
      if (paciente.contactoEmergencia) {
        if (typeof paciente.contactoEmergencia === 'object') {
          contactoEmergencia = paciente.contactoEmergencia;
        } else if (typeof paciente.contactoEmergencia === 'string') {
          contactoEmergencia = JSON.parse(paciente.contactoEmergencia);
        }
      }
    } catch (error) {
      console.warn('⚠️ [DEBUG] Error parsing contactoEmergencia:', error);
      contactoEmergencia = null;
    }

    const pacienteFormateado = {
      id: paciente.id.toString(),
      nombre: `${paciente.nombres} ${paciente.apellidos}`,
      edad: paciente.edad,
      cedula: paciente.numeroIdentificacion,
      telefono: paciente.telefono,
      email: paciente.email,
      direccion: paciente.direccion,
      fechaNacimiento: paciente.fechaNacimiento?.toISOString(),
      grupoSanguineo: paciente.grupoSanguineo,
      alergias,
      contactoEmergencia
    };

    // 5. Formatear eventos de forma segura
    const eventos: any[] = [];

    // Agregar consultas como eventos
    consultas.forEach((consulta, index) => {
      try {
        console.log(`📝 [DEBUG] Procesando consulta ${index + 1}/${consultas.length}`);
        
        let diagnosticoTexto = '';
        let tratamientoTexto = '';
        let motivo = 'Consulta médica';

        // Parsear JSON fields de forma segura
        try {
          if (consulta.diagnostico) {
            const diagnostico = JSON.parse(consulta.diagnostico);
            diagnosticoTexto = diagnostico?.descripcion || '';
          }
        } catch (error) {
          console.warn(`⚠️ [DEBUG] Error parsing diagnostico consulta ${consulta.id}:`, error);
        }

        try {
          if (consulta.tratamiento) {
            const tratamiento = JSON.parse(consulta.tratamiento);
            tratamientoTexto = tratamiento?.prescripcionesResumen || '';
          }
        } catch (error) {
          console.warn(`⚠️ [DEBUG] Error parsing tratamiento consulta ${consulta.id}:`, error);
        }

        try {
          if (consulta.padecimientoActual) {
            const padecimiento = JSON.parse(consulta.padecimientoActual);
            motivo = padecimiento?.motivo || 'Consulta médica';
          }
        } catch (error) {
          console.warn(`⚠️ [DEBUG] Error parsing padecimiento consulta ${consulta.id}:`, error);
        }

        eventos.push({
          id: `consulta-${consulta.id}`,
          tipo: 'Consulta General',
          fecha: consulta.fechaConsulta.toISOString(),
          resumen: motivo,
          diagnostico: diagnosticoTexto || null,
          tratamiento: tratamientoTexto || null,
          notas: null,
          medicamentos: null,
          siguienteCita: null,
          detalles: {
            consultaId: consulta.id,
            tipo: 'consulta'
          }
        });
      } catch (error) {
        console.error(`❌ [DEBUG] Error procesando consulta ${consulta.id}:`, error);
      }
    });

    // Agregar laboratorios como eventos
    laboratorios.forEach((lab, index) => {
      try {
        console.log(`🧪 [DEBUG] Procesando laboratorio ${index + 1}/${laboratorios.length}`);
        
        const resumenHallazgos = lab.resumenHallazgos || 'Laboratorio procesado';
        const cantidadResultados = lab.resultados?.length || 0;
        
        eventos.push({
          id: `laboratorio-${lab.id}`,
          tipo: 'Exámenes de Laboratorio',
          fecha: (lab.fechaInforme || lab.createdAt).toISOString(),
          resumen: `${lab.nombreArchivo} - ${cantidadResultados} resultado(s)`,
          diagnostico: null,
          tratamiento: null,
          notas: resumenHallazgos,
          medicamentos: null,
          siguienteCita: null,
          detalles: {
            laboratorioId: lab.id,
            tipo: 'laboratorio',
            archivo: lab.nombreArchivo,
            resultados: lab.resultados?.map(r => ({
              prueba: r.prueba,
              valor: r.valor,
              unidad: r.unidad,
              rango: r.rango
            })) || []
          }
        });
      } catch (error) {
        console.error(`❌ [DEBUG] Error procesando laboratorio ${lab.id}:`, error);
      }
    });

    // Ordenar eventos por fecha (más reciente primero)
    eventos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    const respuesta = {
      paciente: pacienteFormateado,
      eventos: eventos.slice(0, 15)
    };

    console.log(`✅ [DEBUG] Línea de tiempo completada: ${eventos.length} eventos`);
    res.json(respuesta);

  } catch (error) {
    console.error('❌ [DEBUG] Error general en obtenerLineaTiempo:', error);
    console.error('❌ [DEBUG] Stack trace:', (error as Error).stack);
    
    res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno al obtener línea de tiempo',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

/**
 * Obtener detalles específicos de un evento
 * GET /api/historia/evento/:tipo/:id
 */
export async function obtenerDetalleEvento(req: Request, res: Response) {
  try {
    const { tipo, id } = req.params;
    const eventoId = parseInt(id);

    if (isNaN(eventoId)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_ID',
        message: 'ID de evento inválido'
      });
    }

    console.log(`🔍 [DEBUG] Obteniendo detalles del evento ${tipo}:${eventoId}`);

    // Por ahora, respuesta simple
    res.json({
      ok: true,
      message: `Detalles del evento ${tipo}:${eventoId}`,
      data: {
        id: eventoId,
        tipo: tipo,
        detalles: 'Funcionalidad en desarrollo'
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error obteniendo detalles del evento:', error);
    res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno al obtener detalles del evento'
    });
  }
}

/**
 * Obtener estadísticas de un paciente
 * GET /api/historia/paciente/:id/estadisticas
 */
export async function obtenerEstadisticasPaciente(req: Request, res: Response) {
  try {
    const pacienteId = parseInt(req.params.id);
    
    if (isNaN(pacienteId)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_ID',
        message: 'ID de paciente inválido'
      });
    }

    // Estadísticas básicas por ahora
    const estadisticas = {
      totalConsultas: 0,
      totalLaboratorios: 0,
      totalEventos: 0,
      ultimaConsulta: null,
      proximaCita: null
    };

    res.json(estadisticas);

  } catch (error) {
    console.error('❌ [DEBUG] Error obteniendo estadísticas:', error);
    res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno al obtener estadísticas'
    });
  }
}