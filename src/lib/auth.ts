import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'inventario-secret-key-desarrollo-2026-cambiar-en-produccion'
const secretKey = new TextEncoder().encode(JWT_SECRET)
const COOKIE_NAME = 'inv_token'

export type JWTPayload = {
  userId: string
  email: string
  role: 'admin' | 'operador' | 'supervisor'
  name: string
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export const AUTH_COOKIE = COOKIE_NAME
