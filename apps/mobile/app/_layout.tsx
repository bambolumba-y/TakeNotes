import React, { useEffect } from 'react'
import { Stack, router, useSegments, usePathname } from 'expo-router'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { StatusBar } from 'expo-status-bar'
import { useTheme } from '@/theme/useTheme'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'
import * as Notifications from 'expo-notifications'
import * as Linking from 'expo-linking'
import { initSentry } from '@/lib/sentry'
import { useI18n } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import { useProfileStore } from '@/store/profile'

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

/**
 * Returns true if the URL has no meaningful path component.
 * Handles: takenotes://, takenotes:///, empty string, null.
 */
function isEmptyDeepLink(url: string | null | undefined): boolean {
  if (!url) return true
  try {
    const parsed = Linking.parse(url)
    // No path, or path is empty / just slashes
    if (!parsed.path || parsed.path.replace(/\//g, '').length === 0) return true
  } catch {
    return true
  }
  return false
}

function RootLayoutInner() {
  const theme = useTheme()
  const { session, isLoading, setSession } = useAuthStore()
  const segments = useSegments()
  const pathname = usePathname()
  const profile = useProfileStore((s) => s.profile)
  const fetchProfile = useProfileStore((s) => s.fetch)

  // Sync profile locale into i18n store when profile loads
  useEffect(() => {
    if (profile?.locale) {
      useI18n.getState().setLocale(profile.locale as Locale)
    }
  }, [profile?.locale])

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

  // Fetch profile once authenticated
  useEffect(() => {
    if (session) {
      fetchProfile()
    }
  }, [session])

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inTabsGroup = segments[0] === '(tabs)'

    // Guard: if no session and not already in auth group, redirect to sign-in
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
      return
    }

    // Guard: if session and in auth group, redirect to notes
    if (session && inAuthGroup) {
      router.replace('/(tabs)/notes')
      return
    }

    // Guard: if authenticated and on an empty/root path, redirect to notes
    if (session && !inTabsGroup && !inAuthGroup && segments.length === 0) {
      router.replace('/(tabs)/notes')
    }
  }, [session, isLoading, segments, pathname])

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
      // Normalize: ignore empty or scheme-only deep links
      if (isEmptyDeepLink(event.url)) return

      const { path } = Linking.parse(event.url)
      if (!path) return

      // path looks like "reminders/some-uuid"
      const match = path.match(/^reminders\/([a-zA-Z0-9-]+)$/)
      if (match) {
        router.push(`/reminders/${match[1]}`)
      }
      // For unrecognized paths, do nothing — +not-found.tsx will handle them
    }

    // Handle the initial URL if the app was cold-started from a deep link
    Linking.getInitialURL().then((url) => {
      // Skip empty / scheme-only URLs (e.g. takenotes://, takenotes:///)
      if (!isEmptyDeepLink(url)) {
        handleUrl({ url: url! })
      }
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
