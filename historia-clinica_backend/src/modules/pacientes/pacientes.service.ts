// src/modules/pacientes/pacientes.service.ts

import { prisma } from '../../db/prisma';

export interface PacienteData {
  nombres: string;
  apellidos: string;
  numeroIdentificacion: string;
  fechaNacimiento?: string | null;  // ✅ Ahora acepta null
  sexo?: string;
  edad?: number | null;             // ✅ Ahora acepta null
  email?: string;
  telefono?: string;
  direccion?: string;
  grupoSanguineo?: string;
  alergias?: string[];
  contactoEmergencia?: {
    nombre: string;
    telefono: string;
    relacion: string;
  };
  notas?: string;
  foto?: string;
  qrData?: string;
  qrCode?: string;
}

function parseJSON(value: any) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export async function crearPaciente(data: PacienteData) {
  console.log('📥 Datos recibidos para crear paciente:', JSON.stringify(data, null, 2));
  
  try {
    // Procesar los datos correctamente
    const pacienteData: any = {
      nombres: data.nombres,
      apellidos: data.apellidos,
      numeroIdentificacion: data.numeroIdentificacion,
      sexo: data.sexo,
      telefono: data.telefono,
      direccion: data.direccion,
      grupoSanguineo: data.grupoSanguineo,
      notas: data.notas,
      foto: data.foto || null,
      qrData: data.qrData,
      qrCode: data.qrCode
    };

    // Manejar edad
    if (data.edad !== undefined) {
      pacienteData.edad = typeof data.edad === 'string' ? parseInt(data.edad) : data.edad;
    }

    // Manejar fecha de nacimiento
    if (data.fechaNacimiento) {
      pacienteData.fechaNacimiento = new Date(data.fechaNacimiento);
    }

    // Manejar email (puede venir como string vacío)
    if (data.email && data.email.trim() !== '') {
      pacienteData.email = data.email;
    }

    // Manejar alergias (convertir array a JSON)
    if (data.alergias) {
      pacienteData.alergias = Array.isArray(data.alergias) ? data.alergias : parseJSON(data.alergias);
    }

    // Manejar contacto de emergencia (convertir objeto a JSON)
    if (data.contactoEmergencia) {
      pacienteData.contactoEmergencia = typeof data.contactoEmergencia === 'object' ? 
        data.contactoEmergencia : parseJSON(data.contactoEmergencia);
    }

    console.log('📊 Datos procesados para Prisma:', JSON.stringify(pacienteData, null, 2));

    const paciente = await prisma.paciente.create({
      data: pacienteData
    });

    console.log('✅ Paciente creado exitosamente con ID:', paciente.id);

    return {
      ...paciente,
      alergias: paciente.alergias ? 
        (Array.isArray(paciente.alergias) ? paciente.alergias : JSON.parse(paciente.alergias as string)) : 
        [],
      contactoEmergencia: paciente.contactoEmergencia ? 
        (typeof paciente.contactoEmergencia === 'object' ? paciente.contactoEmergencia : JSON.parse(paciente.contactoEmergencia as string)) : 
        null
    };
  } catch (error: any) {
    // 🔴 Captura duplicados y los traduce a un error de conflicto entendible por el controller
    if (error?.code === 'P2002' && Array.isArray(error?.meta?.target) && error.meta.target.includes('numeroIdentificacion')) {
      const conflict = new Error('El usuario ya existe');
      (conflict as any).name = 'ConflictError';
      (conflict as any).field = 'numeroIdentificacion';
      throw conflict;
    }
    console.error('❌ Error al crear paciente:', error);
    throw error;
  }
}


export async function obtenerPaciente(id: number) {
  try {
    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: {
        consultas: {
          select: {
            id: true,
            fechaConsulta: true,
            diagnostico: true
          },
          orderBy: { fechaConsulta: 'desc' },
          take: 5
        }
      }
    });

    if (!paciente) return null;

    return {
      ...paciente,
      alergias: paciente.alergias ? 
        (Array.isArray(paciente.alergias) ? paciente.alergias : JSON.parse(paciente.alergias as string)) : 
        [],
      contactoEmergencia: paciente.contactoEmergencia ? 
        (typeof paciente.contactoEmergencia === 'object' ? paciente.contactoEmergencia : JSON.parse(paciente.contactoEmergencia as string)) : 
        null,
      consultasRecientes: paciente.consultas.map(consulta => ({
        id: consulta.id,
        fecha: consulta.fechaConsulta,
        diagnostico: consulta.diagnostico ? 
          (() => {
            try {
              return JSON.parse(consulta.diagnostico);
            } catch {
              return null;
            }
          })() : null
      }))
    };
  } catch (error) {
    console.error('❌ Error al obtener paciente:', error);
    throw error;
  }
}

export async function listarPacientes(params: {
  page?: number;
  pageSize?: number;
  busqueda?: string;
}) {
  const { page = 1, pageSize = 10, busqueda } = params;
  const skip = (page - 1) * pageSize;

  try {
    const where: any = {};

    if (busqueda) {
      where.OR = [
        { nombres: { contains: busqueda } },
        { apellidos: { contains: busqueda } },
        { numeroIdentificacion: { contains: busqueda } },
        { email: { contains: busqueda } }
      ];
    }

    const [pacientes, total] = await Promise.all([
      prisma.paciente.findMany({
        where,
        orderBy: [
          { nombres: 'asc' },
          { apellidos: 'asc' }
        ],
        skip,
        take: pageSize,
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          numeroIdentificacion: true,
          fechaNacimiento: true,
          sexo: true,
          email: true,
          telefono: true,
          grupoSanguineo: true,
          foto: true,
          createdAt: true
        }
      }),
      prisma.paciente.count({ where })
    ]);

    return {
      pacientes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    console.error('❌ Error al listar pacientes:', error);
    throw error;
  }
}

export async function actualizarPaciente(id: number, data: Partial<PacienteData>) {
  try {
    const updateData: any = { ...data };

    // Procesar datos de la misma manera que en crear
    if (data.edad !== undefined) {
      updateData.edad = typeof data.edad === 'string' ? parseInt(data.edad) : data.edad;
    }

    if (data.fechaNacimiento) {
      updateData.fechaNacimiento = new Date(data.fechaNacimiento);
    }

    if (data.email !== undefined) {
      updateData.email = data.email && data.email.trim() !== '' ? data.email : null;
    }

    if (data.alergias) {
      updateData.alergias = Array.isArray(data.alergias) ? data.alergias : parseJSON(data.alergias);
    }

    if (data.contactoEmergencia) {
      updateData.contactoEmergencia = typeof data.contactoEmergencia === 'object' ? 
        data.contactoEmergencia : parseJSON(data.contactoEmergencia);
    }

    const paciente = await prisma.paciente.update({
      where: { id },
      data: updateData
    });

    return {
      ...paciente,
      alergias: paciente.alergias ? 
        (Array.isArray(paciente.alergias) ? paciente.alergias : JSON.parse(paciente.alergias as string)) : 
        [],
      contactoEmergencia: paciente.contactoEmergencia ? 
        (typeof paciente.contactoEmergencia === 'object' ? paciente.contactoEmergencia : JSON.parse(paciente.contactoEmergencia as string)) : 
        null
    };
  } catch (error) {
    console.error('❌ Error al actualizar paciente:', error);
    throw error;
  }
}

export async function eliminarPaciente(id: number) {
  try {
    return await prisma.paciente.delete({
      where: { id }
    });
  } catch (error) {
    console.error('❌ Error al eliminar paciente:', error);
    throw error;
  }
}

export async function buscarPacientes(query: string) {
  try {
    if (!query || query.length < 2) {
      return [];
    }

    const pacientes = await prisma.paciente.findMany({
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
        fechaNacimiento: true,
        sexo: true,
        email: true,
        telefono: true,
        foto: true,
        grupoSanguineo: true
      },
      take: 10,
      orderBy: [
        { nombres: 'asc' },
        { apellidos: 'asc' }
      ]
    });

    return pacientes;
  } catch (error) {
    console.error('❌ Error al buscar pacientes:', error);
    throw error;
  }
}

export async function obtenerEstadisticasPacientes() {
  try {
    const [total, hoy, esteMes] = await Promise.all([
      prisma.paciente.count(),
      prisma.paciente.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.paciente.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    return {
      total,
      hoy,
      esteMes
    };
  } catch (error) {
    console.error('❌ Error al obtener estadísticas de pacientes:', error);
    throw error;
  }
}