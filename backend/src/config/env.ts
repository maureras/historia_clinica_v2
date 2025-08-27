import 'dotenv/config'

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev_key',
  STORAGE_DIR: process.env.STORAGE_DIR ?? './storage/uploads',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY
}
