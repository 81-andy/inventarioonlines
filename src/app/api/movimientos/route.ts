import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'
import { recalcularAlertas } from '@/lib/alertas'

// GET /api/movimientos -> historial con filtros
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const productoId = url.searchParams.get('productoId')
  const tipo = url.searchParams.get('tipo')
  const desde = url.searchParams.get('desde')
  const hasta = url.searchParams.get('hasta')
  const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 500)

  const where: Record<string, unknown> = {}
  if (productoId) where.productoId = productoId
  if (tipo) where.tipo = tipo
  if (desde || hasta) {
    where.fecha = {}
    if (desde) where.fecha.gte = new Date(desde)
    if (hasta) where.fecha.lte = new Date(hasta + 'T23:59:59')
  }

  const movimientos = await db.movimiento.findMany({
    where,
    include: {
      producto: { select: { codigo: true, nombre: true } },
      lote: { select: { numeroLote: true } },
      usuario: { select: { name: true, email: true } },
    },
    orderBy: { fecha: 'desc' },
    take: limit,
  })

  return NextResponse.json({ movimientos })
}

// POST /api/movimientos -> registrar entrada o salida
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response
  if (auth.user.role === 'supervisor') {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { productoId, tipo, cantidad, motivo, loteId, fechaVencimiento, numeroLote } = body

    if (!productoId || !tipo || !cantidad) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const cant = Number(cantidad)
    if (cant <= 0) {
      return NextResponse.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 })
    }

    if (tipo !== 'entrada' && tipo !== 'salida') {
      return NextResponse.json({ error: 'Tipo debe ser entrada o salida' }, { status: 400 })
    }

    const producto = await db.producto.findUnique({ where: { id: productoId } })
    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    if (tipo === 'entrada') {
      // ENTRADA: si se especifica loteId existente, suma; si no, crea nuevo lote
      let loteAsignado: { id: string } | null = null

      await db.$transaction(async (tx) => {
        if (loteId) {
          const l = await tx.lote.findUnique({ where: { id: loteId } })
          if (!l || l.productoId !== productoId) {
            throw new Error('Lote no válido para este producto')
          }
          await tx.lote.update({
            where: { id: loteId },
            data: { cantidadActual: { increment: cant }, cantidadInicial: { increment: cant } },
          })
          loteAsignado = { id: loteId }
        } else {
          // Crear nuevo lote
          if (!fechaVencimiento) {
            throw new Error('Se requiere fecha de vencimiento para crear un nuevo lote')
          }
          const fV = new Date(fechaVencimiento)
          if (fV < new Date()) {
            throw new Error('La fecha de vencimiento no puede ser anterior a hoy')
          }
          const numeroL = numeroLote || `L-${Date.now()}`
          const existeL = await tx.lote.findUnique({
            where: { productoId_numeroLote: { productoId, numeroLote: numeroL } },
          })
          if (existeL) {
            throw new Error('Ya existe un lote con ese número')
          }

          const nuevo = await tx.lote.create({
            data: {
              productoId,
              numeroLote: numeroL,
              cantidadInicial: cant,
              cantidadActual: cant,
              fechaVencimiento: fV,
            },
          })
          loteAsignado = { id: nuevo.id }
        }

        await tx.producto.update({
          where: { id: productoId },
          data: { stockActual: { increment: cant } },
        })

        await tx.movimiento.create({
          data: {
            loteId: loteAsignado!.id,
            productoId,
            tipo: 'entrada',
            cantidad: cant,
            motivo: motivo || 'Entrada de mercadería',
            usuarioId: auth.user.userId,
          },
        })
      })

      await recalcularAlertas()
      return NextResponse.json({ ok: true, loteId: loteAsignado!.id }, { status: 201 })
    }

    // SALIDA: lógica FIFO por vencimiento (primero en vencer, primero en salir)
    if (cant > producto.stockActual) {
      return NextResponse.json(
        { error: `Stock insuficiente. Disponible: ${producto.stockActual}` },
        { status: 400 }
      )
    }

    // Obtiene lotes con stock ordenados por fecha de vencimiento ascendente (FIFO)
    const lotesDisponibles = await db.lote.findMany({
      where: { productoId, cantidadActual: { gt: 0 } },
      orderBy: { fechaVencimiento: 'asc' },
    })

    if (lotesDisponibles.length === 0) {
      return NextResponse.json({ error: 'No hay lotes con stock disponible' }, { status: 400 })
    }

    const stockLotes = lotesDisponibles.reduce((s, l) => s + l.cantidadActual, 0)
    if (cant > stockLotes) {
      return NextResponse.json(
        { error: `Inconsistencia: stock total ${stockLotes} < solicitado ${cant}` },
        { status: 400 }
      )
    }

    // Distribuye la salida entre lotes (FIFO)
    let pendiente = cant
    const movimientosCreados: string[] = []

    await db.$transaction(async (tx) => {
      for (const lote of lotesDisponibles) {
        if (pendiente <= 0) break
        const sacar = Math.min(pendiente, lote.cantidadActual)
        await tx.lote.update({
          where: { id: lote.id },
          data: { cantidadActual: { decrement: sacar } },
        })
        const mov = await tx.movimiento.create({
          data: {
            loteId: lote.id,
            productoId,
            tipo: 'salida',
            cantidad: sacar,
            motivo: motivo || 'Salida de mercadería',
            usuarioId: auth.user.userId,
          },
        })
        movimientosCreados.push(mov.id)
        pendiente -= sacar
      }

      await tx.producto.update({
        where: { id: productoId },
        data: { stockActual: { decrement: cant } },
      })
    })

    await recalcularAlertas()
    return NextResponse.json({ ok: true, movimientos: movimientosCreados }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
