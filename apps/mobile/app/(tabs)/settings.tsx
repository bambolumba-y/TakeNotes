import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/useTheme'
import { useAuthStore } from '@/store/auth'
import { useProfileStore } from '@/store/profile'
import { SettingsRow } from '@/components/ui/SettingsRow'
import { ThemeMode } from '@takenotes/shared'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { channelsService } from '@/services/channels.service'
import type { TelegramStatus } from '@/services/channels.service'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'

// ─── Common timezone list ───────────────────────────────────────────────────
const TIMEZONES = [
  'UTC',
  'Europe/Moscow',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

// ─── Locale options ─────────────────────────────────────────────────────────
const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Russian' },
]

// ─── Section wrapper ─────────────────────────────────────────────────────────
type SectionProps = { title: string; children: React.ReactNode }
function Section({ title, children }: SectionProps) {
  const theme = useTheme()
  return (
    <View style={styles.section}>
      <Text
        style={[
          theme.typography.captionStrong,
          { color: theme.colors.text.tertiary, marginBottom: 6, paddingHorizontal: 4 },
        ]}
      >
        {title.toUpperCase()}
      </Text>
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.default },
        ]}
      >
        {children}
      </View>
    </View>
  )
}

// ─── Simple edit modal ────────────────────────────────────────────────────────
interface EditModalProps {
  visible: boolean
  title: string
  initialValue: string
  placeholder?: string
  hint?: string
  saving: boolean
  onSave: (value: string) => void
  onClose: () => void
}
function EditModal({
  visible,
  title,
  initialValue,
  placeholder,
  hint,
  saving,
  onSave,
  onClose,
}: EditModalProps) {
  const theme = useTheme()
  const [value, setValue] = useState(initialValue)

  // Sync value when modal opens with a new initialValue
  useEffect(() => {
    if (visible) setValue(initialValue)
  }, [visible, initialValue])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalCard,
            { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.default },
          ]}
        >
          <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: 16 }]}>
            {title}
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: theme.colors.bg.input,
                borderColor: theme.colors.border.default,
                color: theme.colors.text.primary,
                ...theme.typography.body,
              },
            ]}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.text.tertiary}
            autoFocus
          />
          {hint ? (
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.text.tertiary, marginBottom: 16 },
              ]}
            >
              {hint}
            </Text>
          ) : null}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, { borderColor: theme.colors.border.default, borderWidth: 1.5 }]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={[theme.typography.bodyStrong, { color: theme.colors.text.secondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: theme.colors.accent.primary }]}
              onPress={() => onSave(value.trim())}
              disabled={saving || !value.trim()}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[theme.typography.bodyStrong, { color: '#FFFFFF' }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Telegram state type ──────────────────────────────────────────────────────
type TelegramLinkState = 'idle' | 'connecting' | 'waiting' | 'connected' | 'error'

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const theme = useTheme()
  const { t, locale, setLocale } = useI18n()

  const APPEARANCE_OPTIONS: { label: string; value: ThemeMode }[] = [
    { label: t('system'), value: ThemeMode.System },
    { label: t('light'), value: ThemeMode.Light },
    { label: t('dark'), value: ThemeMode.Dark },
  ]
  const signOut = useAuthStore((s) => s.signOut)
  const profile = useProfileStore((s) => s.profile)
  const updateProfile = useProfileStore((s) => s.update)
  const fetchProfile = useProfileStore((s) => s.fetch)
  const { permissionStatus, token, registerForPush } = usePushNotifications()

  // Telegram state
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null)
  const [telegramLinkState, setTelegramLinkState] = useState<TelegramLinkState>('idle')
  const [connectToken, setConnectToken] = useState<string>('')
  const [connectBotLink, setConnectBotLink] = useState<string>('')
  const [connectError, setConnectError] = useState<string>('')
  const telegramPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Edit modal states
  const [nicknameModal, setNicknameModal] = useState(false)
  const [nicknameSaving, setNicknameSaving] = useState(false)

  const [emailModal, setEmailModal] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailHint, setEmailHint] = useState<string>('')

  const [timezoneModal, setTimezoneModal] = useState(false)
  const [timezoneSaving, setTimezoneSaving] = useState(false)

  const [localeModal, setLocaleModal] = useState(false)
  const [localeSaving, setLocaleSaving] = useState(false)

  useEffect(() => {
    fetchProfile()
    loadTelegramStatus()
    return () => stopTelegramPoll()
  }, [])

  // Sync telegram link state from loaded status
  useEffect(() => {
    if (telegramStatus?.connected) {
      setTelegramLinkState('connected')
    }
  }, [telegramStatus])

  const loadTelegramStatus = async () => {
    try {
      const status = await channelsService.telegramStatus()
      setTelegramStatus(status)
    } catch {
      /* not critical */
    }
  }

  // ─── Appearance ─────────────────────────────────────────────────────────────
  const handleAppearanceChange = async (mode: ThemeMode) => {
    theme.setMode(mode)
    try {
      await updateProfile({ appearanceMode: mode })
    } catch {
      /* local change applied */
    }
  }

  // ─── Nickname ────────────────────────────────────────────────────────────────
  const handleNicknameSave = async (value: string) => {
    if (!value) return
    setNicknameSaving(true)
    try {
      await updateProfile({ displayName: value })
      setNicknameModal(false)
    } catch (e) {
      Alert.alert('Error', (e as Error).message || 'Failed to update nickname')
    } finally {
      setNicknameSaving(false)
    }
  }

  // ─── Email ───────────────────────────────────────────────────────────────────
  const handleEmailSave = async (newEmail: string) => {
    if (!newEmail) return
    setEmailSaving(true)
    setEmailHint('')
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw new Error(error.message)
      setEmailHint('A confirmation email has been sent to your new address. Please verify it.')
      // Keep modal open briefly so user sees the message, then close
      setTimeout(() => {
        setEmailModal(false)
        setEmailHint('')
      }, 3000)
    } catch (e) {
      Alert.alert('Error', (e as Error).message || 'Failed to update email')
    } finally {
      setEmailSaving(false)
    }
  }

  // ─── Timezone ────────────────────────────────────────────────────────────────
  const handleTimezoneSave = async (tz: string) => {
    setTimezoneSaving(true)
    try {
      await updateProfile({ timezone: tz })
      setTimezoneModal(false)
    } catch (e) {
      Alert.alert('Error', (e as Error).message || 'Failed to update timezone')
    } finally {
      setTimezoneSaving(false)
    }
  }

  // ─── Locale ──────────────────────────────────────────────────────────────────
  const handleLocaleSave = async (newLocale: Locale) => {
    setLocaleSaving(true)
    try {
      await updateProfile({ locale: newLocale })
      setLocale(newLocale)
      setLocaleModal(false)
    } catch (e) {
      Alert.alert('Error', (e as Error).message || 'Failed to update language')
    } finally {
      setLocaleSaving(false)
    }
  }

  // ─── Telegram ────────────────────────────────────────────────────────────────
  const stopTelegramPoll = () => {
    if (telegramPollRef.current) {
      clearInterval(telegramPollRef.current)
      telegramPollRef.current = null
    }
  }

  const startTelegramPoll = () => {
    stopTelegramPoll()
    telegramPollRef.current = setInterval(async () => {
      try {
        const status = await channelsService.telegramStatus()
        if (status.connected) {
          setTelegramStatus(status)
          setTelegramLinkState('connected')
          stopTelegramPoll()
        }
      } catch {
        /* ignore polling errors */
      }
    }, 3000)
  }

  const handleTelegramConnect = async () => {
    setTelegramLinkState('connecting')
    setConnectError('')
    try {
      const data = await channelsService.telegramConnect()
      setConnectToken(data.verificationToken)
      setConnectBotLink(data.botLink)
      setTelegramLinkState('waiting')
      startTelegramPoll()
    } catch {
      setConnectError(t('failedToConnect'))
      setTelegramLinkState('error')
    }
  }

  const handleTelegramDisconnect = () => {
    Alert.alert('Disconnect Telegram', 'You will no longer receive Telegram reminders.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          try {
            await channelsService.telegramDisconnect()
            setTelegramStatus({ connected: false, connection: null })
            setTelegramLinkState('idle')
            stopTelegramPoll()
          } catch {
            Alert.alert('Error', 'Failed to disconnect')
          }
        },
      },
    ])
  }

  const telegramValueLabel =
    telegramLinkState === 'connected'
      ? `@${telegramStatus?.connection?.username ?? t('connected')}`
      : telegramLinkState === 'waiting'
      ? t('waitingForVerification')
      : telegramLinkState === 'connecting'
      ? t('connecting')
      : t('notConnected')

  const pushLabel =
    permissionStatus === 'granted'
      ? token
        ? t('active')
        : t('registered')
      : permissionStatus === 'denied'
      ? t('permissionDenied')
      : t('notEnabled')

  const currentLocaleLabel = LOCALE_OPTIONS.find((o) => o.value === locale)?.label ?? locale

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text
          style={[
            theme.typography.title1,
            { color: theme.colors.text.primary, paddingHorizontal: 20, marginBottom: 24 },
          ]}
        >
          {t('settings')}
        </Text>

        {/* Appearance */}
        <Section title={t('appearance')}>
          {APPEARANCE_OPTIONS.map((opt) => (
            <SettingsRow
              key={opt.value}
              label={opt.label}
              onPress={() => handleAppearanceChange(opt.value)}
              trailing={
                theme.mode === opt.value ? (
                  <Text style={{ color: theme.colors.accent.primary, fontSize: 18 }}>✓</Text>
                ) : null
              }
            />
          ))}
        </Section>

        {/* Notification channels */}
        <Section title={t('notificationChannels')}>
          <SettingsRow
            label={t('pushNotifications')}
            value={pushLabel}
            onPress={permissionStatus !== 'granted' ? registerForPush : undefined}
            trailing={
              permissionStatus === 'granted' ? (
                <Text style={{ color: theme.colors.status.success }}>●</Text>
              ) : (
                <Text style={{ color: theme.colors.text.tertiary }}>○</Text>
              )
            }
          />
          <SettingsRow label={t('email')} value={profile?.email ?? '—'} />
          <SettingsRow
            label={t('telegram')}
            value={telegramValueLabel}
            onPress={
              telegramLinkState === 'connected'
                ? handleTelegramDisconnect
                : telegramLinkState === 'idle' || telegramLinkState === 'error'
                ? handleTelegramConnect
                : undefined
            }
            trailing={
              telegramLinkState === 'connected' ? (
                <Text style={{ color: theme.colors.status.success }}>●</Text>
              ) : telegramLinkState === 'waiting' ? (
                <ActivityIndicator size="small" color={theme.colors.accent.primary} />
              ) : (
                <Text style={{ color: theme.colors.text.tertiary }}>○</Text>
              )
            }
          />
        </Section>

        {/* Telegram waiting card */}
        {telegramLinkState === 'waiting' && connectToken ? (
          <View
            style={[
              styles.telegramCard,
              {
                backgroundColor: theme.colors.bg.surface,
                borderColor: theme.colors.border.default,
                marginHorizontal: 16,
                marginBottom: 16,
              },
            ]}
          >
            <Text style={[theme.typography.bodyStrong, { color: theme.colors.text.primary, marginBottom: 8 }]}>
              {t('connectTelegram')}
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginBottom: 12 }]}>
              {t('telegramInstructions')
                .replace('{token}', connectToken)
                .replace('{bot}', process.env.EXPO_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'your_bot')}
            </Text>
            <View
              style={[
                styles.tokenBlock,
                { backgroundColor: theme.colors.bg.input, borderColor: theme.colors.border.default },
              ]}
            >
              <Text
                style={[theme.typography.body, { color: theme.colors.text.primary, fontFamily: 'monospace' }]}
                selectable
              >
                {`/start ${connectToken}`}
              </Text>
            </View>
            <Text style={[theme.typography.caption, { color: theme.colors.text.tertiary, marginTop: 8 }]}>
              {t('waitingForVerification')}
            </Text>
            {connectError ? (
              <Text style={[theme.typography.caption, { color: theme.colors.status.error, marginTop: 4 }]}>
                {connectError}
              </Text>
            ) : null}
            <TouchableOpacity
              style={{ marginTop: 12 }}
              onPress={() => Linking.openURL(connectBotLink)}
            >
              <Text style={[theme.typography.bodyStrong, { color: theme.colors.accent.primary }]}>
                Open in Telegram
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 8 }}
              onPress={() => {
                stopTelegramPoll()
                setTelegramLinkState('idle')
              }}
            >
              <Text style={[theme.typography.caption, { color: theme.colors.text.tertiary }]}>
                {t('cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Telegram connection error — visible regardless of state */}
        {connectError && telegramLinkState !== 'waiting' ? (
          <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
            <Text style={[theme.typography.caption, { color: theme.colors.status.error }]}>
              {connectError}
            </Text>
          </View>
        ) : null}

        {/* Account */}
        <Section title={t('account')}>
          <SettingsRow
            label={t('email')}
            value={profile?.email ?? '—'}
            onPress={() => setEmailModal(true)}
          />
          <SettingsRow
            label={t('nickname')}
            value={profile?.displayName ?? '—'}
            onPress={() => setNicknameModal(true)}
          />
          <SettingsRow
            label={t('timezone')}
            value={profile?.timezone ?? '—'}
            onPress={() => setTimezoneModal(true)}
          />
          <SettingsRow
            label={t('language')}
            value={currentLocaleLabel}
            onPress={() => setLocaleModal(true)}
          />
          <SettingsRow label={t('signOut')} onPress={signOut} destructive />
        </Section>

        <Section title={t('about')}>
          <SettingsRow label="TakeNotes" value={`${t('version')} 1.0.0`} />
        </Section>
      </ScrollView>

      {/* Nickname modal */}
      <EditModal
        visible={nicknameModal}
        title={t('nickname')}
        initialValue={profile?.displayName ?? ''}
        placeholder="Your nickname"
        saving={nicknameSaving}
        onSave={handleNicknameSave}
        onClose={() => setNicknameModal(false)}
      />

      {/* Email modal */}
      <EditModal
        visible={emailModal}
        title={t('changeEmail')}
        initialValue={profile?.email ?? ''}
        placeholder="new@example.com"
        hint={emailHint || undefined}
        saving={emailSaving}
        onSave={handleEmailSave}
        onClose={() => { setEmailModal(false); setEmailHint('') }}
      />

      {/* Timezone picker modal */}
      <Modal
        visible={timezoneModal}
        transparent
        animationType="slide"
        onRequestClose={() => setTimezoneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.default },
            ]}
          >
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: 12 }]}>
              {t('timezone')}
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {TIMEZONES.map((tz) => {
                const selected = (profile?.timezone ?? 'UTC') === tz
                return (
                  <TouchableOpacity
                    key={tz}
                    style={[
                      styles.listItem,
                      {
                        borderBottomColor: theme.colors.border.default,
                        backgroundColor: selected ? theme.colors.accent.soft : 'transparent',
                      },
                    ]}
                    onPress={() => handleTimezoneSave(tz)}
                    disabled={timezoneSaving}
                  >
                    <Text
                      style={[
                        theme.typography.body,
                        { color: selected ? theme.colors.accent.primary : theme.colors.text.primary },
                      ]}
                    >
                      {tz}
                    </Text>
                    {selected ? (
                      <Text style={{ color: theme.colors.accent.primary, fontSize: 18 }}>✓</Text>
                    ) : null}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
            {timezoneSaving ? (
              <ActivityIndicator color={theme.colors.accent.primary} style={{ marginTop: 8 }} />
            ) : null}
            <TouchableOpacity
              style={{ marginTop: 12, alignItems: 'center' }}
              onPress={() => setTimezoneModal(false)}
            >
              <Text style={[theme.typography.bodyStrong, { color: theme.colors.text.secondary }]}>
                {t('cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Locale picker modal */}
      <Modal
        visible={localeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setLocaleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.default },
            ]}
          >
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: 12 }]}>
              {t('language')}
            </Text>
            {LOCALE_OPTIONS.map((opt) => {
              const selected = locale === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.listItem,
                    {
                      borderBottomColor: theme.colors.border.default,
                      backgroundColor: selected ? theme.colors.accent.soft : 'transparent',
                    },
                  ]}
                  onPress={() => handleLocaleSave(opt.value)}
                  disabled={localeSaving}
                >
                  <Text
                    style={[
                      theme.typography.body,
                      { color: selected ? theme.colors.accent.primary : theme.colors.text.primary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selected ? (
                    <Text style={{ color: theme.colors.accent.primary, fontSize: 18 }}>✓</Text>
                  ) : null}
                </TouchableOpacity>
              )
            })}
            {localeSaving ? (
              <ActivityIndicator color={theme.colors.accent.primary} style={{ marginTop: 8 }} />
            ) : null}
            <TouchableOpacity
              style={{ marginTop: 12, alignItems: 'center' }}
              onPress={() => setLocaleModal(false)}
            >
              <Text style={[theme.typography.bodyStrong, { color: theme.colors.text.secondary }]}>
                {t('cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 100 },
  section: { marginBottom: 24, paddingHorizontal: 16 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  telegramCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 8 },
  tokenBlock: { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  modalInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
})
