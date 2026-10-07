import { db } from '@/lib/db'

// Recalcula todas las alertas según el estado actual del inventario
export async function recalcularAlertas(): Promise<void> {
  const diasParam = await db.parametro.findUnique({ where: { clave: 'dias_vencimiento' } })
  const diasVenc = diasParam ? parseInt(diasParam.valor, 10) : 30
  const hoy = new Date()
  const fechaCritica = new Date(hoy.getTime() + diasVenc * 24 * 60 * 60 * 1000)

  // 1. ALERTA DE STOCK BAJO
  const productosBajos = await db.producto.findMany({
    where: { stockActual: { lte: db.producto.fields.stockMinimo } },
  })

  // Resuelve alertas de stock bajo que ya no aplican
  await db.alerta.updateMany({
    where: {
      tipo: 'stock_bajo',
      estado: 'activa',
      productoId: { notIn: productosBajos.map((p) => p.id) },
    },
    data: { estado: 'atendida', fechaResolucion: hoy },
  })

  for (const p of productosBajos) {
    // Solo si stock es <= mínimo Y no hay alerta activa ya
    if (p.stockActual <= p.stockMinimo) {
      const existe = await db.alerta.findFirst({
        where: { productoId: p.id, tipo: 'stock_bajo', estado: 'activa' },
      })
      if (!existe) {
        await db.alerta.create({
          data: { tipo: 'stock_bajo', productoId: p.id, estado: 'activa' },
        })
      }
    }
  }

  // 2. ALERTA DE VENCIMIENTO PRÓXIMO
  const lotesProximos = await db.lote.findMany({
    where: {
      cantidadActual: { gt: 0 },
      fechaVencimiento: { lte: fechaCritica, gte: hoy },
    },
  })

  await db.alerta.updateMany({
    where: {
      tipo: 'vencimiento',
      estado: 'activa',
      loteId: { notIn: lotesProximos.map((l) => l.id) },
    },
    data: { estado: 'atendida', fechaResolucion: hoy },
  })

  for (const l of lotesProximos) {
    const existe = await db.alerta.findFirst({
      where: { loteId: l.id, tipo: 'vencimiento', estado: 'activa' },
    })
    if (!existe) {
      await db.alerta.create({
        data: {
          tipo: 'vencimiento',
          productoId: l.productoId,
          loteId: l.id,
          estado: 'activa',
        },
      })
    }
  }

  // Lotes ya vencidos (fechaVencimiento < hoy) con stock restante también generan alerta
  const vencidos = await db.lote.findMany({
    where: {
      cantidadActual: { gt: 0 },
      fechaVencimiento: { lt: hoy },
    },
  })
  for (const l of vencidos) {
    const existe = await db.alerta.findFirst({
      where: { loteId: l.id, tipo: 'vencimiento', estado: 'activa' },
    })
    if (!existe) {
      await db.alerta.create({
        data: {
          tipo: 'vencimiento',
          productoId: l.productoId,
          loteId: l.id,
          estado: 'activa',
        },
      })
    }
  }
}
