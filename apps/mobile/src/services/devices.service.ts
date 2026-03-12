import { apiFetch } from '../lib/api'

export const devicesService = {
  registerPushToken: (token: string, platform: 'ios' | 'android' | 'web') =>
    apiFetch('/devices/register-push-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    }),
  deactivate: (id: string) =>
    apiFetch(`/devices/${id}`, { method: 'DELETE' }),
}
