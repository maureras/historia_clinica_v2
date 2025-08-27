import bcrypt from 'bcryptjs'

const ROUNDS = 11

export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres')
  }
  const salt = await bcrypt.genSalt(ROUNDS)
  return bcrypt.hash(plain, salt)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}