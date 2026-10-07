import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, AUTH_COOKIE, JWTPayload } from '@/lib/auth'

export type AuthResult =
  | { ok: true; user: JWTPayload }
  | { ok: false; response: NextResponse }

export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  }
  const payload = await verifyToken(token)
  if (!payload) {
    return { ok: false, response: NextResponse.json({ error: 'Token inválido' }, { status: 401 }) }
  }
  return { ok: true, user: payload }
}

export async function requireRole(req: NextRequest, roles: string[]): Promise<AuthResult> {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth
  if (!roles.includes(auth.user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 }),
    }
  }
  return auth
}
