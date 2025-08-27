/* eslint-disable no-console */
// prisma/seed.ts
// Ejecuta:  npx prisma db seed

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Utilidades rápidas
const hash = (pwd: string) => bcrypt.hash(pwd, 10)
const pick = <T>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]
const now = () => new Date()

// Fechas helper
const daysAgo = (d: number) => {
  const dt = new Date()
  dt.setDate(dt.getDate() - d)
  return dt
}

async function seedUsers() {
  const baseUsers = [
    {
      email: 'admin@clinica.com',
      password: 'admin123',
      firstName: 'Dr. Juan',
      lastName: 'Pérez',
      role: 'admin',
      speciality: 'Medicina General',
      isActive: true,
      lastLogin: daysAgo(0),
    },
    {
      email: 'doctor@clinica.com',
      password: 'doctor123',
      firstName: 'Dra. María',
      lastName: 'González',
      role: 'doctor',
      speciality: 'Cardiología',
      isActive: true,
      lastLogin: daysAgo(1),
    },
    {
      email: 'enfermera@clinica.com',
      password: 'enfermera123',
      firstName: 'Ana',
      lastName: 'Rodríguez',
      role: 'nurse',
      speciality: null,
      isActive: true,
      lastLogin: daysAgo(3),
    },
  ]

  for (const u of baseUsers) {
    const passwordHash = await hash(u.password)
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        speciality: u.speciality ?? undefined,
        isActive: u.isActive,
        lastLogin: u.lastLogin,
      },
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        speciality: u.speciality ?? undefined,
        isActive: u.isActive,
        lastLogin: u.lastLogin,
      },
    })
  }

  console.log('👤 Usuarios base creados/actualizados.')
}

