import { Router } from 'express'
import prisma from '../prisma'
import { requireAuth, requireRole } from '../middleware/auth'
import { audit, logModification } from '../middleware/audit'

const router = Router()

// Solo roles autorizados
router.use(requireAuth, requireRole(['admin', 'doctor', 'nurse', 'receptionist']))

function safeParse(s: string) {
  try { return JSON.parse(s) } catch { return null }
}

// GET /patients  (lista)
router.get('/', audit('patient', 'list'), async (_req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
    })
    const normalized = patients.map(p => ({
      ...p,
      emergencyContact: p.emergencyContact ? safeParse(p.emergencyContact) : null,
    }))
    res.json(normalized)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al listar pacientes' })
  }
})

// GET /patients/:id (detalle)
router.get('/:id', audit('patient', 'view'), async (req, res) => {
  try {
    const p = await prisma.patient.findUnique({ where: { id: String(req.params.id) } })
    if (!p) return res.status(404).json({ message: 'Paciente no encontrado' })
    res.json({
      ...p,
      emergencyContact: p.emergencyContact ? safeParse(p.emergencyContact) : null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener paciente' })
  }
})

// GET /patients/:id/consultations (consultas del paciente)
router.get('/:id/consultations', audit('consultation', 'list'), async (req, res) => {
  try {
    const items = await prisma.consultation.findMany({
      where: { patientId: String(req.params.id) },
      orderBy: { fecha: 'desc' },
    })
    res.json({ items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al listar consultas del paciente' })
  }
})

// PUT /patients/:id (actualiza)
router.put('/:id', audit('patient', 'update'), async (req, res) => {
  try {
    const {
      firstName, lastName, documentType, documentNumber,
      dateOfBirth, gender, phone, email, bloodType, emergencyContact, address, isActive
    } = req.body

    const id = String(req.params.id)
    const before = await prisma.patient.findUnique({ where: { id } })
    if (!before) return res.status(404).json({ message: 'Paciente no encontrado' })

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        firstName,
        lastName,
        documentType: documentType ?? null,
        documentNumber: documentNumber ?? null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender ?? null,
        phone: phone ?? null,
        email: email ?? null,
        bloodType: bloodType ?? null,
        address: typeof address === 'string'
          ? address
          : (address ? JSON.stringify(address) : null),
        emergencyContact: emergencyContact
          ? JSON.stringify(emergencyContact)
          : null,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
      },
    })

    // calcula cambios SOLO de los campos relevantes que pudieron cambiar
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    const setChange = (k: string, fromVal: unknown, toVal: unknown) => {
      if (fromVal !== toVal) changes[k] = { from: fromVal, to: toVal }
    }
    setChange('firstName', before.firstName, updated.firstName)
    setChange('lastName', before.lastName, updated.lastName)
    setChange('documentType', before.documentType, updated.documentType)
    setChange('documentNumber', before.documentNumber, updated.documentNumber)
    setChange('dateOfBirth', before.dateOfBirth?.toISOString(), updated.dateOfBirth?.toISOString())
    setChange('gender', before.gender, updated.gender)
    setChange('phone', before.phone, updated.phone)
    setChange('email', before.email, updated.email)
    setChange('bloodType', before.bloodType, updated.bloodType)
    setChange('address', before.address, updated.address)
    setChange('emergencyContact', before.emergencyContact, updated.emergencyContact)
    setChange('isActive', before.isActive, updated.isActive)

    // log sólo si hubo cambios
    if (Object.keys(changes).length > 0) {
      const firstKey = Object.keys(changes)[0]
      const first = changes[firstKey]
      await logModification(req, {
        recurso: 'patient',
        accion: 'update',
        entityId: id,
        patientId: id,
        // para que la UI pueda renderizar algo aunque no parsee el diff:
        fieldName: firstKey,
        previousValue: (first as any)?.from ?? null,
        newValue: (first as any)?.to ?? null,
        diff: { entityId: id, changes },
      })
    }

    res.json({
      ...updated,
      emergencyContact: updated.emergencyContact ? safeParse(updated.emergencyContact) : null,
    })
  } catch (err) {
    console.error(err)
    res.status(400).json({ message: 'Error al actualizar paciente' })
  }
})

// POST /patients (crea)
router.post('/', audit('patient', 'create'), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      documentType,
      documentNumber,
      dateOfBirth,
      gender,
      phone,
      email,
      bloodType,
      emergencyContact,
      address,
      isActive,
    } = req.body

    const created = await prisma.patient.create({
      data: {
        firstName,
        lastName,
        documentType: documentType ?? null,
        documentNumber: documentNumber ?? null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender ?? null,
        phone: phone ?? null,
        email: email ?? null,
        bloodType: bloodType ?? null,
        address: typeof address === 'string'
          ? address
          : (address ? JSON.stringify(address) : null),
        emergencyContact: emergencyContact
          ? JSON.stringify(emergencyContact)
          : null,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    })

    await logModification(req, {
      recurso: 'patient',
      accion: 'create',
      entityId: created.id,
      patientId: created.id,
      diff: {
        entityId: created.id,
        patientId: created.id,
        created: { firstName, lastName, email, documentNumber },
        patientName: `${firstName} ${lastName}`
      },
    })

    const normalized = {
      ...created,
      emergencyContact: created.emergencyContact
        ? safeParse(created.emergencyContact)
        : null,
    }

    res.status(201).json(normalized)
  } catch (err) {
    console.error(err)
    res.status(400).json({ message: 'Error al crear paciente' })
  }
})

// DELETE /patients/:id
router.delete('/:id', audit('patient', 'delete'), async (req, res) => {
  const id = String(req.params.id)
  try {
    const before = await prisma.patient.findUnique({ where: { id } })
    if (!before) return res.status(404).json({ message: 'Paciente no encontrado' })

    await prisma.$transaction(async (tx) => {
      // 1) Borra valores de laboratorio del paciente
      await tx.labValue.deleteMany({
        where: { labResult: { is: { patientId: id } } } // relación a través de LabResult
      })

      // 2) Borra resultados de laboratorio del paciente
      await tx.labResult.deleteMany({ where: { patientId: id } })

      // 3) Borra documentos subidos del paciente
      await tx.uploadedDocument.deleteMany({ where: { patientId: id } })

      // 4) Borra consultas del paciente
      await tx.consultation.deleteMany({ where: { patientId: id } })

      // 5) Finalmente, borra el paciente
      await tx.patient.delete({ where: { id } })
    })

    // log de eliminación
    await logModification(req, {
      recurso: 'patient',
      accion: 'delete',
      entityId: id,
      patientId: id,
      diff: {
        entityId: id,
        patientId: id,
        deleted: true,
        previousValue: {
          firstName: before.firstName,
          lastName: before.lastName,
          email: before.email
        },
        patientName: `${before.firstName} ${before.lastName}`
      },
    })

    return res.status(204).send()
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return res.status(404).json({ message: 'Paciente no encontrado' })
    }
    if (err?.code === 'P2003') {
      // Si ves esto, aún queda una FK que no contemplamos (log para identificarla)
      console.error('[DELETE patient] FK bloqueando:', err?.meta)
      return res.status(409).json({
        message: 'No se puede eliminar: existen datos relacionados no contemplados en el borrado en cascada del endpoint.'
      })
    }
    console.error(err)
    return res.status(500).json({ message: 'Error al eliminar paciente' })
  }
})

export default router