import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('🔍 Testing Prisma connection...')
    
    // Verificar modelos disponibles
    console.log('📋 Available models:', Object.keys(prisma))
    
    // Verificar modelos específicos
    if (prisma.padecimientoActual) {
      console.log('✅ padecimientoActual model available')
    } else {
      console.log('❌ padecimientoActual model NOT found')
    }
    if (prisma.consulta) {
      console.log('✅ consulta model available')  
    } else {
      console.log('❌ consulta model NOT found')
    }
    if (prisma.paciente) {
      console.log('✅ paciente model available')
    } else {
      console.log('❌ paciente model NOT found')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