function buildPatientsData() {
  // 10 pacientes de ejemplo
  const pts = [
    {
      firstName: 'Mauro',
      lastName: 'García',
      gender: 'male',
      dateOfBirth: new Date('1990-05-12'),
      documentType: 'cedula',
      documentNumber: '1755947874535',
      phone: '0999999999',
      email: 'mauro@example.com',
      address: 'Quito',
      bloodType: 'O+',
      emergencyContact: JSON.stringify({ // ⚠️ JSON serializado en texto
        name: 'María García',
        relationship: 'spouse',
        phone: '0987654321',
        email: 'maria@example.com',
      }),
    },
    {
      firstName: 'Ana',
      lastName: 'Rodríguez',
      gender: 'female',
      dateOfBirth: new Date('1986-11-03'),
      documentType: 'cedula',
      documentNumber: '1102345678',
      phone: '0977777777',
      email: 'ana@example.com',
      address: 'Guayaquil',
      bloodType: 'A-',
      emergencyContact: JSON.stringify({
        name: 'Carlos Rodríguez',
        relationship: 'brother',
        phone: '0966666666',
      }),
    },
    {
      firstName: 'Luis',
      lastName: 'Paredes',
      gender: 'male',
      dateOfBirth: new Date('1975-01-22'),
      documentType: 'cedula',
      documentNumber: '0912233445',
      phone: '0981112233',
      email: 'lparedes@example.com',
      address: 'Cuenca',
      bloodType: 'B+',
      emergencyContact: JSON.stringify({
        name: 'Teresa Paredes',
        relationship: 'mother',
        phone: '0980011223',
      }),
    },
    {
      firstName: 'Carla',
      lastName: 'Yépez',
      gender: 'female',
      dateOfBirth: new Date('1998-09-18'),
      documentType: 'cedula',
      documentNumber: '1712345670',
      phone: '0987654321',
      email: 'cyepez@example.com',
      address: 'Quito',
      bloodType: 'AB+',
      emergencyContact: JSON.stringify({
        name: 'Daniel Yépez',
        relationship: 'father',
        phone: '0991112233',
      }),
    },
    {
      firstName: 'Diego',
      lastName: 'Salazar',
      gender: 'male',
      dateOfBirth: new Date('1983-02-11'),
      documentType: 'cedula',
      documentNumber: '1209876543',
      phone: '0993334445',
      email: 'dsalazar@example.com',
      address: 'Loja',
      bloodType: 'O-',
      emergencyContact: JSON.stringify({
        name: 'María Salazar',
        relationship: 'sister',
        phone: '0987778889',
      }),
    },
    {
      firstName: 'Valeria',
      lastName: 'Torres',
      gender: 'female',
      dateOfBirth: new Date('1992-07-30'),
      documentType: 'pasaporte',
      documentNumber: 'P-EC-998877',
      phone: '0985556677',
      email: 'vtorres@example.com',
      address: 'Ambato',
      bloodType: 'A+',
      emergencyContact: JSON.stringify({
        name: 'Paúl Torres',
        relationship: 'brother',
        phone: '0992223344',
      }),
    },
    {
      firstName: 'Marcelo',
      lastName: 'Vera',
      gender: 'male',
      dateOfBirth: new Date('1968-03-10'),
      documentType: 'cedula',
      documentNumber: '1711112222',
      phone: '0981002003',
      email: 'mvera@example.com',
      address: 'Santo Domingo',
      bloodType: 'B-',
      emergencyContact: JSON.stringify({
        name: 'Alicia Vera',
        relationship: 'spouse',
        phone: '0995566778',
      }),
    },
    {
      firstName: 'Lucía',
      lastName: 'Cedeño',
      gender: 'female',
      dateOfBirth: new Date('1979-12-05'),
      documentType: 'cedula',
      documentNumber: '1310102030',
      phone: '0970010020',
      email: 'lcedeno@example.com',
      address: 'Manta',
      bloodType: 'O+',
      emergencyContact: JSON.stringify({
        name: 'Gina Cedeño',
        relationship: 'mother',
        phone: '0981112233',
      }),
    },
    {
      firstName: 'Esteban',
      lastName: 'Mendoza',
      gender: 'male',
      dateOfBirth: new Date('2001-04-25'),
      documentType: 'cedula',
      documentNumber: '1109988776',
      phone: '0989090909',
      email: 'emendoza@example.com',
      address: 'Riobamba',
      bloodType: 'AB-',
      emergencyContact: JSON.stringify({
        name: 'Pedro Mendoza',
        relationship: 'father',
        phone: '0981212121',
      }),
    },
    {
      firstName: 'Sofía',
      lastName: 'Calle',
      gender: 'female',
      dateOfBirth: new Date('1995-10-14'),
      documentType: 'cedula',
      documentNumber: '1712123434',
      phone: '0997878787',
      email: 'scalle@example.com',
      address: 'Quito',
      bloodType: 'A-',
      emergencyContact: JSON.stringify({
        name: 'Andrea Calle',
        relationship: 'sister',
        phone: '0996767676',
      }),
    },
  ]
  return pts
}

async function seedPatients() {
  const pts = buildPatientsData()
  const count = await prisma.patient.count()
  if (count === 0) {
    await prisma.patient.createMany({ data: pts })
    console.log(`🧑‍⚕️ Pacientes creados: ${pts.length}`)
  } else {
    console.log('🧑‍⚕️ Pacientes ya existentes, no se duplican.')
  }
}

