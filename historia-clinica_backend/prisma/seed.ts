// prisma/seed.ts
import { PrismaClient, RolUsuario } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]) { return arr[rand(0, arr.length - 1)]; }

async function resetAll() {
  // Orden seguro (hijos -> padres)
  await prisma.laboratorioResultado.deleteMany();
  await prisma.laboratorioArchivo.deleteMany();
  await prisma.laboratorio.deleteMany();
  await prisma.consulta.deleteMany();
  await prisma.accesoLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.paciente.deleteMany();
  // Usuarios al final (solo si quieres que se recreen siempre)
  await prisma.usuario.deleteMany();
}

async function upsertUsuarios() {
  const passAdmin = await bcrypt.hash('Admin123!', 10);
  const passMed   = await bcrypt.hash('Medico123!', 10);
  const passEnf   = await bcrypt.hash('Enfermera123!', 10);

  // Admin
  await prisma.usuario.upsert({
    where: { email: 'admin@clinicacentral.com' },
    update: {},
    create: {
      email: 'admin@clinicacentral.com',
      password: passAdmin,
      nombres: 'Administrador',
      apellidos: 'Central',
      rol: RolUsuario.ADMIN,
      especialidad: null,
      activo: true
    }
  });

  // Médico
  await prisma.usuario.upsert({
    where: { email: 'dr.garcia@clinicacentral.com' },
    update: {},
    create: {
      email: 'dr.garcia@clinicacentral.com',
      password: passMed,
      nombres: 'Carlos',
      apellidos: 'García',
      rol: RolUsuario.MEDICO,
      especialidad: 'Medicina Interna',
      activo: true
    }
  });

  // Enfermera
  await prisma.usuario.upsert({
    where: { email: 'enfermera.silva@clinicacentral.com' },
    update: {},
    create: {
      email: 'enfermera.silva@clinicacentral.com',
      password: passEnf,
      nombres: 'María',
      apellidos: 'Silva',
      rol: RolUsuario.ENFERMERA,
      especialidad: null,
      activo: true
    }
  });
}

type PacInput = {
  nombres: string;
  apellidos: string;
  numeroIdentificacion: string; // único
  email: string;                // único
  telefono?: string;
  direccion?: string;
  sexo?: 'M' | 'F';
  grupoSanguineo?: string;
};

const basePacientes: PacInput[] = [
  { nombres: 'Carlos',  apellidos: 'Mendoza',   numeroIdentificacion: '0102030001', email: 'carlos.mendoza@demo.local',  telefono: '0991001001', direccion: 'Av. Siempre Viva 123', sexo: 'M', grupoSanguineo: 'O+' },
  { nombres: 'María',   apellidos: 'Lopez',     numeroIdentificacion: '0102030002', email: 'maria.lopez@demo.local',     telefono: '0991001002', direccion: 'Calle 10 y 5',         sexo: 'F', grupoSanguineo: 'A+' },
  { nombres: 'Jorge',   apellidos: 'García',    numeroIdentificacion: '0102030003', email: 'jorge.garcia@demo.local',    telefono: '0991001003', direccion: 'Los Almendros 45',     sexo: 'M', grupoSanguineo: 'B+' },
  { nombres: 'Ana',     apellidos: 'Pérez',     numeroIdentificacion: '0102030004', email: 'ana.perez@demo.local',       telefono: '0991001004', direccion: 'San Blas 22',          sexo: 'F', grupoSanguineo: 'O-' },
  { nombres: 'Luis',    apellidos: 'Ramírez',   numeroIdentificacion: '0102030005', email: 'luis.ramirez@demo.local',    telefono: '0991001005', direccion: '9 de Octubre 101',     sexo: 'M', grupoSanguineo: 'AB+' },
  { nombres: 'Sofía',   apellidos: 'Hernández', numeroIdentificacion: '0102030006', email: 'sofia.hernandez@demo.local',  telefono: '0991001006', direccion: 'La Floresta 8',        sexo: 'F', grupoSanguineo: 'A-' },
  { nombres: 'Pedro',   apellidos: 'Cedeño',    numeroIdentificacion: '0102030007', email: 'pedro.cedeno@demo.local',     telefono: '0991001007', direccion: 'Colón 505',            sexo: 'M', grupoSanguineo: 'B-' },
  { nombres: 'Valeria', apellidos: 'Quintero',  numeroIdentificacion: '0102030008', email: 'valeria.quintero@demo.local', telefono: '0991001008', direccion: 'Rio Amazonas 300',     sexo: 'F', grupoSanguineo: 'O+' },
  { nombres: 'Ricardo', apellidos: 'Narváez',   numeroIdentificacion: '0102030009', email: 'ricardo.narvaez@demo.local',  telefono: '0991001009', direccion: 'Los Ceibos 14',        sexo: 'M', grupoSanguineo: 'A+' },
  { nombres: 'Gabriela',apellidos: 'Suárez',    numeroIdentificacion: '0102030010', email: 'gabriela.suarez@demo.local',  telefono: '0991001010', direccion: '10 de Agosto 77',      sexo: 'F', grupoSanguineo: 'AB+' },
];

