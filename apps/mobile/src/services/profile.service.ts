import { apiFetch } from '../lib/api'
import type { UserProfile, UpdateProfileInput } from '@takenotes/shared'
import type { ApiResponse } from '@takenotes/shared'

export async function fetchProfile(): Promise<UserProfile> {
  const res = await apiFetch<ApiResponse<UserProfile>>('/me')
  return res.data
}

export async function updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
  const res = await apiFetch<ApiResponse<UserProfile>>('/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return res.data
}
