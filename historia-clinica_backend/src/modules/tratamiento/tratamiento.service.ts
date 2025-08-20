// src/modules/tratamiento/tratamiento.service.ts
import { prisma } from "../../db/prisma.js";
import { TratamientoData } from './tratamiento.schema.js';

export const TratamientoService = {
  /**
   * ✅ Crea un nuevo registro de tratamiento.
   */
  async crear(data: TratamientoData) {
    // Validar que el paciente existe
    const paciente = await prisma.paciente.findUnique({ where: { id: data.pacienteId } });
    if (!paciente) {
      throw new Error("Paciente no encontrado");
    }

    return prisma.tratamiento.create({ data });
  },

  /**
   * ✅ Obtiene el último registro de tratamiento de un paciente.
   */
  async obtenerUltimoPorPaciente(pacienteId: number) {
    return prisma.tratamiento.findFirst({
      where: { pacienteId },
      orderBy: { fechaCreacion: 'desc' },
    });
  },

  /**
   * ✅ Obtiene el registro de tratamiento de una consulta.
   */
  async obtenerPorConsulta(consultaId: number) {
    return prisma.tratamiento.findFirst({
      where: { consultaId },
      orderBy: { fechaCreacion: 'desc' },
    });
  },

  /**
   * ✅ Actualiza un registro de tratamiento.
   */
  async actualizar(id: number, data: Partial<TratamientoData>) {
    // Verificar que el registro existe antes de actualizar
    const tratamientoExistente = await prisma.tratamiento.findUnique({ where: { id } });
    if (!tratamientoExistente) {
      throw new Error("Registro de tratamiento no encontrado");
    }
    
    return prisma.tratamiento.update({
      where: { id },
      data,
    });
  },
};
