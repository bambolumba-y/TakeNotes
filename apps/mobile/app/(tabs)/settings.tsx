import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/useTheme'
import { useAuthStore } from '@/store/auth'
import { useProfileStore } from '@/store/profile'
import { SettingsRow } from '@/components/ui/SettingsRow'
import { ThemeMode } from '@takenotes/shared'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { channelsService } from '@/services/channels.service'
import type { TelegramStatus } from '@/services/channels.service'

type SectionProps = { title: string; children: React.ReactNode }
function Section({ title, children }: SectionProps) {
  const theme = useTheme()
  return (
    <View style={styles.section}>
      <Text style={[theme.typography.captionStrong, { color: theme.colors.text.tertiary, marginBottom: 6, paddingHorizontal: 4 }]}>
        {title.toUpperCase()}
      </Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.default }]}>
        {children}
      </View>
    </View>
  )
}

const APPEARANCE_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: ThemeMode.System },
  { label: 'Light', value: ThemeMode.Light },
  { label: 'Dark', value: ThemeMode.Dark },
]

export default function SettingsScreen() {
  const theme = useTheme()
  const signOut = useAuthStore((s) => s.signOut)
  const profile = useProfileStore((s) => s.profile)
  const updateProfile = useProfileStore((s) => s.update)
  const fetchProfile = useProfileStore((s) => s.fetch)
  const { permissionStatus, token, registerForPush } = usePushNotifications()
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null)
  const [telegramLoading, setTelegramLoading] = useState(false)

  useEffect(() => { fetchProfile(); loadTelegramStatus() }, [])

  const loadTelegramStatus = async () => {
    try {
      const status = await channelsService.telegramStatus()
      setTelegramStatus(status)
    } catch { /* not critical */ }
  }

  const handleAppearanceChange = async (mode: ThemeMode) => {
    theme.setMode(mode)
    try { await updateProfile({ appearanceMode: mode }) } catch { /* local change applied */ }
  }

  const handleTelegramConnect = async () => {
    setTelegramLoading(true)
    try {
      const data = await channelsService.telegramConnect()
      Alert.alert(
        'Connect Telegram',
        data.instructions,
        [
          { text: 'Open Telegram', onPress: () => Linking.openURL(data.botLink) },
          { text: 'Done', onPress: loadTelegramStatus },
        ],
      )
    } catch (e) {
      Alert.alert('Error', 'Failed to initiate Telegram connection')
    } finally {
      setTelegramLoading(false)
    }
  }

  const handleTelegramDisconnect = () => {
    Alert.alert('Disconnect Telegram', 'You will no longer receive Telegram reminders.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect', style: 'destructive', onPress: async () => {
          try { await channelsService.telegramDisconnect(); setTelegramStatus({ connected: false, connection: null }) }
          catch { Alert.alert('Error', 'Failed to disconnect') }
        },
      },
    ])
  }

  const pushLabel = permissionStatus === 'granted'
    ? token ? 'Active' : 'Registered'
    : permissionStatus === 'denied' ? 'Permission denied' : 'Not enabled'

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[theme.typography.title1, { color: theme.colors.text.primary, paddingHorizontal: 20, marginBottom: 24 }]}>
          Settings
        </Text>

        <Section title="Appearance">
          {APPEARANCE_OPTIONS.map((opt) => (
            <SettingsRow
              key={opt.value}
              label={opt.label}
              onPress={() => handleAppearanceChange(opt.value)}
              trailing={theme.mode === opt.value ? <Text style={{ color: theme.colors.accent.primary, fontSize: 18 }}>✓</Text> : null}
            />
          ))}
        </Section>

        <Section title="Notification Channels">
          <SettingsRow
            label="Push Notifications"
            value={pushLabel}
            onPress={permissionStatus !== 'granted' ? registerForPush : undefined}
            trailing={
              permissionStatus === 'granted'
                ? <Text style={{ color: theme.colors.status.success }}>●</Text>
                : <Text style={{ color: theme.colors.text.tertiary }}>○</Text>
            }
          />
          <SettingsRow
            label="Email"
            value={profile?.email ?? '—'}
          />
          <SettingsRow
            label="Telegram"
            value={telegramStatus?.connected ? `@${telegramStatus.connection?.username ?? 'Connected'}` : 'Not connected'}
            onPress={telegramStatus?.connected ? handleTelegramDisconnect : handleTelegramConnect}
            trailing={
              telegramStatus?.connected
                ? <Text style={{ color: theme.colors.status.success }}>●</Text>
                : <Text style={{ color: theme.colors.text.tertiary }}>○</Text>
            }
          />
        </Section>

        <Section title="Account">
          <SettingsRow label="Email" value={profile?.email ?? '—'} />
          <SettingsRow label="Display Name" value={profile?.displayName ?? '—'} />
          <SettingsRow label="Timezone" value={profile?.timezone ?? '—'} />
          <SettingsRow label="Locale" value={profile?.locale ?? '—'} />
          <SettingsRow label="Sign Out" onPress={signOut} destructive />
        </Section>

        <Section title="About">
          <SettingsRow label="TakeNotes" value="v1.0.0" />
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 100 },
  section: { marginBottom: 24, paddingHorizontal: 16 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
})
