'use client'
import { useState } from 'react'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useFetch, apiPost, apiPut, apiDelete } from '@/lib/use-fetch'
import { UserPlus, Settings, FolderPlus, Loader2, Trash2, Check, X } from 'lucide-react'

type Usuario = {
  id: string; email: string; name: string; role: string; active: boolean; createdAt: string
}
type Categoria = { id: string; nombre: string; totalProductos: number }
type Parametro = { id: string; clave: string; valor: string }

export default function AdminView({ initialTab = 'usuarios' }: { initialTab?: string }) {
  const [tab, setTab] = useState(initialTab)
  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full sm:w-auto">
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="parametros">Parámetros</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios"><UsuariosTab /></TabsContent>
        <TabsContent value="categorias"><CategoriasTab /></TabsContent>
        <TabsContent value="parametros"><ParametrosTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function UsuariosTab() {
  const { data, loading, reload } = useFetch<{ usuarios: Usuario[] }>('/api/usuarios')
  const usuarios = data?.usuarios || []

  async function toggleActive(u: Usuario) {
    try {
      await apiPut(`/api/usuarios/${u.id}`, { active: !u.active })
      toast.success(`Usuario ${!u.active ? 'activado' : 'desactivado'}`)
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    }
  }

  async function cambiarRol(u: Usuario, rol: string) {
    try {
      await apiPut(`/api/usuarios/${u.id}`, { role: rol })
      toast.success('Rol actualizado')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    }
  }

  const roleBadge: Record<string, string> = {
    admin: 'bg-rose-100 text-rose-700 border-rose-200',
    operador: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    supervisor: 'bg-amber-100 text-amber-700 border-amber-200',
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Gestión de usuarios</CardTitle>
          <CardDescription>Da de alta, desactiva o cambia el rol de operadores y supervisores.</CardDescription>
        </div>
        <NuevoUsuarioDialog onCreated={reload} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="border rounded-md max-h-[32rem] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay usuarios.
                    </TableCell>
                  </TableRow>
                ) : (
                  usuarios.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(v) => cambiarRol(u, v)}>
                          <SelectTrigger className="w-32 h-7 text-xs">
                            <Badge variant="outline" className={roleBadge[u.role]}>
                              {u.role}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="operador">Operador</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {u.active ? (
                          <Badge className="bg-emerald-100 text-emerald-700">Activo</Badge>
                        ) : (
                          <Badge variant="destructive">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={u.active ? 'outline' : 'default'}
                          onClick={() => toggleActive(u)}
                        >
                          {u.active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </TableCell>
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

function NuevoUsuarioDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      await apiPost('/api/usuarios', {
        email: fd.get('email'),
        name: fd.get('name'),
        password: fd.get('password'),
        role: fd.get('role'),
      })
      toast.success('Usuario creado')
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
        <Button size="sm"><UserPlus className="w-4 h-4 mr-1" /> Nuevo Usuario</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear nuevo usuario</DialogTitle>
          <DialogDescription>Asigna un rol de administrador, operador o supervisor.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select name="role" defaultValue="operador">
              <SelectTrigger id="role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Crear usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CategoriasTab() {
  const { data, loading, reload } = useFetch<{ categorias: Categoria[] }>('/api/categorias')
  const categorias = data?.categorias || []
  const [nuevoNombre, setNuevoNombre] = useState('')

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevoNombre.trim()) return
    try {
      await apiPost('/api/categorias', { nombre: nuevoNombre.trim() })
      toast.success('Categoría creada')
      setNuevoNombre('')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorías de productos</CardTitle>
        <CardDescription>Define el catálogo de categorías que el operador puede asignar a los productos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={crear} className="flex gap-2 max-w-md">
          <Input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nombre de la nueva categoría"
            required
          />
          <Button type="submit"><FolderPlus className="w-4 h-4 mr-1" /> Agregar</Button>
        </form>
        {loading ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {categorias.map((c) => (
              <div key={c.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground">{c.totalProductos} productos</p>
                </div>
              </div>
            ))}
            {categorias.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                No hay categorías todavía.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ParametrosTab() {
  const { data, loading, reload } = useFetch<{ parametros: Parametro[] }>('/api/parametros')
  const [editando, setEditando] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const params = data?.parametros || []

  async function guardar(clave: string) {
    setSaving(clave)
    try {
      await apiPut('/api/parametros', { clave, valor: editando[clave] })
      toast.success('Parámetro actualizado')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(null)
    }
  }

  const labels: Record<string, string> = {
    dias_vencimiento: 'Días para alerta de vencimiento próximo',
    dias_critico: 'Días para alerta crítica de vencimiento',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parámetros del sistema</CardTitle>
        <CardDescription>
          Configura los umbrales globales. Solo el administrador puede modificar estos valores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-3 max-w-xl">
            {params.map((p) => (
              <div key={p.id} className="flex items-end gap-3 border-b pb-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-sm font-medium">{labels[p.clave] || p.clave}</Label>
                  <Input
                    type="number"
                    value={editando[p.clave] ?? p.valor}
                    onChange={(e) => setEditando({ ...editando, [p.clave]: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Clave: <code>{p.clave}</code> · valor actual: {p.valor}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => guardar(p.clave)}
                  disabled={saving === p.clave || editando[p.clave] === undefined || editando[p.clave] === p.valor}
                >
                  {saving === p.clave ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
