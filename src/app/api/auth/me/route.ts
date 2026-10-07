import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  if (!token) return NextResponse.json({ user: null })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ user: null })

  const user = await db.user.findUnique({ where: { id: payload.userId } })
  if (!user || !user.active) return NextResponse.json({ user: null })

  return NextResponse.json({
    user: {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  })
}
