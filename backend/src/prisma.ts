// backend/src/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['warn', 'error'], // ajusta si quieres 'query' en dev
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma