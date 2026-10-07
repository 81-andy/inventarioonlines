'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import LoginView from '@/components/views/LoginView'
import OperadorView from '@/components/views/OperadorView'
import SupervisorView from '@/components/views/SupervisorView'
import AdminView from '@/components/views/AdminView'
import AppShell, { type NavItem } from '@/components/AppShell'
import { Loader2, Package, AlertTriangle, BarChart3, Users, Settings, FolderTree } from 'lucide-react'

export default function Home() {
  const user = useApp((s) => s.user)
  const setUser = useApp((s) => s.setUser)
  const loadingAuth = useApp((s) => s.loadingAuth)
  const [active, setActive] = useState('dashboard')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user)
        else useApp.setState({ loadingAuth: false })
      })
      .catch(() => useApp.setState({ loadingAuth: false }))
  }, [setUser])

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!user) return <LoginView />

  let navItems: NavItem[] = []
  let content: React.ReactNode = null

  if (user.role === 'operador') {
    navItems = [
      { key: 'dashboard', label: 'Stock & Movimientos', icon: <Package className="w-4 h-4" /> },
      { key: 'alertas', label: 'Alertas', icon: <AlertTriangle className="w-4 h-4" /> },
    ]
    content = <OperadorView initialTab={active === 'alertas' ? 'alertas' : 'stock'} key={active} />
  } else if (user.role === 'supervisor') {
    navItems = [
      { key: 'reportes', label: 'Reportes y Gráficos', icon: <BarChart3 className="w-4 h-4" /> },
    ]
    content = <SupervisorView />
  } else if (user.role === 'admin') {
    navItems = [
      { key: 'dashboard', label: 'Panel Admin', icon: <Settings className="w-4 h-4" /> },
      { key: 'usuarios', label: 'Usuarios', icon: <Users className="w-4 h-4" /> },
      { key: 'categorias', label: 'Categorías', icon: <FolderTree className="w-4 h-4" /> },
      { key: 'parametros', label: 'Parámetros', icon: <Settings className="w-4 h-4" /> },
    ]
    const tabMap: Record<string, string> = {
      dashboard: 'usuarios',
      usuarios: 'usuarios',
      categorias: 'categorias',
      parametros: 'parametros',
    }
    content = <AdminView initialTab={tabMap[active] || 'usuarios'} key={active} />
  }

  return (
    <AppShell navItems={navItems} active={active} onChange={setActive}>
      {content}
    </AppShell>
  )
}
