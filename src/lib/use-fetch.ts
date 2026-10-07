'use client'
import { useEffect, useState, useCallback } from 'react'

export function useFetch<T>(url: string, deps: unknown[] = [], opts?: RequestInit) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const reload = useCallback(() => setRefreshKey((k) => k + 1), [])

  const optsKey = opts ? JSON.stringify(opts) : ''
  const shouldFetch = !!url

  useEffect(() => {
    if (!shouldFetch) return
    let cancel = false
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true)
    fetch(url, opts)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d) => {
        if (!cancel) {
          setData(d)
          setError(null)
        }
      })
      .catch((e) => {
        if (!cancel) setError(e instanceof Error ? e.message : 'Error')
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => {
      cancel = true
    }
  }, [url, refreshKey, optsKey, shouldFetch, ...deps])

  return { data, loading, error, reload, setData }
}

export async function apiPost(url: string, body: unknown) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || 'Error')
  return data
}

export async function apiPut(url: string, body: unknown) {
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || 'Error')
  return data
}

export async function apiDelete(url: string) {
  const r = await fetch(url, { method: 'DELETE' })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || 'Error')
  return data
}
