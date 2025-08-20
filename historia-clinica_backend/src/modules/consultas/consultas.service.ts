// src/modules/consultas/consultas.service.ts - Versión temporal SIN motivo
import { prisma } from '../../db/prisma';

export interface ConsultaData {
  pacienteId: number;
  padecimientoActual?: any;
  signosVitales?: any;
  exploracionFisica?: any;
  diagnostico?: any;
  tratamiento?: any;
  examenes?: any;
}

function toJsonString(data: any): string | null {
  if (data == null || data === undefined) return null;
  return JSON.stringify(data);
}

function fromJsonString<T = any>(jsonStr: string | null): T | null {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

function calcularIMC(peso?: number | null, talla?: number | null): number | null {
  if (!peso || !talla || talla <= 0) return null;
  const tallaMetros = talla > 10 ? talla / 100 : talla;
  const imc = peso / (tallaMetros * tallaMetros);
  return Math.round(imc * 10) / 10;
}

export async function crearConsulta(data: ConsultaData) {
  console.log('📥 Datos recibidos para crear consulta:', JSON.stringify(data, null, 2));
  
  // Calcular IMC si tenemos peso y talla
  let signosVitales = data.signosVitales;
  if (signosVitales?.peso && signosVitales?.talla) {
    const imc = calcularIMC(signosVitales.peso, signosVitales.talla);
    if (imc) {
      signosVitales = { ...signosVitales, imc };
      console.log(`📊 IMC calculado: ${imc}`);
    }
  }

  // Extraer motivo del padecimiento actual para usar más tarde
  const motivo = data.padecimientoActual?.motivo || 'Consulta médica';

  try {
    const consulta = await prisma.consulta.create({
      data: {
        pacienteId: data.pacienteId,
        fechaConsulta: new Date(),
        // NO incluimos motivo aquí porque causa error de TypeScript
        padecimientoActual: toJsonString(data.padecimientoActual),
        signosVitales: toJsonString(signosVitales),
        exploracionFisica: toJsonString(data.exploracionFisica),
        diagnostico: toJsonString(data.diagnostico),
        tratamiento: toJsonString(data.tratamiento),
        examenes: toJsonString(data.examenes),
      },
      include: {
        paciente: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            numeroIdentificacion: true
          }
        }
      }
    });

    console.log('✅ Consulta creada exitosamente con ID:', consulta.id);

    // Actualizar el motivo usando SQL directo si es necesario
    try {
      await prisma.$executeRaw`UPDATE Consulta SET motivo = ${motivo} WHERE id = ${consulta.id}`;
      console.log('✅ Motivo actualizado via SQL directo');
    } catch (error) {
      console.log('⚠️ No se pudo actualizar motivo:', error);
    }

    return {
      ...consulta,
      motivo, // Devolvemos el motivo manualmente
      padecimientoActual: fromJsonString(consulta.padecimientoActual),
      signosVitales: fromJsonString(consulta.signosVitales),
      exploracionFisica: fromJsonString(consulta.exploracionFisica),
      diagnostico: fromJsonString(consulta.diagnostico),
      tratamiento: fromJsonString(consulta.tratamiento),
      examenes: fromJsonString(consulta.examenes),
    };
  } catch (error) {
    console.error('❌ Error al crear consulta:', error);
    throw error;
  }
}

export async function obtenerConsulta(id: number) {
  try {
    const consulta = await prisma.consulta.findFirst({
      where: { id },
      include: {
        paciente: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            numeroIdentificacion: true,
            fechaNacimiento: true,
            sexo: true,
            email: true,
            telefono: true,
            direccion: true,
            grupoSanguineo: true,
            alergias: true,
            contactoEmergencia: true
          }
        },
        laboratorios: {
          select: {
            id: true,
            archivo: true,
            url: true,
            fechaInforme: true,
            resumenHallazgos: true,
            resultados: true
          }
        }
      }
    });

    if (!consulta) return null;

    // Obtener motivo usando SQL directo
    let motivo = 'Consulta médica';
    try {
      const result = await prisma.$queryRaw<any[]>`SELECT motivo FROM Consulta WHERE id = ${id}`;
      if (result.length > 0 && result[0].motivo) {
        motivo = result[0].motivo;
      }
    } catch (error) {
      console.log('⚠️ No se pudo obtener motivo:', error);
    }

    return {
      ...consulta,
      motivo,
      padecimientoActual: fromJsonString(consulta.padecimientoActual),
      signosVitales: fromJsonString(consulta.signosVitales),
      exploracionFisica: fromJsonString(consulta.exploracionFisica),
      diagnostico: fromJsonString(consulta.diagnostico),
      tratamiento: fromJsonString(consulta.tratamiento),
      examenes: fromJsonString(consulta.examenes),
    };
  } catch (error) {
    console.error('❌ Error al obtener consulta:', error);
    throw error;
  }
}

