import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'

// GET /api/alertas -> lista alertas activas con detalle
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const soloActivas = url.searchParams.get('estado') !== 'todas'

  const where: Record<string, unknown> = {}
  if (soloActivas) where.estado = 'activa'

  const alertas = await db.alerta.findMany({
    where,
    include: {
      producto: { select: { codigo: true, nombre: true, stockActual: true, stockMinimo: true } },
      lote: { select: { numeroLote: true, fechaVencimiento: true, cantidadActual: true } },
    },
    orderBy: { fechaGeneracion: 'desc' },
  })

  // Enriquecer con días para vencer
  const hoy = new Date()
  const alertasEnriquecidas = alertas.map((a) => {
    let diasVencer: number | null = null
    if (a.tipo === 'vencimiento' && a.lote) {
      const diff = a.lote.fechaVencimiento.getTime() - hoy.getTime()
      diasVencer = Math.ceil(diff / (1000 * 60 * 60 * 24))
    }
    return {
      ...a,
      diasVencer,
      criticidad: a.tipo === 'vencimiento' && diasVencer !== null && diasVencer <= 7 ? 'alta' : a.tipo === 'stock_bajo' ? 'alta' : 'media',
    }
  })

  // Ordena por criticidad
  alertasEnriquecidas.sort((a, b) => {
    if (a.criticidad === 'alta' && b.criticidad !== 'alta') return -1
    if (b.criticidad === 'alta' && a.criticidad !== 'alta') return 1
    return 0
  })

  return NextResponse.json({ alertas: alertasEnriquecidas })
}

// PATCH /api/alertas/[id] -> atender alerta (cambiar estado)
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const { id, estado } = body
    if (!id || !estado) {
      return NextResponse.json({ error: 'Se requiere id y estado' }, { status: 400 })
    }
    const alerta = await db.alerta.update({
      where: { id },
      data: { estado, fechaResolucion: estado === 'atendida' ? new Date() : null },
    })
    return NextResponse.json({ alerta })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
