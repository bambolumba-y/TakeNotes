import { useEffect, useState } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { devicesService } from '../services/devices.service'
import { useAuthStore } from '../store/auth'

export function usePushNotifications() {
  const session = useAuthStore((s) => s.session)
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined')
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    registerForPush()
  }, [session])

  async function registerForPush() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    setPermissionStatus(existingStatus)

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      setPermissionStatus(status)
      if (status !== 'granted') return
    }

    const tokenData = await Notifications.getExpoPushTokenAsync()
    const expoPushToken = tokenData.data
    setToken(expoPushToken)

    const platform = Platform.OS === 'ios' ? 'ios' : 'android'
    try {
      await devicesService.registerPushToken(expoPushToken, platform)
    } catch (err) {
      console.warn('[Push] Failed to register token:', err)
    }
  }

  return { permissionStatus, token, registerForPush }
}
