// src/modules/signos-vitales/signosVitales.service.ts
import { prisma } from "../../db/prisma.js";
import { CreateSignosVitalesData, UpdateSignosVitalesData } from './signosVitales.schema.js';

// --- Helper para calcular el IMC ---
const calcularIMC = (peso?: number | null, talla?: number | null): number | null => {
  if (peso && talla && talla > 0) {
    const tallaEnMetros = talla / 100;
    return parseFloat((peso / (tallaEnMetros * tallaEnMetros)).toFixed(1));
  }
  return null;
};

// --- Helper para convertir strings vacíos a null ---
const emptyToNull = (value: any) => (value === '' || value === undefined ? null : value);


export const SignosVitalesService = {
  /**
   * ✅ Crea un nuevo registro de signos vitales para un paciente.
   */
  async crear(data: CreateSignosVitalesData) {
    console.log('🔍 [SERVICE] Creando signos vitales para paciente:', data.pacienteId);

    // 1. Validar que el paciente existe
    const paciente = await prisma.paciente.findUnique({ where: { id: data.pacienteId } });
    if (!paciente) {
      throw new Error("Paciente no encontrado");
    }

    // 2. Calcular IMC en el backend como fuente de verdad
    const imcCalculado = calcularIMC(data.peso, data.talla);

    // 3. Preparar y limpiar datos
    const datosLimpios = {
      ...data,
      tipoSangre: emptyToNull(data.tipoSangre),
      imc: imcCalculado,
    };

    // 4. Crear el registro en la base de datos
    return prisma.signosVitales.create({
      data: datosLimpios,
      include: {
        paciente: {
          select: { id: true, nombres: true, apellidos: true }
        }
      }
    });
  },

  /**
   * ✅ Obtiene el último registro de signos vitales de un paciente.
   */
  async obtenerUltimoPorPaciente(pacienteId: number) {
    console.log('🔍 [SERVICE] Obteniendo último registro de signos vitales para paciente:', pacienteId);
    
    return prisma.signosVitales.findFirst({
      where: { pacienteId },
      orderBy: { fechaToma: 'desc' },
    });
  },

  /**
   * ✅ Obtiene el registro de signos vitales asociado a una consulta específica.
   */
  async obtenerPorConsulta(consultaId: number) {
    console.log('🔍 [SERVICE] Obteniendo signos vitales para consulta:', consultaId);

    return prisma.signosVitales.findFirst({
      where: { consultaId },
      orderBy: { fechaToma: 'desc' },
    });
  },
  
  /**
   * ✅ Actualiza un registro de signos vitales existente.
   */
  async actualizar(id: number, data: UpdateSignosVitalesData) {
    console.log('🔍 [SERVICE] Actualizando signos vitales:', id);

    // 1. Verificar si el registro existe
    const registroExistente = await prisma.signosVitales.findUnique({ where: { id } });
    if (!registroExistente) {
      throw new Error("Registro de signos vitales no encontrado");
    }

    // 2. Recalcular IMC si el peso o la talla cambian
    const peso = data.peso ?? registroExistente.peso;
    const talla = data.talla ?? registroExistente.talla;
    const imcCalculado = calcularIMC(peso, talla);

    // 3. Preparar y limpiar datos
    const datosLimpios = {
      ...data,
      tipoSangre: data.tipoSangre !== undefined ? emptyToNull(data.tipoSangre) : undefined,
      imc: imcCalculado,
    };

    // 4. Actualizar el registro
    return prisma.signosVitales.update({
      where: { id },
      data: datosLimpios,
    });
  },

  /**
   * ✅ Elimina un registro de signos vitales.
   */
  async eliminar(id: number) {
    console.log('🔍 [SERVICE] Eliminando signos vitales:', id);
    
    // Se usa delete, ya que no se requiere un estado "ANULADO" como en diagnósticos.
    return prisma.signosVitales.delete({
      where: { id },
    });
  }
};
