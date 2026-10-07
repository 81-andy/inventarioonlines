import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, signToken, AUTH_COOKIE, JWTPayload } from '@/lib/auth'

// Inicializa la base de datos con un admin por defecto si no hay usuarios
async function ensureSeed() {
  const count = await db.user.count()
  if (count === 0) {
    const adminHash = await hashPassword('admin123')
    await db.user.create({
      data: {
        email: 'admin@inventario.com',
        name: 'Administrador',
        passwordHash: adminHash,
        role: 'admin',
      },
    })

    const opHash = await hashPassword('operador123')
    await db.user.create({
      data: {
        email: 'operador@inventario.com',
        name: 'Operador 1',
        passwordHash: opHash,
        role: 'operador',
      },
    })

    const supHash = await hashPassword('supervisor123')
    await db.user.create({
      data: {
        email: 'supervisor@inventario.com',
        name: 'Supervisor 1',
        passwordHash: supHash,
        role: 'supervisor',
      },
    })

    // Parámetros iniciales
    const p = await db.parametro.count()
    if (p === 0) {
      await db.parametro.create({ data: { clave: 'dias_vencimiento', valor: '30' } })
      await db.parametro.create({ data: { clave: 'dias_critico', valor: '7' } })
    }

    // Categorías iniciales
    const c = await db.categoria.count()
    if (c === 0) {
      for (const nombre of ['Alimentos', 'Medicamentos', 'Limpieza', 'Oficina', 'Otros']) {
        await db.categoria.create({ data: { nombre } })
      }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSeed()
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son obligatorios' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user || !user.active) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const { comparePassword } = await import('@/lib/auth')
    const ok = await comparePassword(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as 'admin' | 'operador' | 'supervisor',
      name: user.name,
    }
    const token = await signToken(payload)

    const res = NextResponse.json({ user: payload })
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
