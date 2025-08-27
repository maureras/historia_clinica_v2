// src/pages/patients/PatientCardModal.tsx
import React, { useRef } from 'react'
import { Modal, Button } from '@/components/ui'
import { useToast } from '@/components/ui/ToastNotifications'
import { QRCodeSVG } from 'qrcode.react'
import { 
  Download, 
  Printer, 
  User, 
  Phone, 
  Mail, 
  IdCard, 
  Calendar,
  Droplet,
  MapPin,
  Heart
} from 'lucide-react'

type Patient = {
  id: string
  firstName: string
  lastName: string
  documentType: string
  documentNumber: string
  dateOfBirth: Date
  gender: string
  phone?: string
  email?: string
  bloodType?: string
  allergies?: string[]
  emergencyContact?: {
    name: string
    relationship: string
    phone: string
    email?: string
  }
}

type Props = {
  isOpen: boolean
  onClose: () => void
  patient: Patient
}

export default function PatientCardModal({ isOpen, onClose, patient }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  // ✅ Usa el MISMO path que el botón de PatientsList
  const patientHistoryPath = `/records/medical/${patient.id}`
  
  // Útil si tu generador de QR necesita URL absoluta
  const patientHistoryUrl = `${window.location.origin}${patientHistoryPath}`
  
  // DEBUG (opcional)
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    }).format(new Date(date))
  }

  const getDocumentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'cedula': 'Cédula',
      'dni': 'DNI',
      'passport': 'Pasaporte',
      'other': 'Otro'
    }
    return types[type] || type
  }

  const getGenderLabel = (gender: string) => {
    const genders: Record<string, string> = {
      'male': 'Masculino',
      'female': 'Femenino', 
      'other': 'Otro'
    }
    return genders[gender] || gender
  }

  const getRelationLabel = (relation: string) => {
    const relations: Record<string, string> = {
      'spouse': 'Cónyuge',
      'parent': 'Padre/Madre',
      'child': 'Hijo/Hija',
      'sibling': 'Hermano/Hermana',
      'friend': 'Amigo/Amiga',
      'other': 'Otro'
    }
    return relations[relation] || relation
  }

  const calculateAge = (birthDate: Date) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const handleDownload = async () => {
    if (!cardRef.current) return

    try {
      // Importar dinámicamente html2canvas
      const html2canvas = await import('html2canvas')
      
      const canvas = await html2canvas.default(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Para mejor calidad
        useCORS: true,
        allowTaint: false
      })

      const link = document.createElement('a')
      link.download = `tarjeta-${patient.firstName}-${patient.lastName}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      toast.success('Tarjeta descargada', 'La tarjeta se ha descargado exitosamente')
    } catch (error) {
      console.error('Error descargando tarjeta:', error)
      toast.error('Error al descargar', 'No se pudo descargar la tarjeta')
    }
  }

  const handlePrint = () => {
    const printContent = cardRef.current
    if (!printContent) return

    const windowPrint = window.open('', '', 'width=800,height=600')
    if (!windowPrint) return

    windowPrint.document.write(`
      <html>
        <head>
          <title>Tarjeta de Paciente - ${patient.firstName} ${patient.lastName}</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              margin: 20px;
              background: white;
            }
            .card {
              max-width: 400px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="card">${printContent.innerHTML}</div>
        </body>
      </html>
    `)
    
    windowPrint.document.close()
    windowPrint.focus()
    windowPrint.print()
    windowPrint.close()

    toast.success('Enviado a imprimir', 'La tarjeta se ha enviado a la impresora')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tarjeta de Paciente" size="md">
      <div className="space-y-6">
        
        {/* Tarjeta del paciente */}
        <div 
          ref={cardRef}
          className="bg-gradient-to-br from-white to-sky-50 border-2 border-sky-200 rounded-2xl p-6 shadow-lg"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          {/* Header de la clínica */}
          <div className="text-center border-b border-sky-200 pb-4 mb-6">
            <div className="flex justify-center items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-sky-900">Clínica Médica</h2>
                <p className="text-sm text-sky-600">Sistema de Salud Digital</p>
              </div>
            </div>
          </div>

          {/* Información del paciente */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-sky-600" />
                <span className="text-sm font-medium text-slate-700">Paciente</span>
              </div>
              <p className="text-lg font-bold text-slate-900">
                {patient.firstName} {patient.lastName}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <IdCard className="h-4 w-4 text-sky-600" />
                <span className="text-xs font-medium text-slate-600">Documento</span>
              </div>
              <p className="text-sm text-slate-900">
                {getDocumentTypeLabel(patient.documentType)}
              </p>
              <p className="text-sm font-mono text-slate-800">{patient.documentNumber}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-sky-600" />
                <span className="text-xs font-medium text-slate-600">Edad</span>
              </div>
              <p className="text-sm text-slate-900">
                {calculateAge(patient.dateOfBirth)} años
              </p>
              <p className="text-xs text-slate-600">{formatDate(patient.dateOfBirth)}</p>
            </div>

            {patient.bloodType && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Droplet className="h-4 w-4 text-red-500" />
                  <span className="text-xs font-medium text-slate-600">Grupo sanguíneo</span>
                </div>
                <p className="text-sm font-bold text-red-600">{patient.bloodType}</p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-sky-600" />
                <span className="text-xs font-medium text-slate-600">Género</span>
              </div>
              <p className="text-sm text-slate-900">{getGenderLabel(patient.gender)}</p>
            </div>

            {(patient.phone || patient.email) && (
              <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {patient.phone && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="h-4 w-4 text-sky-600" />
                      <span className="text-xs font-medium text-slate-600">Teléfono</span>
                    </div>
                    <a href={`tel:${patient.phone}`} className="text-sm text-slate-900 hover:underline">
                      {patient.phone}
                    </a>
                  </div>
                )}

                {patient.email && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4 text-sky-600" />
                      <span className="text-xs font-medium text-slate-600">Email</span>
                    </div>
                    <a href={`mailto:${patient.email}`} className="text-sm text-slate-900 break-all hover:underline">
                      {patient.email}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contacto de emergencia */}
          {patient.emergencyContact && (
            <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-bold text-orange-800">🚨 CONTACTO DE EMERGENCIA</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre completo */}
                <div>
                  <div className="text-xs font-medium text-orange-700">Nombre completo</div>
                  <div className="text-sm font-bold text-orange-900">{patient.emergencyContact.name}</div>
                </div>

                {/* Parentesco */}
                <div>
                  <div className="text-xs font-medium text-orange-700">Relación</div>
                  <div className="text-sm text-orange-900">{getRelationLabel(patient.emergencyContact.relationship)}</div>
                </div>

                {/* Teléfono */}
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Phone className="h-3 w-3 text-orange-600" />
                    <span className="text-xs font-medium text-orange-700">Teléfono</span>
                  </div>
                  <a href={`tel:${patient.emergencyContact.phone}`} className="text-sm font-mono text-orange-900 hover:underline">
                    {patient.emergencyContact.phone}
                  </a>
                </div>

                {/* Email */}
                {patient.emergencyContact.email && (
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Mail className="h-3 w-3 text-orange-600" />
                      <span className="text-xs font-medium text-orange-700">Email</span>
                    </div>
                    <a href={`mailto:${patient.emergencyContact.email}`} className="text-xs text-orange-800 break-all hover:underline">
                      {patient.emergencyContact.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QR Code y instrucciones */}
          <div className="border-t border-sky-200 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-bold text-sky-900 mb-1">Acceso Digital</h4>
                <p className="text-xs text-sky-700 leading-relaxed">
                  Escanea este código QR para acceder a tu historia clínica digital
                </p>
                <div className="mt-2 text-xs text-slate-500">
                  ID: {patient.id.slice(-8).toUpperCase()}
                </div>
              </div>
              
              <div className="ml-4">
                <div className="bg-white p-2 rounded-lg border">
                  <QRCodeSVG
                    value={patientHistoryUrl}
                    size={80}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-sky-100 text-center">
            <p className="text-xs text-slate-500">
              Generado el {formatDate(new Date())}
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={handleDownload}
            icon={Download}
            className="border-sky-200 text-sky-700 hover:bg-sky-50"
          >
            Descargar
          </Button>
          
          <Button
            variant="outline"
            onClick={handlePrint}
            icon={Printer}
            className="border-sky-200 text-sky-700 hover:bg-sky-50"
          >
            Imprimir
          </Button>
          
          <Button onClick={onClose} className="bg-sky-600 hover:bg-sky-700">
            Cerrar
          </Button>
        </div>

        {/* Información adicional */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-2">Instrucciones para el paciente:</h4>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• Conserva esta tarjeta para futuras consultas</li>
            <li>• El código QR te da acceso directo a tu historia clínica</li>
            <li>• Puedes imprimir o guardar la imagen en tu teléfono</li>
            <li>• Presenta esta tarjeta en cada visita médica</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}