const motivos = [
  'Dolor abdominal', 'Cefalea', 'Control rutinario', 'Faringitis',
  'Lumbalgia', 'Hipertensión en control', 'Gastritis', 'Resfriado común'
];
const impresiones = [
  'Evolución favorable', 'Requiere control en 1 semana',
  'Requiere laboratorio', 'Buena respuesta al tratamiento',
  'Observación domiciliar'
];

async function crearPacientesYConsultas() {
  let totalConsultas = 0;

  for (const p of basePacientes) {
    // fecha de nacimiento aleatoria entre 1975 y 2005
    const nacimiento = new Date();
    nacimiento.setFullYear(rand(1975, 2005));
    nacimiento.setMonth(rand(0, 11), rand(1, 28));
    nacimiento.setHours(0, 0, 0, 0);

    const paciente = await prisma.paciente.create({
      data: {
        nombres: p.nombres,
        apellidos: p.apellidos,
        numeroIdentificacion: p.numeroIdentificacion,
        fechaNacimiento: nacimiento,
        sexo: p.sexo,
        email: p.email,
        telefono: p.telefono,
        direccion: p.direccion,
        grupoSanguineo: p.grupoSanguineo,
        alergias: JSON.stringify(['Penicilina']),
        contactoEmergencia: JSON.stringify({
          nombre: 'Contacto ' + p.nombres,
          telefono: '099' + rand(1000000, 9999999),
          relacion: 'Familiar'
        }),
        notas: 'Paciente creado por seed',
      }
    });

    const nConsultas = rand(3, 5); // mínimo 3
    for (let i = 0; i < nConsultas; i++) {
      const fecha = new Date();
      // fechas en los últimos 18 meses
      fecha.setMonth(fecha.getMonth() - rand(0, 18));
      fecha.setDate(rand(1, 28));
      fecha.setHours(rand(8, 16), rand(0, 59), 0, 0);

      const consulta = await prisma.consulta.create({
        data: {
          pacienteId: paciente.id,
          fechaConsulta: fecha,
          motivo: pick(motivos),
          padecimientoActual: 'Descripción breve del padecimiento.',
          signosVitales: 'PA 120/80, FC 78, FR 16, Temp 36.6',
          exploracionFisica: 'Buen estado general, sin hallazgos relevantes.',
          diagnostico: 'Dx presuntivo',
          tratamiento: 'Paracetamol 500mg cada 8h por 3 días',
          examenes: 'Hemograma, Glucosa'
        }
      });

      // 50%: adjuntar un laboratorio a la consulta
      if (Math.random() < 0.5) {
        await prisma.laboratorio.create({
          data: {
            pacienteId: paciente.id,
            consultaId: consulta.id,
            archivo: `lab_${paciente.id}_${consulta.id}.pdf`,
            url: `/uploads/labs/lab_${paciente.id}_${consulta.id}.pdf`,
            fechaInforme: fecha,
            resumenHallazgos: 'Resultados dentro de rangos normales.',
            resultados: JSON.stringify([
              { prueba: 'Hemoglobina', valor: '14.2', unidad: 'g/dL', rango: '13-17' },
              { prueba: 'Glucosa', valor: '92', unidad: 'mg/dL', rango: '70-100' }
            ])
          }
        });
      }

      totalConsultas++;
    }

    console.log(`🧍 Paciente ${p.nombres} ${p.apellidos} con ${nConsultas} consultas`);
  }

  return { pacientes: basePacientes.length, consultas: totalConsultas };
}

async function main() {
  console.log('🌱 Iniciando seed...');
  await resetAll();
  await upsertUsuarios();
  console.log('👤 Usuarios creados/asegurados.');

  const sum = await crearPacientesYConsultas();
  console.log(`✅ Seed OK -> Pacientes: ${sum.pacientes} | Consultas: ${sum.consultas}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
