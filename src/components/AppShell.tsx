'use client'
import { useState, useEffect, type ReactNode } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Package, LogOut, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavItem = {
  key: string
  label: string
  icon: ReactNode
}

export default function AppShell({
  navItems,
  active,
  onChange,
  children,
}: {
  navItems: NavItem[]
  active: string
  onChange: (k: string) => void
  children: ReactNode
}) {
  const user = useApp((s) => s.user)
  const logout = useApp((s) => s.logout)
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!user) return null

  const roleColor: Record<string, string> = {
    admin: 'bg-rose-100 text-rose-700 border-rose-200',
    operador: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    supervisor: 'bg-amber-100 text-amber-700 border-amber-200',
  }

  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-md hover:bg-muted"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menú"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Package className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-semibold leading-tight">Inventario Real-Time</h1>
              <p className="text-xs text-muted-foreground">Sistema de gestión multi-rol</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={cn('capitalize', roleColor[user.role] || '')}>
              {user.role}
            </Badge>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-sm">
              <p className="font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex w-60 flex-col border-r bg-white">
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onChange(item.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  active === item.key
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-3 border-t text-[10px] text-muted-foreground">
            v1.0 · Inventario RT
          </div>
        </aside>

        {/* Sidebar mobile */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)}>
            <aside
              className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r pt-16 pb-4"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="p-3 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      onChange(item.key)
                      setMobileOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                      active === item.key
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
