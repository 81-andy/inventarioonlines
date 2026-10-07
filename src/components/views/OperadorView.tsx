'use client'
import { useState } from 'react'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { Plus, Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Search, Loader2 } from 'lucide-react'

type Producto = {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  categoriaId: string | null
  categoria: { id: string; nombre: string } | null
  unidadMedida: string
  stockMinimo: number
  stockActual: number
  lotesActivos: number
}

type Lote = {
  id: string
  numeroLote: string
  cantidadActual: number
  fechaVencimiento: string
  producto: { id: string; nombre: string; codigo: string }
}

type Alerta = {
  id: string
  tipo: string
  estado: string
  criticidad: string
  diasVencer: number | null
  producto: { codigo: string; nombre: string; stockActual: number; stockMinimo: number }
  lote: { numeroLote: string; fechaVencimiento: string; cantidadActual: number } | null
  fechaGeneracion: string
}

export default function OperadorView({ initialTab = 'stock' }: { initialTab?: string }) {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState(initialTab)

  const { data: productosData, loading: lp, reload: reloadP } = useFetch<{ productos: Producto[] }>(
    `/api/productos?q=${encodeURIComponent(q)}`,
    [q]
  )
  const { data: alertasData, reload: reloadA } = useFetch<{ alertas: Alerta[] }>('/api/alertas')
  const { data: lotesData } = useFetch<{ lotes: Lote[] }>('/api/lotes')

  const productos = productosData?.productos || []
  const alertas = alertasData?.alertas || []
  const lotes = lotesData?.lotes || []

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPI title="Productos totales" value={productos.length} icon={<Package className="w-5 h-5" />} color="emerald" />
        <KPI title="Lotes activos" value={lotes.filter((l) => l.cantidadActual > 0).length} icon={<ArrowDownToLine className="w-5 h-5" />} color="blue" />
        <KPI title="Alertas activas" value={alertas.length} icon={<AlertTriangle className="w-5 h-5" />} color="rose" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="stock">Stock Actual</TabsTrigger>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock actual por producto</CardTitle>
              <CardDescription>Existencias en tiempo real. Las salidas siguen lógica FIFO (primero en vencer).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código o nombre..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <NuevoProductoDialog onCreated={reloadP} />
              </div>
              {lp ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Cargando...
                </div>
              ) : (
                <div className="border rounded-md max-h-[28rem] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Mínimo</TableHead>
                        <TableHead>Lotes</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No hay productos. Crea uno nuevo.
                          </TableCell>
                        </TableRow>
                      ) : (
                        productos.map((p) => {
                          const bajo = p.stockActual <= p.stockMinimo
                          return (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                              <TableCell className="font-medium">{p.nombre}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{p.categoria?.nombre || 'Sin categoría'}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {p.stockActual} {p.unidadMedida}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {p.stockMinimo}
                              </TableCell>
                              <TableCell>{p.lotesActivos}</TableCell>
                              <TableCell>
                                {bajo ? (
                                  <Badge variant="destructive">Stock bajo</Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">OK</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <EntradaDialog producto={p} onDone={() => { reloadP(); reloadA() }} />
                                  <SalidaDialog producto={p} onDone={() => { reloadP(); reloadA() }} />
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="productos">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de productos</CardTitle>
              <CardDescription>Dar de alta y editar productos del catálogo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <NuevoProductoDialog onCreated={reloadP} />
              </div>
              <div className="border rounded-md max-h-[28rem] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Mín</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">{p.descripcion || '—'}</TableCell>
                        <TableCell>{p.unidadMedida}</TableCell>
                        <TableCell className="text-right">{p.stockActual}</TableCell>
                        <TableCell className="text-right">{p.stockMinimo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimientos">
          <MovimientosPanel />
        </TabsContent>

        <TabsContent value="alertas" className="space-y-4">
          <AlertasPanel alertas={alertas} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function KPI({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function NuevoProductoDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { data: catData } = useFetch<{ categorias: { id: string; nombre: string }[] }>('/api/categorias')
  const categorias = catData?.categorias || []

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const body = {
      codigo: fd.get('codigo'),
      nombre: fd.get('nombre'),
      descripcion: fd.get('descripcion'),
      categoriaId: fd.get('categoriaId') || null,
      unidadMedida: fd.get('unidadMedida') || 'unidad',
      stockMinimo: fd.get('stockMinimo'),
    }
    try {
      await apiPost('/api/productos', body)
      toast.success('Producto creado correctamente')
      setOpen(false)
      onCreated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nuevo Producto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Alta de producto</DialogTitle>
          <DialogDescription>Completa los datos. El código debe ser único e inmutable.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" name="codigo" required placeholder="P-X001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" required placeholder="Nombre del producto" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" name="descripcion" placeholder="Opcional" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="categoriaId">Categoría</Label>
              <Select name="categoriaId">
                <SelectTrigger id="categoriaId">
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidadMedida">Unidad</Label>
              <Input id="unidadMedida" name="unidadMedida" defaultValue="unidad" placeholder="kg, L, unidad" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockMinimo">Stock mínimo</Label>
              <Input id="stockMinimo" name="stockMinimo" type="number" min={0} defaultValue={0} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EntradaDialog({ producto, onDone }: { producto: Producto; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [conLoteNuevo, setConLoteNuevo] = useState(true)
  // Solo cargar lotes si el dialog está abierto (evita N requests innecesarios)
  const { data: lotesData, loading: ll } = useFetch<{ lotes: Lote[] }>(
    open ? `/api/lotes?productoId=${producto.id}` : '',
    []
  )
  const lotes = (lotesData?.lotes || []).filter((l) => l.cantidadActual > 0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const body = {
      productoId: producto.id,
      tipo: 'entrada',
      cantidad: Number(fd.get('cantidad')),
      motivo: fd.get('motivo'),
      loteId: !conLoteNuevo ? fd.get('loteId') : null,
      numeroLote: conLoteNuevo ? fd.get('numeroLote') : null,
      fechaVencimiento: conLoteNuevo ? fd.get('fechaVencimiento') : null,
    }
    try {
      await apiPost('/api/movimientos', body)
      toast.success('Entrada registrada')
      setOpen(false)
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" title="Registrar entrada">
          <ArrowDownToLine className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar entrada — {producto.nombre}</DialogTitle>
          <DialogDescription>Stock actual: {producto.stockActual} {producto.unidadMedida}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              className={`flex-1 px-3 py-2 rounded-md border ${conLoteNuevo ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white'}`}
              onClick={() => setConLoteNuevo(true)}
            >
              Crear nuevo lote
            </button>
            <button
              type="button"
              className={`flex-1 px-3 py-2 rounded-md border ${!conLoteNuevo ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white'}`}
              onClick={() => setConLoteNuevo(false)}
              disabled={lotes.length === 0}
            >
              Sumar a lote existente {lotes.length === 0 ? '(sin lotes)' : `(${lotes.length})`}
            </button>
          </div>

          {!conLoteNuevo ? (
            <div className="space-y-2">
              <Label>Lote destino</Label>
              <Select name="loteId">
                <SelectTrigger><SelectValue placeholder="Selecciona un lote" /></SelectTrigger>
                <SelectContent>
                  {lotes.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.numeroLote} — stock: {l.cantidadActual} — vence: {new Date(l.fechaVencimiento).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="numeroLote">Nº de lote</Label>
                <Input id="numeroLote" name="numeroLote" required placeholder={`L-${producto.codigo}-${Date.now().toString().slice(-4)}`} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaVencimiento">Vencimiento</Label>
                <Input id="fechaVencimiento" name="fechaVencimiento" type="date" required />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad a ingresar</Label>
            <Input id="cantidad" name="cantidad" type="number" min={1} required defaultValue={1} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Input id="motivo" name="motivo" placeholder="Compra, devolución, ajuste..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || ll}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Registrar entrada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SalidaDialog({ producto, onDone }: { producto: Producto; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const body = {
      productoId: producto.id,
      tipo: 'salida',
      cantidad: Number(fd.get('cantidad')),
      motivo: fd.get('motivo'),
    }
    try {
      await apiPost('/api/movimientos', body)
      toast.success('Salida registrada (FIFO aplicado)')
      setOpen(false)
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" title="Registrar salida">
          <ArrowUpFromLine className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar salida — {producto.nombre}</DialogTitle>
          <DialogDescription>
            Stock disponible: {producto.stockActual} {producto.unidadMedida}. Se consumirá por FIFO (lotes más próximos a vencer).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad a retirar</Label>
            <Input id="cantidad" name="cantidad" type="number" min={1} max={producto.stockActual} required defaultValue={1} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Input id="motivo" name="motivo" placeholder="Venta, consumo, ajuste..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Registrar salida
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MovimientosPanel() {
  const { data, loading } = useFetch<{ movimientos: any[] }>('/api/movimientos?limit=100')
  const movs = data?.movimientos || []
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de movimientos</CardTitle>
        <CardDescription>Últimos 100 movimientos registrados.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="border rounded-md max-h-[28rem] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white">
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No hay movimientos registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  movs.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(m.fecha).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {m.tipo === 'entrada' ? (
                          <Badge className="bg-emerald-100 text-emerald-700">Entrada</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700">Salida</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{m.producto.nombre}</span>
                        <span className="text-xs text-muted-foreground ml-1">({m.producto.codigo})</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{m.lote?.numeroLote || '—'}</TableCell>
                      <TableCell className="text-right font-semibold">{m.cantidad}</TableCell>
                      <TableCell className="text-muted-foreground">{m.motivo || '—'}</TableCell>
                      <TableCell className="text-xs">{m.usuario?.name || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AlertasPanel({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="font-medium">No hay alertas activas</p>
          <p className="text-sm text-muted-foreground">Todo el inventario está en estado saludable.</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Panel de alertas</CardTitle>
        <CardDescription>Alertas generadas automáticamente tras cada movimiento. Ordenadas por criticidad.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md max-h-[28rem] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white">
              <TableRow>
                <TableHead>Criticidad</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead>Generada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Badge variant={a.criticidad === 'alta' ? 'destructive' : 'secondary'}>
                      {a.criticidad}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{a.tipo.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <span className="font-medium">{a.producto.nombre}</span>
                    <span className="text-xs text-muted-foreground ml-1">({a.producto.codigo})</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.tipo === 'stock_bajo' ? (
                      `Actual: ${a.producto.stockActual} | Mínimo: ${a.producto.stockMinimo}`
                    ) : (
                      `Lote ${a.lote?.numeroLote} — vence en ${a.diasVencer} días (${new Date(a.lote?.fechaVencimiento || '').toLocaleDateString()})`
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(a.fechaGeneracion).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
