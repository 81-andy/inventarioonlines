'use client'
import { useState } from 'react'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useFetch } from '@/lib/use-fetch'
import { Loader2, AlertTriangle, Package, TrendingUp, Layers, Activity } from 'lucide-react'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

type Reporte = {
  stockPorProducto: { nombre: string; codigo: string; stock: number; stockMinimo: number; categoria: string }[]
  movimientosPorDia: { fecha: string; entradas: number; salidas: number }[]
  distribucionCategoria: { nombre: string; valor: number }[]
  proximosVencimientos: {
    loteId: string; numeroLote: string; producto: string; codigo: string; cantidad: number;
    fechaVencimiento: string; diasParaVencer: number; estado: string
  }[]
  kpis: { totalProductos: number; stockTotal: number; alertasActivas: number; productosBajoStock: number }
  topMovimientos: { nombre: string; codigo: string; totalCantidad: number; totalMovs: number }[]
}

export default function SupervisorView() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const { data, loading, reload } = useFetch<Reporte>(
    `/api/reportes?desde=${desde}&hasta=${hasta}`,
    [desde, hasta]
  )

  const r = data

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Reportes y Visualizaciones</CardTitle>
          <CardDescription>Acceso de solo lectura. Filtra por rango de fechas y explora los gráficos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="space-y-2 flex-1">
              <Label htmlFor="desde">Desde</Label>
              <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="hasta">Hasta</Label>
              <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => { setDesde(''); setHasta('') }}>
              Limpiar filtros
            </Button>
            <Button onClick={reload}>
              <Activity className="w-4 h-4 mr-2" /> Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Productos totales" value={r?.kpis.totalProductos ?? 0} icon={<Package className="w-5 h-5" />} color="emerald" />
        <KPICard title="Stock total (unidades)" value={r?.kpis.stockTotal ?? 0} icon={<Layers className="w-5 h-5" />} color="blue" />
        <KPICard title="Alertas activas" value={r?.kpis.alertasActivas ?? 0} icon={<AlertTriangle className="w-5 h-5" />} color="rose" />
        <KPICard title="Productos bajo stock" value={r?.kpis.productosBajoStock ?? 0} icon={<TrendingUp className="w-5 h-5" />} color="amber" />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-sm text-muted-foreground">Generando reportes...</p>
        </div>
      ) : r ? (
        <>
          {/* Gráficos principales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Barras: stock por producto */}
            <Card>
              <CardHeader>
                <CardTitle>Existencias por producto</CardTitle>
                <CardDescription>Stock actual vs. mínimo configurado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={r.stockPorProducto.slice(0, 12)} margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="nombre" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={70} interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(value: any, name: any) => [value, name === 'stock' ? 'Stock' : 'Mínimo']}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="stock" name="Stock" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="stockMinimo" name="Mínimo" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Torta: distribución por categoría */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución por categoría</CardTitle>
                <CardDescription>Participación de cada categoría en el stock total</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={r.distribucionCategoria}
                        dataKey="valor"
                        nameKey="nombre"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={(e: any) => `${e.nombre} (${e.valor})`}
                        labelLine={false}
                      >
                        {r.distribucionCategoria.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Líneas: movimientos en el tiempo */}
          <Card>
            <CardHeader>
              <CardTitle>Entradas vs. Salidas en el tiempo</CardTitle>
              <CardDescription>Cantidades agregadas por día {desde || hasta ? '(filtrado por rango)' : '(histórico completo)'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={r.movimientosPorDia} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="entradas" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Entradas" />
                    <Line type="monotone" dataKey="salidas" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Salidas" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top movimientos */}
          <Card>
            <CardHeader>
              <CardTitle>Top productos por movimientos</CardTitle>
              <CardDescription>Productos con mayor actividad histórica</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={r.topMovimientos} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="totalCantidad" name="Cantidad total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tabla: próximos vencimientos */}
          <Card>
            <CardHeader>
              <CardTitle>Próximos vencimientos</CardTitle>
              <CardDescription>Lotes con stock disponible ordenados por fecha de vencimiento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.proximosVencimientos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No hay lotes con stock.
                        </TableCell>
                      </TableRow>
                    ) : (
                      r.proximosVencimientos.map((v) => (
                        <TableRow key={v.loteId}>
                          <TableCell className="font-mono text-xs">{v.numeroLote}</TableCell>
                          <TableCell>
                            <span className="font-medium">{v.producto}</span>
                            <span className="text-xs text-muted-foreground ml-1">({v.codigo})</span>
                          </TableCell>
                          <TableCell className="text-right">{v.cantidad}</TableCell>
                          <TableCell>{new Date(v.fechaVencimiento).toLocaleDateString()}</TableCell>
                          <TableCell>{v.diasParaVencer}</TableCell>
                          <TableCell>
                            {v.estado === 'vencido' ? (
                              <Badge variant="destructive">Vencido</Badge>
                            ) : v.estado === 'critico' ? (
                              <Badge className="bg-rose-100 text-rose-700">Crítico</Badge>
                            ) : v.estado === 'proximo' ? (
                              <Badge className="bg-amber-100 text-amber-700">Próximo</Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function KPICard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}
