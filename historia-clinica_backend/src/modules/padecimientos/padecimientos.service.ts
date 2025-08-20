// src/modules/padecimientos/padecimientos.service.ts
import { prisma } from "../../db/prisma.js";
import { Prisma } from '@prisma/client';

export interface CreatePadecimientoDTO {
  pacienteId: number;
  motivo?: string | null;
  tiempo?: string | null;
  sintomasAsociados?: string | null;
  descripcion?: string | null;
  tratamientoPrevio?: string | null;
  estado?: string;
  consultaId?: number | null;
}

export interface UpdatePadecimientoDTO {
  motivo?: string | null;
  tiempo?: string | null;
  sintomasAsociados?: string | null;
  descripcion?: string | null;
  tratamientoPrevio?: string | null;
  estado?: string;
  consultaId?: number | null;
}

export interface BuscarPadecimientosParams {
  pacienteId?: number;
  estado?: string;
  motivo?: string;
  desde?: Date;
  hasta?: Date;
  limite?: number;
  pagina?: number;
}


// "" -> null
const toNull = (v: unknown) =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? null : (v as any);

export const PadecimientosService = {
  // ✅ CREAR PADECIMIENTO
  async crear(raw: CreatePadecimientoDTO) {
    console.log('🔍 [PADECIMIENTOS_SERVICE] Iniciando crear padecimiento...');
    console.log('🔍 [PADECIMIENTOS_SERVICE] Datos:', { 
      pacienteId: raw.pacienteId,
      motivo: raw.motivo?.substring(0, 50) + '...' || 'Sin motivo',
      estado: raw.estado || 'EN_PROCESO'
    });

    try {
      // Verificar que el paciente existe
      const pacienteExiste = await prisma.paciente.findUnique({
        where: { id: raw.pacienteId },
        select: { id: true, nombres: true, apellidos: true }
      });

      if (!pacienteExiste) {
        console.log('❌ [PADECIMIENTOS_SERVICE] Paciente no encontrado:', raw.pacienteId);
        throw new Error("Paciente no encontrado");
      }

      console.log('🔍 [PADECIMIENTOS_SERVICE] Paciente encontrado:', pacienteExiste);

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

      const data = {
        pacienteId: raw.pacienteId,
        motivo: toNull(raw.motivo),
        tiempo: toNull(raw.tiempo),
        sintomasAsociados: toNull(raw.sintomasAsociados),
        descripcion: toNull(raw.descripcion),
        tratamientoPrevio: toNull(raw.tratamientoPrevio),
        estado: raw.estado || "EN_PROCESO",
        consultaId: raw.consultaId || null,
      };

      const padecimiento = await prisma.padecimientoActual.create({
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
              tipo: true
            }
          }
        }
      });

      console.log('✅ [PADECIMIENTOS_SERVICE] Padecimiento creado exitosamente:', padecimiento.id);
      return padecimiento;

    } catch (err: any) {
      console.error('❌ [PADECIMIENTOS_SERVICE] Error al crear padecimiento:', err);
      throw err;
    }
  },

  // ✅ LISTAR PADECIMIENTOS DE UN PACIENTE
  async listarPorPaciente(pacienteId: number, limite: number = 20, pagina: number = 1) {
    console.log('🔍 [PADECIMIENTOS_SERVICE] Listando padecimientos del paciente:', pacienteId);

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

      const [padecimientos, total] = await Promise.all([
        prisma.padecimientoActual.findMany({
          where: { pacienteId },
          include: {
            consulta: {
              select: {
                id: true,
                fecha: true,
                tipo: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limite
        }),
        prisma.padecimientoActual.count({
          where: { pacienteId }
        })
      ]);

      console.log('✅ [PADECIMIENTOS_SERVICE] Encontrados:', padecimientos.length, 'de', total);

      return {
        padecimientos,
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite)
      };

    } catch (err: any) {
      console.error('❌ [PADECIMIENTOS_SERVICE] Error al listar:', err);
      throw err;
    }
  },

  // ✅ OBTENER PADECIMIENTO POR ID
  async obtenerPorId(id: number) {
    console.log('🔍 [PADECIMIENTOS_SERVICE] Obteniendo padecimiento por ID:', id);

    try {
      const padecimiento = await prisma.padecimientoActual.findUnique({
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

      if (!padecimiento) {
        console.log('❌ [PADECIMIENTOS_SERVICE] Padecimiento no encontrado:', id);
        return null;
      }

      console.log('✅ [PADECIMIENTOS_SERVICE] Padecimiento encontrado para paciente:', padecimiento.paciente.nombres);
      return padecimiento;

    } catch (err: any) {
      console.error('❌ [PADECIMIENTOS_SERVICE] Error al obtener:', err);
      throw err;
    }
  },

  // ✅ OBTENER PADECIMIENTO ACTIVO DE UN PACIENTE
  async obtenerActivo(pacienteId: number) {
    console.log('🔍 [PADECIMIENTOS_SERVICE] Obteniendo padecimiento activo del paciente:', pacienteId);

    try {
      const padecimientoActivo = await prisma.padecimientoActual.findFirst({
        where: { 
          pacienteId,
          estado: "EN_PROCESO"
        },
        include: {
          consulta: {
            select: {
              id: true,
              fecha: true,
              tipo: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (padecimientoActivo) {
        console.log('✅ [PADECIMIENTOS_SERVICE] Padecimiento activo encontrado:', padecimientoActivo.id);
      } else {
        console.log('📝 [PADECIMIENTOS_SERVICE] No hay padecimiento activo para este paciente');
      }

      return padecimientoActivo;

    } catch (err: any) {
      console.error('❌ [PADECIMIENTOS_SERVICE] Error al obtener activo:', err);
      throw err;
    }
  },

  // ✅ ACTUALIZAR PADECIMIENTO
  async actualizar(id: number, raw: UpdatePadecimientoDTO) {
    console.log('🔍 [PADECIMIENTOS_SERVICE] Actualizando padecimiento:', id);
    console.log('🔍 [PADECIMIENTOS_SERVICE] Datos:', raw);

    try {
      // Verificar que el padecimiento existe
      const padecimientoExiste = await prisma.padecimientoActual.findUnique({
        where: { id },
        select: { id: true, pacienteId: true }
      });

      if (!padecimientoExiste) {
        console.log('❌ [PADECIMIENTOS_SERVICE] Padecimiento no encontrado:', id);
        throw new Error("Padecimiento no encontrado");
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

        if (consultaExiste.pacienteId !== padecimientoExiste.pacienteId) {
          throw new Error("La consulta no pertenece al paciente del padecimiento");
        }
      }

      const data: any = {};
      if (raw.motivo !== undefined) data.motivo = toNull(raw.motivo);
      if (raw.tiempo !== undefined) data.tiempo = toNull(raw.tiempo);
      if (raw.sintomasAsociados !== undefined) data.sintomasAsociados = toNull(raw.sintomasAsociados);
      if (raw.descripcion !== undefined) data.descripcion = toNull(raw.descripcion);
      if (raw.tratamientoPrevio !== undefined) data.tratamientoPrevio = toNull(raw.tratamientoPrevio);
      if (raw.estado !== undefined) data.estado = raw.estado;
      if (raw.consultaId !== undefined) data.consultaId = raw.consultaId;

      const padecimientoActualizado = await prisma.padecimientoActual.update({
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
              tipo: true
            }
          }
        }
      });

      console.log('✅ [PADECIMIENTOS_SERVICE] Padecimiento actualizado exitosamente');
      return padecimientoActualizado;

    } catch (err: any) {
      console.error('❌ [PADECIMIENTOS_SERVICE] Error al actualizar:', err);
      if (err?.code === "P2025") {
        throw new Error("Padecimiento no encontrado");
      }
      throw err;
    }
  },

  // ✅ ELIMINAR PADECIMIENTO
  async eliminar(id: number) {
    console.log('🔍 [PADECIMIENTOS_SERVICE] Eliminando padecimiento:', id);

    try {
      const padecimientoEliminado = await prisma.padecimientoActual.delete({
        where: { id },
        select: {
          id: true,
          pacienteId: true,
          motivo: true
        }
      });

      console.log('✅ [PADECIMIENTOS_SERVICE] Padecimiento eliminado exitosamente');
      return padecimientoEliminado;

    } catch (err: any) {
      console.error('❌ [PADECIMIENTOS_SERVICE] Error al eliminar:', err);
      if (err?.code === "P2025") {
        throw new Error("Padecimiento no encontrado");
      }
      throw err;
    }
  },

  // ✅ BUSCAR PADECIMIENTOS CON FILTROS
  async buscar(params: BuscarPadecimientosParams) {
    console.log('🔍 [PADECIMIENTOS_SERVICE] Buscando padecimientos con filtros:', params);

    try {
      const where: any = {};

      if (params.pacienteId) {
        where.pacienteId = params.pacienteId;
      }

      if (params.estado) {
        where.estado = params.estado;
      }

if (params.motivo && params.motivo.trim().length > 0) {
  where.OR = [
    { motivo: { contains: params.motivo } },
    { descripcion: { contains: params.motivo } },
    { sintomasAsociados: { contains: params.motivo } }
  ];
}

      if (params.desde || params.hasta) {
        where.createdAt = {};
        if (params.desde) where.createdAt.gte = params.desde;
        if (params.hasta) where.createdAt.lte = params.hasta;
      }

      const limite = params.limite || 20;
      const pagina = params.pagina || 1;
      const skip = (pagina - 1) * limite;

      const [padecimientos, total] = await Promise.all([
        prisma.padecimientoActual.findMany({
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
                tipo: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limite
        }),
        prisma.padecimientoActual.count({ where })
      ]);

      console.log('✅ [PADECIMIENTOS_SERVICE] Búsqueda completada:', padecimientos.length, 'de', total);

      return {
        padecimientos,
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
        filtros: params
      };

    } catch (err: any) {
      console.error('❌ [PADECIMIENTOS_SERVICE] Error en búsqueda:', err);
      throw err;
    }
  },

  // ✅ COMPLETAR PADECIMIENTO (cambiar estado a COMPLETADO)
  async completar(id: number) {
    console.log('🔍 [PADECIMIENTOS_SERVICE] Completando padecimiento:', id);

    try {
      const padecimientoCompletado = await prisma.padecimientoActual.update({
        where: { id },
        data: {
          estado: "COMPLETADO",
          updatedAt: new Date()
        },
        include: {
          paciente: {
            select: {
              id: true,
              nombres: true,
              apellidos: true
            }
          }
        }
      });

      console.log('✅ [PADECIMIENTOS_SERVICE] Padecimiento completado exitosamente');
      return padecimientoCompletado;

    } catch (err: any) {
      console.error('❌ [PADECIMIENTOS_SERVICE] Error al completar:', err);
      if (err?.code === "P2025") {
        throw new Error("Padecimiento no encontrado");
      }
      throw err;
    }
  }
};