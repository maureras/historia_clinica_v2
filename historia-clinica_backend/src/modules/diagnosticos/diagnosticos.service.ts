// src/modules/diagnosticos/diagnosticos.service.ts
import { prisma } from "../../db/prisma.js";
import { Prisma } from '@prisma/client';
import { 
  CreateDiagnosticoData, 
  UpdateDiagnosticoData, 
  BuscarDiagnosticosParams,
  BuscarCIE10Params,
  CodigoCIE10Data 
} from './diagnostico.schema.js';

// Función helper para convertir strings vacíos a null
const toNull = (v: unknown) =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? null : (v as any);

export const DiagnosticosService = {
  // ✅ CREAR DIAGNÓSTICO (desde el formulario del frontend)
  async crear(raw: CreateDiagnosticoData) {
    console.log('🔍 [DIAGNOSTICOS_SERVICE] Creando diagnóstico...');
    console.log('📋 [FRONTEND_DATA]', { 
      pacienteId: raw.pacienteId,
      principal: raw.principal?.substring(0, 50) + '...' || 'Sin diagnóstico',
      cie10: raw.cie10 || 'Sin código CIE-10'
    });

    try {
      // Verificar que el paciente existe
      const pacienteExiste = await prisma.paciente.findUnique({
        where: { id: raw.pacienteId },
        select: { id: true, nombres: true, apellidos: true }
      });

      if (!pacienteExiste) {
        console.log('❌ [DIAGNOSTICOS_SERVICE] Paciente no encontrado:', raw.pacienteId);
        throw new Error("Paciente no encontrado");
      }

      // Verificar consulta si se proporciona
      if (raw.consultaId) {
        const consultaExiste = await prisma.consulta.findUnique({
          where: { id: raw.consultaId },
          select: { id: true, pacienteId: true }
        });

        if (!consultaExiste) {
          throw new Error("Consulta no encontrada");
        }

        if (consultaExiste.pacienteId !== raw.pacienteId) {
          throw new Error("La consulta no pertenece al paciente especificado");
        }
      }

      // Preparar datos para crear
      const data = {
        pacienteId: raw.pacienteId,
        consultaId: raw.consultaId || null,
        impresionClinica: toNull(raw.impresionClinica),
        principal: raw.principal.trim(),
        secundarios: toNull(raw.secundarios),
        diferencial: toNull(raw.diferencial),
        cie10: toNull(raw.cie10),
        observaciones: toNull(raw.observaciones),
        estado: "ACTIVO" as const,
        fechaDiagnostico: new Date()
      };

      // Crear diagnóstico
      const diagnostico = await prisma.diagnostico.create({
        data,
        include: {
          paciente: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              numeroIdentificacion: true
            }
          },
          consulta: {
            select: {
              id: true,
              fecha: true,
              tipo: true,
              estado: true
            }
          }
        }
      });

      console.log('✅ [DIAGNOSTICOS_SERVICE] Diagnóstico creado exitosamente:', diagnostico.id);
      return diagnostico;

    } catch (err: any) {
      console.error('❌ [DIAGNOSTICOS_SERVICE] Error al crear diagnóstico:', err);
      throw err;
    }
  },

  // ✅ LISTAR DIAGNÓSTICOS DE UN PACIENTE
  async listarPorPaciente(pacienteId: number, limite: number = 20, pagina: number = 1) {
    console.log('🔍 [DIAGNOSTICOS_SERVICE] Listando diagnósticos del paciente:', pacienteId);

    try {
      // Verificar que el paciente existe
      const pacienteExiste = await prisma.paciente.findUnique({
        where: { id: pacienteId },
        select: { id: true }
      });

      if (!pacienteExiste) {
        throw new Error("Paciente no encontrado");
      }

      const skip = (pagina - 1) * limite;

      const [diagnosticos, total] = await Promise.all([
        prisma.diagnostico.findMany({
          where: { pacienteId },
          include: {
            consulta: {
              select: {
                id: true,
                fecha: true,
                tipo: true,
                estado: true
              }
            }
          },
          orderBy: { fechaDiagnostico: 'desc' },
          skip,
          take: limite
        }),
        prisma.diagnostico.count({
          where: { pacienteId }
        })
      ]);

      console.log('✅ [DIAGNOSTICOS_SERVICE] Encontrados:', diagnosticos.length, 'de', total);

      return {
        diagnosticos,
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite)
      };

    } catch (err: any) {
      console.error('❌ [DIAGNOSTICOS_SERVICE] Error al listar:', err);
      throw err;
    }
  },

  // ✅ OBTENER DIAGNÓSTICO POR ID
  async obtenerPorId(id: number) {
    console.log('🔍 [DIAGNOSTICOS_SERVICE] Obteniendo diagnóstico por ID:', id);

    try {
      const diagnostico = await prisma.diagnostico.findUnique({
        where: { id },
        include: {
          paciente: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              numeroIdentificacion: true
            }
          },
          consulta: {
            select: {
              id: true,
              fecha: true,
              tipo: true,
              estado: true
            }
          }
        }
      });

      if (!diagnostico) {
        console.log('❌ [DIAGNOSTICOS_SERVICE] Diagnóstico no encontrado:', id);
        return null;
      }

      console.log('✅ [DIAGNOSTICOS_SERVICE] Diagnóstico encontrado para paciente:', diagnostico.paciente.nombres);
      return diagnostico;

    } catch (err: any) {
      console.error('❌ [DIAGNOSTICOS_SERVICE] Error al obtener:', err);
      throw err;
    }
  },

  // ✅ ACTUALIZAR DIAGNÓSTICO
  async actualizar(id: number, raw: UpdateDiagnosticoData) {
    console.log('🔍 [DIAGNOSTICOS_SERVICE] Actualizando diagnóstico:', id);
    console.log('📝 [UPDATE_DATA]', raw);

    try {
      // Verificar que el diagnóstico existe
      const diagnosticoExiste = await prisma.diagnostico.findUnique({
        where: { id },
        select: { id: true, pacienteId: true, estado: true }
      });

      if (!diagnosticoExiste) {
        console.log('❌ [DIAGNOSTICOS_SERVICE] Diagnóstico no encontrado:', id);
        throw new Error("Diagnóstico no encontrado");
      }

      // Verificar consulta si se actualiza
      if (raw.consultaId) {
        const consultaExiste = await prisma.consulta.findUnique({
          where: { id: raw.consultaId },
          select: { id: true, pacienteId: true }
        });

        if (!consultaExiste) {
          throw new Error("Consulta no encontrada");
        }

        if (consultaExiste.pacienteId !== diagnosticoExiste.pacienteId) {
          throw new Error("La consulta no pertenece al paciente del diagnóstico");
        }
      }

      // Preparar datos para actualizar (solo campos que cambiaron)
      const data: any = {};
      if (raw.impresionClinica !== undefined) data.impresionClinica = toNull(raw.impresionClinica);
      if (raw.principal !== undefined) data.principal = raw.principal.trim();
      if (raw.secundarios !== undefined) data.secundarios = toNull(raw.secundarios);
      if (raw.diferencial !== undefined) data.diferencial = toNull(raw.diferencial);
      if (raw.cie10 !== undefined) data.cie10 = toNull(raw.cie10);
      if (raw.observaciones !== undefined) data.observaciones = toNull(raw.observaciones);
      if (raw.estado !== undefined) data.estado = raw.estado;
      if (raw.consultaId !== undefined) data.consultaId = raw.consultaId;

      // Si hay cambios sustanciales, marcar como modificado
      if (raw.principal || raw.cie10 || raw.secundarios || raw.diferencial) {
        data.estado = "MODIFICADO";
      }

      const diagnosticoActualizado = await prisma.diagnostico.update({
        where: { id },
        data,
        include: {
          paciente: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              numeroIdentificacion: true
            }
          },
          consulta: {
            select: {
              id: true,
              fecha: true,
              tipo: true,
              estado: true
            }
          }
        }
      });

      console.log('✅ [DIAGNOSTICOS_SERVICE] Diagnóstico actualizado exitosamente');
      return diagnosticoActualizado;

    } catch (err: any) {
      console.error('❌ [DIAGNOSTICOS_SERVICE] Error al actualizar:', err);
      if (err?.code === "P2025") {
        throw new Error("Diagnóstico no encontrado");
      }
      throw err;
    }
  },

  // ✅ ELIMINAR/ANULAR DIAGNÓSTICO
  async eliminar(id: number) {
    console.log('🔍 [DIAGNOSTICOS_SERVICE] Eliminando diagnóstico:', id);

    try {
      // En lugar de eliminar físicamente, cambiar estado a ANULADO
      const diagnosticoAnulado = await prisma.diagnostico.update({
        where: { id },
        data: {
          estado: "ANULADO",
          updatedAt: new Date()
        },
        select: {
          id: true,
          pacienteId: true,
          principal: true,
          estado: true
        }
      });

      console.log('✅ [DIAGNOSTICOS_SERVICE] Diagnóstico anulado exitosamente');
      return diagnosticoAnulado;

    } catch (err: any) {
      console.error('❌ [DIAGNOSTICOS_SERVICE] Error al eliminar:', err);
      if (err?.code === "P2025") {
        throw new Error("Diagnóstico no encontrado");
      }
      throw err;
    }
  },

  // ✅ BUSCAR DIAGNÓSTICOS CON FILTROS
  async buscar(params: BuscarDiagnosticosParams) {
    console.log('🔍 [DIAGNOSTICOS_SERVICE] Buscando diagnósticos con filtros:', params);

    try {
      const where: any = {};

      // Filtro por paciente
      if (params.pacienteId) {
        where.pacienteId = params.pacienteId;
      }

      // Filtro por consulta
      if (params.consultaId) {
        where.consultaId = params.consultaId;
      }

      // Filtro por estado
      if (params.estado) {
        where.estado = params.estado;
      }

      // Búsqueda por texto en diagnóstico principal
      if (params.principal && params.principal.trim().length > 0) {
        where.OR = [
          { principal: { contains: params.principal } },
          { secundarios: { contains: params.principal } },
          { diferencial: { contains: params.principal } }
        ];
      }

      // Filtro por código CIE-10
      if (params.cie10) {
        where.cie10 = { contains: params.cie10 };
      }

      // Filtro por rango de fechas
      if (params.desde || params.hasta) {
        where.fechaDiagnostico = {};
        if (params.desde) where.fechaDiagnostico.gte = new Date(params.desde);
        if (params.hasta) where.fechaDiagnostico.lte = new Date(params.hasta);
      }

      const limite = params.limite || 20;
      const pagina = params.pagina || 1;
      const skip = (pagina - 1) * limite;

      const [diagnosticos, total] = await Promise.all([
        prisma.diagnostico.findMany({
          where,
          include: {
            paciente: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                numeroIdentificacion: true
              }
            },
            consulta: {
              select: {
                id: true,
                fecha: true,
                tipo: true,
                estado: true
              }
            }
          },
          orderBy: { fechaDiagnostico: 'desc' },
          skip,
          take: limite
        }),
        prisma.diagnostico.count({ where })
      ]);

      console.log('✅ [DIAGNOSTICOS_SERVICE] Búsqueda completada:', diagnosticos.length, 'de', total);

      return {
        diagnosticos,
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
        filtros: params
      };

    } catch (err: any) {
      console.error('❌ [DIAGNOSTICOS_SERVICE] Error en búsqueda:', err);
      throw err;
    }
  }
};