export async function listarConsultas(params: {
  pacienteId?: number;
  desde?: string;
  hasta?: string;
  page?: number;
  pageSize?: number;
}) {
  const { pacienteId, desde, hasta, page = 1, pageSize = 10 } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (pacienteId) {
    where.pacienteId = pacienteId;
  }

  if (desde || hasta) {
    where.fechaConsulta = {};
    if (desde) where.fechaConsulta.gte = new Date(desde);
    if (hasta) where.fechaConsulta.lte = new Date(hasta);
  }

  try {
    const [consultas, total] = await Promise.all([
      prisma.consulta.findMany({
        where,
        include: {
          paciente: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              numeroIdentificacion: true
            }
          }
        },
        orderBy: { fechaConsulta: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.consulta.count({ where })
    ]);

    // Obtener motivos usando SQL directo para todas las consultas
    const consultaIds = consultas.map(c => c.id);
    let motivos: any = {};
    
    try {
      if (consultaIds.length > 0) {
        const motivosResult = await prisma.$queryRaw<any[]>`
          SELECT id, motivo FROM Consulta WHERE id IN (${consultaIds.join(',')})
        `;
        motivos = motivosResult.reduce((acc, row) => {
          acc[row.id] = row.motivo || 'Consulta médica';
          return acc;
        }, {});
      }
    } catch (error) {
      console.log('⚠️ No se pudieron obtener motivos:', error);
    }

    return {
      consultas: consultas.map(consulta => ({
        ...consulta,
        motivo: motivos[consulta.id] || 'Consulta médica',
        diagnostico: fromJsonString(consulta.diagnostico),
        tratamiento: fromJsonString(consulta.tratamiento),
        padecimientoActual: fromJsonString(consulta.padecimientoActual),
        signosVitales: fromJsonString(consulta.signosVitales),
        exploracionFisica: fromJsonString(consulta.exploracionFisica),
        examenes: fromJsonString(consulta.examenes),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    console.error('❌ Error al listar consultas:', error);
    throw error;
  }
}

export async function actualizarConsulta(id: number, data: Partial<ConsultaData>) {
  let signosVitales = data.signosVitales;
  if (signosVitales?.peso && signosVitales?.talla) {
    const imc = calcularIMC(signosVitales.peso, signosVitales.talla);
    if (imc) {
      signosVitales = { ...signosVitales, imc };
    }
  }

  try {
    const consulta = await prisma.consulta.update({
      where: { id },
      data: {
        padecimientoActual: toJsonString(data.padecimientoActual),
        signosVitales: toJsonString(signosVitales),
        exploracionFisica: toJsonString(data.exploracionFisica),
        diagnostico: toJsonString(data.diagnostico),
        tratamiento: toJsonString(data.tratamiento),
        examenes: toJsonString(data.examenes),
        updatedAt: new Date()
      },
      include: {
        paciente: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            numeroIdentificacion: true
          }
        }
      }
    });

    // Actualizar motivo usando SQL directo si es necesario
    const motivo = data.padecimientoActual?.motivo || 'Consulta médica';
    try {
      await prisma.$executeRaw`UPDATE Consulta SET motivo = ${motivo} WHERE id = ${id}`;
    } catch (error) {
      console.log('⚠️ No se pudo actualizar motivo:', error);
    }

    return {
      ...consulta,
      motivo,
      padecimientoActual: fromJsonString(consulta.padecimientoActual),
      signosVitales: fromJsonString(consulta.signosVitales),
      exploracionFisica: fromJsonString(consulta.exploracionFisica),
      diagnostico: fromJsonString(consulta.diagnostico),
      tratamiento: fromJsonString(consulta.tratamiento),
      examenes: fromJsonString(consulta.examenes),
    };
  } catch (error) {
    console.error('❌ Error al actualizar consulta:', error);
    throw error;
  }
}

export async function eliminarConsulta(id: number) {
  try {
    return await prisma.consulta.delete({
      where: { id }
    });
  } catch (error) {
    console.error('❌ Error al eliminar consulta:', error);
    throw error;
  }
}

export async function obtenerHistorialPaciente(pacienteId: number, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  try {
    const [consultas, total] = await Promise.all([
      prisma.consulta.findMany({
        where: { pacienteId },
        orderBy: { fechaConsulta: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          fechaConsulta: true,
          diagnostico: true,
          tratamiento: true,
          createdAt: true
        }
      }),
      prisma.consulta.count({
        where: { pacienteId }
      })
    ]);

    // Obtener motivos usando SQL directo
    const consultaIds = consultas.map(c => c.id);
    let motivos: any = {};
    
    try {
      if (consultaIds.length > 0) {
        const motivosResult = await prisma.$queryRaw<any[]>`
          SELECT id, motivo FROM Consulta WHERE id IN (${consultaIds.join(',')})
        `;
        motivos = motivosResult.reduce((acc, row) => {
          acc[row.id] = row.motivo || 'Consulta médica';
          return acc;
        }, {});
      }
    } catch (error) {
      console.log('⚠️ No se pudieron obtener motivos:', error);
    }

    return {
      consultas: consultas.map(consulta => ({
        ...consulta,
        fecha: consulta.fechaConsulta, // Mapear para compatibilidad
        motivo: motivos[consulta.id] || 'Consulta médica',
        diagnostico: fromJsonString(consulta.diagnostico),
        tratamiento: fromJsonString(consulta.tratamiento),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('❌ Error al obtener historial del paciente:', error);
    throw error;
  }
}