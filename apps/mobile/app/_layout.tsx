import React, { useEffect } from 'react'
import { Stack, router, useSegments } from 'expo-router'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { StatusBar } from 'expo-status-bar'
import { useTheme } from '@/theme/useTheme'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'
import * as Notifications from 'expo-notifications'
import * as Linking from 'expo-linking'
import { initSentry } from '@/lib/sentry'

// Initialize Sentry before the component tree renders
initSentry()

// Configure how notifications are presented when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

function RootLayoutInner() {
  const theme = useTheme()
  const { session, isLoading, setSession } = useAuthStore()
  const segments = useSegments()

  useEffect(() => {
    // Bootstrap session on app start
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isLoading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/notes')
    }
  }, [session, isLoading, segments])

  useEffect(() => {
    // Handle notification tap responses — navigate to the reminder detail
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>
      const reminderId = data?.reminderId as string | undefined
      if (reminderId) {
        router.push(`/reminders/${reminderId}`)
      }
    })

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    // Handle URL deep links: takenotes://reminders/:id
    function handleUrl(event: { url: string }) {
      const { path } = Linking.parse(event.url)
      if (!path) return
      // path looks like "reminders/some-uuid"
      const match = path.match(/^reminders\/([a-zA-Z0-9-]+)$/)
      if (match) {
        router.push(`/reminders/${match[1]}`)
      }
    }

    // Handle the initial URL if the app was cold-started from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url })
    })

    const linkingSub = Linking.addEventListener('url', handleUrl)
    return () => linkingSub.remove()
  }, [])

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  )
}
