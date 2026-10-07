import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'

// GET /api/reportes -> datos agregados para gráficos
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const desde = url.searchParams.get('desde')
  const hasta = url.searchParams.get('hasta')

  const fechaWhere: Record<string, unknown> = {}
  if (desde || hasta) {
    if (desde) fechaWhere.gte = new Date(desde)
    if (hasta) fechaWhere.lte = new Date(hasta + 'T23:59:59')
  }

  // 1. Existencias por producto (barras)
  const productos = await db.producto.findMany({
    include: { categoria: true },
    orderBy: { stockActual: 'desc' },
  })

  const stockPorProducto = productos.map((p) => ({
    nombre: p.nombre,
    codigo: p.codigo,
    stock: p.stockActual,
    stockMinimo: p.stockMinimo,
    categoria: p.categoria?.nombre || 'Sin categoría',
  }))

  // 2. Movimientos en el tiempo (líneas)
  const movsWhere: Record<string, unknown> = {}
  if (Object.keys(fechaWhere).length) movsWhere.fecha = fechaWhere

  const movimientos = await db.movimiento.findMany({
    where: movsWhere,
    select: { tipo: true, cantidad: true, fecha: true },
    orderBy: { fecha: 'asc' },
  })

  // Agrupa por día
  const porDia: Record<string, { fecha: string; entradas: number; salidas: number }> = {}
  for (const m of movimientos) {
    const f = m.fecha.toISOString().slice(0, 10)
    if (!porDia[f]) porDia[f] = { fecha: f, entradas: 0, salidas: 0 }
    if (m.tipo === 'entrada') porDia[f].entradas += m.cantidad
    else porDia[f].salidas += m.cantidad
  }
  const movimientosPorDia = Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha))

  // 3. Distribución por categoría (torta)
  const porCategoria: Record<string, number> = {}
  for (const p of productos) {
    const cat = p.categoria?.nombre || 'Sin categoría'
    porCategoria[cat] = (porCategoria[cat] || 0) + p.stockActual
  }
  const distribucionCategoria = Object.entries(porCategoria).map(([nombre, valor]) => ({ nombre, valor }))

  // 4. Próximos vencimientos (tabla)
  const lotesConStock = await db.lote.findMany({
    where: { cantidadActual: { gt: 0 } },
    include: { producto: true },
    orderBy: { fechaVencimiento: 'asc' },
    take: 50,
  })
  const hoy = new Date()
  const proximosVencimientos = lotesConStock.map((l) => {
    const dias = Math.ceil((l.fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    return {
      loteId: l.id,
      numeroLote: l.numeroLote,
      producto: l.producto.nombre,
      codigo: l.producto.codigo,
      cantidad: l.cantidadActual,
      fechaVencimiento: l.fechaVencimiento,
      diasParaVencer: dias,
      estado: dias < 0 ? 'vencido' : dias <= 7 ? 'critico' : dias <= 30 ? 'proximo' : 'ok',
    }
  })

  // 5. KPIs
  const totalProductos = productos.length
  const stockTotal = productos.reduce((s, p) => s + p.stockActual, 0)
  const alertasActivas = await db.alerta.count({ where: { estado: 'activa' } })
  const productosBajoStock = await db.producto.count({
    where: { stockActual: { lte: db.producto.fields.stockMinimo } },
  })

  // 6. Top productos con más movimientos
  const movimientoStats = await db.movimiento.groupBy({
    by: ['productoId'],
    _sum: { cantidad: true },
    _count: true,
    orderBy: { _sum: { cantidad: 'desc' } },
    take: 5,
  })
  const topIds = movimientoStats.map((m) => m.productoId)
  const topProductos = await db.producto.findMany({
    where: { id: { in: topIds } },
    select: { id: true, nombre: true, codigo: true },
  })
  const topMovimientos = movimientoStats.map((m) => {
    const p = topProductos.find((pp) => pp.id === m.productoId)
    return {
      nombre: p?.nombre || '?',
      codigo: p?.codigo || '?',
      totalCantidad: m._sum.cantidad,
      totalMovs: m._count,
    }
  })

  return NextResponse.json({
    stockPorProducto,
    movimientosPorDia,
    distribucionCategoria,
    proximosVencimientos,
    kpis: {
      totalProductos,
      stockTotal,
      alertasActivas,
      productosBajoStock,
    },
    topMovimientos,
  })
}