// ===== SERVICIO PARA CÓDIGOS CIE-10 =====
export const CIE10Service = {
  // ✅ BUSCAR CÓDIGOS CIE-10 (para el buscador del frontend)
  async buscar(params: BuscarCIE10Params) {
    console.log('🔍 [CIE10_SERVICE] Buscando códigos CIE-10:', params);

    try {
      const where: any = { activo: true };

      // Búsqueda general en código y descripción
      if (params.q && params.q.trim()) {
        const searchTerm = params.q.trim();
        where.OR = [
          { codigo: { contains: searchTerm } },
          { descripcion: { contains: searchTerm } }
        ];
      }

      // Búsqueda específica por código
      if (params.codigo) {
        where.codigo = { contains: params.codigo };
      }

      // Filtro por categoría
      if (params.categoria) {
        where.categoria = { contains: params.categoria };
      }

      const limite = params.limite || 50;
      const pagina = params.pagina || 1;
      const skip = (pagina - 1) * limite;

      const [codigos, total] = await Promise.all([
        prisma.codigoCIE10.findMany({
          where,
          orderBy: [
            { codigo: 'asc' }
          ],
          skip,
          take: limite
        }),
        prisma.codigoCIE10.count({ where })
      ]);

      console.log('✅ [CIE10_SERVICE] Códigos encontrados:', codigos.length, 'de', total);

      return {
        codigos,
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite)
      };

    } catch (err: any) {
      console.error('❌ [CIE10_SERVICE] Error en búsqueda:', err);
      throw err;
    }
  },

  // ✅ CREAR CÓDIGO CIE-10
  async crear(data: CodigoCIE10Data) {
    console.log('🔍 [CIE10_SERVICE] Creando código CIE-10:', data.codigo);

    try {
      const codigo = await prisma.codigoCIE10.create({
        data: {
          codigo: data.codigo.toUpperCase().trim(),
          descripcion: data.descripcion.trim(),
          categoria: data.categoria?.trim() || null,
          subcategoria: data.subcategoria?.trim() || null,
          activo: data.activo ?? true
        }
      });

      console.log('✅ [CIE10_SERVICE] Código CIE-10 creado exitosamente');
      return codigo;

    } catch (err: any) {
      console.error('❌ [CIE10_SERVICE] Error al crear código:', err);
      if (err?.code === "P2002") {
        throw new Error("Ya existe un código CIE-10 con este identificador");
      }
      throw err;
    }
  }
};