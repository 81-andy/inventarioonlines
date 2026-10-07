'use client'
import { create } from 'zustand'
import type { JWTPayload } from '@/lib/auth'

type User = JWTPayload

type AppState = {
  user: User | null
  loadingAuth: boolean
  setUser: (u: User | null) => void
  setLoading: (b: boolean) => void
  logout: () => Promise<void>
}

export const useApp = create<AppState>((set, get) => ({
  user: null,
  loadingAuth: true,
  setUser: (u) => set({ user: u, loadingAuth: false }),
  setLoading: (b) => set({ loadingAuth: b }),
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ user: null })
  },
}))

export type { User }
