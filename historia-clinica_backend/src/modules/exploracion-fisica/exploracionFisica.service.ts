// src/modules/exploracion-fisica/exploracionFisica.service.ts
import { prisma } from "../../db/prisma.js";
import { ExploracionFisicaData } from './exploracionFisica.schema.js';

export const ExploracionFisicaService = {
  /**
   * ✅ Crea un nuevo registro de exploración física.
   */
  async crear(data: ExploracionFisicaData) {
    const { pacienteId, consultaId, exploracionGeneral, exploracionSistemas, hallazgosEspecificos, ...rest } = data;

    // Validar que el paciente existe
    const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId } });
    if (!paciente) {
      throw new Error("Paciente no encontrado");
    }

    // Aplanar la estructura de datos para guardarla en el modelo
    const datosAplanados = {
      pacienteId,
      consultaId,
      ...exploracionGeneral,
      ...exploracionSistemas,
      impresionClinica: hallazgosEspecificos.impresionClinica,
      ...rest,
    };

    return prisma.exploracionFisica.create({
      data: datosAplanados,
    });
  },

  /**
   * ✅ Obtiene el último registro de exploración física de un paciente.
   */
  async obtenerUltimoPorPaciente(pacienteId: number) {
    const exploracion = await prisma.exploracionFisica.findFirst({
      where: { pacienteId },
      orderBy: { fechaExploracion: 'desc' },
    });
    return this.reestructurarDatos(exploracion);
  },

  /**
   * ✅ Obtiene el registro de exploración física de una consulta.
   */
  async obtenerPorConsulta(consultaId: number) {
    const exploracion = await prisma.exploracionFisica.findFirst({
      where: { consultaId },
      orderBy: { fechaExploracion: 'desc' },
    });
    return this.reestructurarDatos(exploracion);
  },

  /**
   * ✅ Actualiza un registro de exploración física.
   */
  async actualizar(id: number, data: Partial<ExploracionFisicaData>) {
    const { exploracionGeneral, exploracionSistemas, hallazgosEspecificos, ...rest } = data;
    
    const datosAplanados: any = { ...rest };
    if (exploracionGeneral) Object.assign(datosAplanados, exploracionGeneral);
    if (exploracionSistemas) Object.assign(datosAplanados, exploracionSistemas);
    if (hallazgosEspecificos) datosAplanados.impresionClinica = hallazgosEspecificos.impresionClinica;

    return prisma.exploracionFisica.update({
      where: { id },
      data: datosAplanados,
    });
  },

  /**
   * ℹ️ Helper para reestructurar los datos de la BD al formato del frontend.
   */
  reestructurarDatos(exploracion: any) {
    if (!exploracion) return null;
    
    const {
      id, pacienteId, consultaId, fechaExploracion, exploradoPor, observacionesGenerales, createdAt, updatedAt,
      aspectoGeneral, estadoConciencia, orientacion, hidratacion, coloracion, constitucion, actitud, facies, marcha,
      cabezaCuello, cardiopulmonar, abdomen, extremidades, neurologico, piel, ganglios, genitourinario,
      impresionClinica
    } = exploracion;

    return {
      id, pacienteId, consultaId, fechaExploracion, exploradoPor, observacionesGenerales, createdAt, updatedAt,
      exploracionGeneral: { aspectoGeneral, estadoConciencia, orientacion, hidratacion, coloracion, constitucion, actitud, facies, marcha },
      exploracionSistemas: { cabezaCuello, cardiopulmonar, abdomen, extremidades, neurologico, piel, ganglios, genitourinario },
      hallazgosEspecificos: { impresionClinica }
    };
  }
};
