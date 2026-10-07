'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useApp } from '@/lib/store'
import { Package, Loader2 } from 'lucide-react'

export default function LoginView() {
  const setUser = useApp((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [seeded, setSeeded] = useState(false)

  // Si la DB está vacía, ofrece sembrar datos demo
  useEffect(() => {
    fetch('/api/seed', { method: 'POST' })
      .then(() => setSeeded(true))
      .catch(() => setSeeded(true))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await r.json()
      if (!r.ok) {
        toast.error(data.error || 'Error al iniciar sesión')
        return
      }
      toast.success(`Bienvenido, ${data.user.name}`)
      setUser(data.user)
    } catch {
      toast.error('Error de red')
    } finally {
      setLoading(false)
    }
  }

  function quickLogin(email: string, pass: string) {
    setEmail(email)
    setPassword(pass)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg">
            <Package className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sistema de Inventario</h1>
            <p className="text-sm text-muted-foreground">Gestión en tiempo real · Multi-rol</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>Ingresa con tu correo y contraseña</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@inventario.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validando...
                  </>
                ) : (
                  'Ingresar'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t space-y-2">
              <p className="text-xs text-muted-foreground text-center mb-2">
                Accesos rápidos de demostración:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => quickLogin('admin@inventario.com', 'admin123')}
                >
                  Admin
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => quickLogin('operador@inventario.com', 'operador123')}
                >
                  Operador
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => quickLogin('supervisor@inventario.com', 'supervisor123')}
                >
                  Supervisor
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                {seeded ? 'Datos demo listos' : 'Inicializando datos demo...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