async function seedConsultationsAndLabs() {
  const doctor = await prisma.user.findFirst({ where: { role: 'doctor' } })
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } })
  const allPatients = await prisma.patient.findMany({})

  if (allPatients.length === 0) {
    console.warn('⚠️ No hay pacientes para crear consultas/labs.')
    return
  }

  // Para cada paciente creamos 1–3 consultas + documentos + labs
  for (const p of allPatients) {
    const existingConsults = await prisma.consultation.count({ where: { patientId: p.id } })
    if (existingConsults > 0) continue

    const numConsults = [1, 2, 3][Math.floor(Math.random() * 3)]
    const estados = ['borrador', 'en_progreso', 'completada'] as const

    const createdConsults = []
    for (let i = 0; i < numConsults; i++) {
      const c = await prisma.consultation.create({
        data: {
          patientId: p.id,
          fecha: daysAgo(10 + Math.floor(Math.random() * 90)),
          estado: pick(estados),
          motivo: pick([
            'Control de hipertensión',
            'Dolor torácico',
            'Chequeo general',
            'Dolor abdominal',
            'Control post-operatorio',
          ]),
          resumen: pick([
            'Estable, continuar tratamiento.',
            'Ajuste de dosis recomendado.',
            'Sin hallazgos agudos.',
            'Se indica reposo y analgésicos.',
          ]),
          medico: doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Dr. Sistema',
          signosVitales: JSON.stringify({ // ⚠️ JSON serializado
            presion: `${110 + Math.floor(Math.random() * 40)}/${70 + Math.floor(Math.random() * 20)}`,
            fc: `${60 + Math.floor(Math.random() * 40)}`,
            spo2: `${95 + Math.floor(Math.random() * 4)}%`,
          }),
          padecimientoActual: pick(['HTA', 'DM2', 'Cefalea', 'Dislipidemia', 'Asintomático']),
          exploracionFisica: pick(['No dolor a la palpación', 'Murmullo vesicular conservado', 'Ruidos cardiacos rítmicos']),
          diagnostico: pick(['CIE10-I10', 'CIE10-E11', 'CIE10-R07', 'CIE10-K30']),
          tratamiento: pick(['Paracetamol 500mg c/8h', 'Ibuprofeno 400mg SOS', 'Losartán 50mg/día', 'Omeprazol 20mg/día']),
        },
      })
      createdConsults.push(c)
    }

    // Documentos subidos (1–2 por paciente)
    const docCount = [1, 2][Math.floor(Math.random() * 2)]
    const docs = []
    for (let j = 0; j < docCount; j++) {
      const doc = await prisma.uploadedDocument.create({
        data: {
          patientId: p.id,
          tipo: pick(['laboratorio', 'imagen', 'otro']),
          filename: pick(['hemo_2025_01.pdf', 'rx_torax.jpg', 'eco_abdomen.pdf']),
          mimetype: pick(['application/pdf', 'image/jpeg']),
          size: 100000 + Math.floor(Math.random() * 400000),
          path: `/files/${p.id}/${Date.now()}_${j}`, // ruta demo
          ocrStatus: pick(['pending', 'done', 'failed']),
          parsed: Math.random() > 0.3,
        },
      })
      docs.push(doc)
    }

    // LabResults (1–3) con valores
    const labNum = [1, 2, 3][Math.floor(Math.random() * 3)]
    for (let k = 0; k < labNum; k++) {
      const linkedConsult = pick(createdConsults)
      const maybeDoc = docs.length ? pick(docs) : undefined

      const lab = await prisma.labResult.create({
        data: {
          patientId: p.id,
          consultationId: linkedConsult?.id ?? null,
          source: pick(['manual', 'ocr', 'ai']),
          fechaInforme: daysAgo(5 + Math.floor(Math.random() * 30)),
          resumen: pick([
            'Perfil lipídico con LDL elevado',
            'Hemograma dentro de rangos normales',
            'Glucosa en ayunas límite superior',
          ]),
          documentId: maybeDoc?.id ?? null,
        },
      })

      // Valores de laboratorio
      const panel = pick(['HEMOGRAMA', 'PERFIL LIPÍDICO', 'METABÓLICO BÁSICO'])
      const values =
        panel === 'HEMOGRAMA'
          ? [
              { prueba: 'Hb', valor: `${12 + Math.random() * 4}`, unidad: 'g/dL', rango: '12–16', flag: '' },
              { prueba: 'Hto', valor: `${36 + Math.random() * 8}`, unidad: '%', rango: '36–46', flag: '' },
              { prueba: 'Leucocitos', valor: `${6000 + Math.floor(Math.random() * 3000)}`, unidad: '/µL', rango: '4000–11000', flag: '' },
            ]
          : panel === 'PERFIL LIPÍDICO'
          ? [
              { prueba: 'Colesterol Total', valor: `${160 + Math.floor(Math.random() * 80)}`, unidad: 'mg/dL', rango: '<200', flag: '' },
              { prueba: 'LDL', valor: `${90 + Math.floor(Math.random() * 70)}`, unidad: 'mg/dL', rango: '<130', flag: (Math.random() > 0.6 ? 'H' : '') },
              { prueba: 'HDL', valor: `${35 + Math.floor(Math.random() * 25)}`, unidad: 'mg/dL', rango: '>40', flag: (Math.random() > 0.7 ? 'L' : '') },
              { prueba: 'Triglicéridos', valor: `${120 + Math.floor(Math.random() * 150)}`, unidad: 'mg/dL', rango: '<150', flag: (Math.random() > 0.6 ? 'H' : '') },
            ]
          : [
              { prueba: 'Glucosa', valor: `${85 + Math.floor(Math.random() * 40)}`, unidad: 'mg/dL', rango: '70–99', flag: (Math.random() > 0.7 ? 'H' : '') },
              { prueba: 'Creatinina', valor: `${0.7 + Math.random() * 0.8}`, unidad: 'mg/dL', rango: '0.6–1.3', flag: '' },
              { prueba: 'Urea', valor: `${20 + Math.floor(Math.random() * 15)}`, unidad: 'mg/dL', rango: '15–40', flag: '' },
            ]

      await prisma.labValue.createMany({
        data: values.map(v => ({
          labResultId: lab.id,
          prueba: v.prueba,
          valor: String(v.valor),
          unidad: v.unidad,
          rango: v.rango,
          flag: v.flag,
          categoria: panel,
        })),
      })
    }
  }

  console.log('🩺 Consultas, documentos y laboratorios creados.')
}

