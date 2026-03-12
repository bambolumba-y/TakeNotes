import { supabase } from './supabase'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...headers, ...init?.headers } })
  const json = await res.json()
  if (!res.ok) {
    const msg = typeof json?.error === 'object' ? json.error?.message : json?.message ?? json?.error
    throw new Error(msg ?? 'Request failed')
  }
  return json
}
