import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth-middleware'
import { recalcularAlertas } from '@/lib/alertas'

// GET /api/productos -> lista productos con stock
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const q = url.searchParams.get('q') || ''
  const categoriaId = url.searchParams.get('categoriaId')

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { nombre: { contains: q } },
      { codigo: { contains: q } },
    ]
  }
  if (categoriaId) where.categoriaId = categoriaId

  const productos = await db.producto.findMany({
    where,
    include: { categoria: true, lotes: { where: { cantidadActual: { gt: 0 } } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    productos: productos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion,
      categoriaId: p.categoriaId,
      categoria: p.categoria,
      unidadMedida: p.unidadMedida,
      stockMinimo: p.stockMinimo,
      stockActual: p.stockActual,
      lotesActivos: p.lotes.length,
      createdAt: p.createdAt,
    })),
  })
}

// POST /api/productos -> alta de producto (operador o admin)
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['admin', 'operador'])
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const { codigo, nombre, descripcion, categoriaId, unidadMedida, stockMinimo } = body

    if (!codigo || !nombre) {
      return NextResponse.json({ error: 'Código y nombre son obligatorios' }, { status: 400 })
    }

    const existe = await db.producto.findUnique({ where: { codigo } })
    if (existe) {
      return NextResponse.json({ error: 'El código de producto ya existe' }, { status: 409 })
    }

    const producto = await db.producto.create({
      data: {
        codigo,
        nombre,
        descripcion: descripcion || null,
        categoriaId: categoriaId || null,
        unidadMedida: unidadMedida || 'unidad',
        stockMinimo: Number(stockMinimo) || 0,
        stockActual: 0,
      },
      include: { categoria: true },
    })

    await recalcularAlertas()
    return NextResponse.json({ producto }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
