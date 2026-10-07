import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// POST /api/seed -> inicializa datos demo (solo si la DB está vacía de productos)
export async function POST(req: NextRequest) {
  const adminToken = req.cookies.get('inv_token')?.value
  // Permitir sin auth pero solo si no hay datos aún
  const yaHay = await db.producto.count()
  if (yaHay > 0) {
    return NextResponse.json({ ok: true, mensaje: 'Ya existen productos, no se siembra' })
  }

  // Asegura usuarios
  if ((await db.user.count()) === 0) {
    await db.user.createMany({
      data: [
        {
          email: 'admin@inventario.com',
          name: 'Administrador',
          passwordHash: await hashPassword('admin123'),
          role: 'admin',
        },
        {
          email: 'operador@inventario.com',
          name: 'Operador Demo',
          passwordHash: await hashPassword('operador123'),
          role: 'operador',
        },
        {
          email: 'supervisor@inventario.com',
          name: 'Supervisor Demo',
          passwordHash: await hashPassword('supervisor123'),
          role: 'supervisor',
        },
      ],
    })
  }

  // Asegura categorías
  if ((await db.categoria.count()) === 0) {
    await db.categoria.createMany({
      data: [
        { nombre: 'Alimentos' },
        { nombre: 'Medicamentos' },
        { nombre: 'Limpieza' },
        { nombre: 'Oficina' },
        { nombre: 'Otros' },
      ],
    })
  }

  if ((await db.parametro.count()) === 0) {
    await db.parametro.createMany({
      data: [
        { clave: 'dias_vencimiento', valor: '30' },
        { clave: 'dias_critico', valor: '7' },
      ],
    })
  }

  const categorias = await db.categoria.findMany()
  const op = await db.user.findFirst({ where: { role: 'operador' } })
  const opId = op?.id

  // Productos demo
  const demo = [
    { codigo: 'P-A001', nombre: 'Arroz Blanco 1kg', descripcion: 'Bolsa 1kg', categoria: 'Alimentos', unidad: 'kg', min: 20 },
    { codigo: 'P-A002', nombre: 'Aceite Vegetal 1L', descripcion: 'Botella 1L', categoria: 'Alimentos', unidad: 'L', min: 15 },
    { codigo: 'P-M001', nombre: 'Paracetamol 500mg', descripcion: 'Caja 20 comprimidos', categoria: 'Medicamentos', unidad: 'caja', min: 30 },
    { codigo: 'P-M002', nombre: 'Ibuprofeno 400mg', descripcion: 'Caja 30 comprimidos', categoria: 'Medicamentos', unidad: 'caja', min: 25 },
    { codigo: 'P-L001', nombre: 'Jabón Líquido Manos', descripcion: 'Botella 500ml', categoria: 'Limpieza', unidad: 'unidad', min: 10 },
    { codigo: 'P-O001', nombre: 'Resma Papel A4', descripcion: 'Paquete 500 hojas', categoria: 'Oficina', unidad: 'paquete', min: 12 },
    { codigo: 'P-O002', nombre: 'Bolígrafo Azul', descripcion: 'Caja 50 unidades', categoria: 'Oficina', unidad: 'caja', min: 8 },
    { codigo: 'P-A003', nombre: 'Leche Entera 1L', descripcion: 'Tetra brick', categoria: 'Alimentos', unidad: 'L', min: 25 },
  ]

  for (const d of demo) {
    const cat = categorias.find((c) => c.nombre === d.categoria)
    const producto = await db.producto.create({
      data: {
        codigo: d.codigo,
        nombre: d.nombre,
        descripcion: d.descripcion,
        categoriaId: cat?.id,
        unidadMedida: d.unidad,
        stockMinimo: d.min,
        stockActual: 0,
      },
    })

    // Crear 1-2 lotes por producto con vencimientos variados
    const hoy = new Date()
    const lotesData = [
      { num: `${d.codigo}-L1`, cant: Math.floor(Math.random() * 50) + 20, diasVenc: Math.floor(Math.random() * 200) + 5 },
      { num: `${d.codigo}-L2`, cant: Math.floor(Math.random() * 30) + 5, diasVenc: Math.floor(Math.random() * 60) + 5 },
    ]

    for (const l of lotesData) {
      const fV = new Date(hoy.getTime() + l.diasVenc * 24 * 60 * 60 * 1000)
      const lote = await db.lote.create({
        data: {
          productoId: producto.id,
          numeroLote: l.num,
          cantidadInicial: l.cant,
          cantidadActual: l.cant,
          fechaVencimiento: fV,
        },
      })
      await db.producto.update({
        where: { id: producto.id },
        data: { stockActual: { increment: l.cant } },
      })
      await db.movimiento.create({
        data: {
          loteId: lote.id,
          productoId: producto.id,
          tipo: 'entrada',
          cantidad: l.cant,
          motivo: 'Carga inicial demo',
          usuarioId: opId,
        },
      })
    }
  }

  // Crear algunas salidas para tener historial
  const productos = await db.producto.findMany({ include: { lotes: { where: { cantidadActual: { gt: 0 } } } } })
  for (const p of productos) {
    const lotes = p.lotes.sort((a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime())
    if (lotes.length === 0) continue
    const sacar = Math.min(Math.floor(p.stockActual / 3), lotes[0].cantidadActual)
    if (sacar > 0) {
      await db.lote.update({
        where: { id: lotes[0].id },
        data: { cantidadActual: { decrement: sacar } },
      })
      await db.producto.update({
        where: { id: p.id },
        data: { stockActual: { decrement: sacar } },
      })
      await db.movimiento.create({
        data: {
          loteId: lotes[0].id,
          productoId: p.id,
          tipo: 'salida',
          cantidad: sacar,
          motivo: 'Consumo demo',
          usuarioId: opId,
        },
      })
    }
  }

  // Recalcular alertas
  const { recalcularAlertas } = await import('@/lib/alertas')
  await recalcularAlertas()

  // Crear un producto con stock bajo para mostrar alerta
  const prodBajo = await db.producto.create({
    data: {
      codigo: 'P-A099',
      nombre: 'Sal Fina 500g',
      descripcion: 'Bajo stock demo',
      categoriaId: categorias.find((c) => c.nombre === 'Alimentos')?.id,
      unidadMedida: 'g',
      stockMinimo: 50,
      stockActual: 30,
    },
  })
  const loteBajo = await db.lote.create({
    data: {
      productoId: prodBajo.id,
      numeroLote: 'P-A099-L1',
      cantidadInicial: 30,
      cantidadActual: 30,
      fechaVencimiento: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
    },
  })
  await db.movimiento.create({
    data: {
      loteId: loteBajo.id,
      productoId: prodBajo.id,
      tipo: 'entrada',
      cantidad: 30,
      motivo: 'Lote bajo stock demo',
      usuarioId: opId,
    },
  })

  await recalcularAlertas()

  return NextResponse.json({ ok: true, mensaje: 'Datos demo sembrados correctamente' })
}