async function seedLogs() {
  const users = await prisma.user.findMany()
  const anyUser = users[0]

  // AccessLogs (10)
  const accessLogs = Array.from({ length: 10 }).map(() => ({
    actorId: anyUser?.id,
    recurso: pick(['/api/patients', '/api/users', '/api/consultations']),
    accion: pick(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    ip: pick(['192.168.0.10', '10.0.0.5', '127.0.0.1']),
    userAgent: pick(['Web/Chrome', 'Mobile/Safari', 'PostmanRuntime']),
  }))
  await prisma.accessLog.createMany({ data: accessLogs })

  // ModificationLogs (5)
  const modLogs = Array.from({ length: 5 }).map(() => ({
    actorId: anyUser?.id,
    recurso: pick(['patient:update', 'user:update', 'consultation:update']),
    accion: pick(['UPDATE', 'CREATE', 'DELETE']),
    diff: JSON.stringify({ // ⚠️ JSON serializado
      before: { isActive: true },
      after: { isActive: false },
    }),
    ip: pick(['192.168.0.10', '10.0.0.5']),
    userAgent: pick(['Web/Chrome', 'PostmanRuntime']),
  }))
  await prisma.modificationLog.createMany({ data: modLogs })

  // PrintLogs (5)
  const printLogs = Array.from({ length: 5 }).map(() => ({
    actorId: anyUser?.id,
    recurso: pick(['patient:summary', 'lab:result', 'consultation:note']),
    motivo: pick(['entrega a paciente', 'referencia', 'auditoría']),
    ip: pick(['192.168.0.10', '10.0.0.5']),
    userAgent: pick(['Web/Chrome', 'Desktop/PDF']),
  }))
  await prisma.printLog.createMany({ data: printLogs })

  console.log('🧾 Logs de acceso/modificación/impresión creados.')
}

async function main() {
  await seedUsers()
  await seedPatients()
  await seedConsultationsAndLabs()
  await seedLogs()
  console.log('🌱 Seed COMPLETADO.')
}

main()
  .catch((e) => {
    console.error('❌ Seed falló:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })