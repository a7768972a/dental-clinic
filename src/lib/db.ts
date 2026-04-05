import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Important for serverless
    __internal: {
      engine: {
        connectionLimit: 1,
      },
    },
  })
}

// In development, use a global variable to preserve the client
// In production (Vercel), create a new client for each function invocation
export const db = process.env.NODE_ENV === 'production' 
  ? createPrismaClient()
  : (globalForPrisma.prisma ?? createPrismaClient())

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
