// src/modules/pacientes/pacientes.search.controller.ts - Versión simplificada

import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';

// Función para buscar pacientes (usada por el componente NuevaConsulta)
export async function buscarPacientesParaConsultas(req: Request, res: Response) {
  try {
    const query = req.query.q as string;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        error: 'Query debe tener al menos 2 caracteres'
      });
    }

    console.log(`🔍 Buscando pacientes con query: "${query}"`);

    const pacientes = await prisma.paciente.findMany({
      where: {
        OR: [
          {
            nombres: {
              contains: query
            }
          },
          {
            apellidos: {
              contains: query
            }
          },
          {
            numeroIdentificacion: {
              contains: query
            }
          },
          {
            email: {
              contains: query
            }
          }
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
      take: 10, // Limitar a 10 resultados
      orderBy: [
        { nombres: 'asc' },
        { apellidos: 'asc' }
      ]
    });

    console.log(`✅ Encontrados ${pacientes.length} pacientes`);

    // Mapear los resultados al formato que espera el frontend
    const pacientesFormateados = pacientes.map(paciente => ({
      id: paciente.id,
      nombres: paciente.nombres,
      apellidos: paciente.apellidos,
      numeroIdentificacion: paciente.numeroIdentificacion,
      fechaNacimiento: paciente.fechaNacimiento?.toISOString(),
      sexo: paciente.sexo,
      email: paciente.email,
      celular: paciente.telefono, // El frontend espera 'celular'
      telefono: paciente.telefono,
      foto: paciente.foto,
      grupoSanguineo: paciente.grupoSanguineo
    }));

    res.json(pacientesFormateados);
  } catch (error) {
    console.error('❌ Error al buscar pacientes:', error);
    res.status(500).json({
      error: 'Error interno del servidor al buscar pacientes'
    });
  }
}

// Función para obtener datos completos de un paciente
export async function obtenerPacienteCompleto(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID de paciente inválido'
      });
    }

    console.log(`👤 Obteniendo datos completos del paciente ID: ${id}`);

    const paciente = await prisma.paciente.findUnique({
      where: { id }
    });

    if (!paciente) {
      return res.status(404).json({
        error: 'Paciente no encontrado'
      });
    }

    // Obtener consultas recientes por separado
    const consultasRecientes = await prisma.consulta.findMany({
      where: { pacienteId: id },
      select: {
        id: true,
        fechaConsulta: true,
        diagnostico: true
      },
      orderBy: { fechaConsulta: 'desc' },
      take: 5
    });

    // Parsear campos JSON
    let alergias: any[] = [];
    try {
      if (paciente.alergias) {
        alergias = Array.isArray(paciente.alergias) ? 
          paciente.alergias : 
          JSON.parse(paciente.alergias as string);
      }
    } catch (error) {
      console.log('⚠️ Error parsing alergias, usando array vacío');
      alergias = [];
    }
    
    let contactoEmergencia: any = null;
    try {
      if (paciente.contactoEmergencia) {
        contactoEmergencia = typeof paciente.contactoEmergencia === 'object' ? 
          paciente.contactoEmergencia : 
          JSON.parse(paciente.contactoEmergencia as string);
      }
    } catch (error) {
      console.log('⚠️ Error parsing contactoEmergencia, usando null');
      contactoEmergencia = null;
    }

    const pacienteCompleto = {
      id: paciente.id,
      nombres: paciente.nombres,
      apellidos: paciente.apellidos,
      numeroIdentificacion: paciente.numeroIdentificacion,
      fechaNacimiento: paciente.fechaNacimiento?.toISOString(),
      sexo: paciente.sexo,
      email: paciente.email,
      celular: paciente.telefono,
      telefono: paciente.telefono,
      direccion: paciente.direccion,
      grupoSanguineo: paciente.grupoSanguineo,
      alergias,
      contactoEmergencia,
      foto: paciente.foto,
      qrCode: paciente.qrCode,
      qrData: paciente.qrData,
      consultasRecientes: consultasRecientes.map(consulta => ({
        id: consulta.id,
        fecha: consulta.fechaConsulta.toISOString(),
        motivo: 'Consulta médica', // Valor por defecto
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

    console.log(`✅ Datos completos del paciente obtenidos`);
    res.json(pacienteCompleto);
  } catch (error) {
    console.error('❌ Error al obtener paciente completo:', error);
    res.status(500).json({
      error: 'Error interno del servidor al obtener datos del paciente'
    });
  }
}