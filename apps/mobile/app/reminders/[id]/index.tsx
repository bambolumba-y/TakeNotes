import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useTheme } from '@/theme/useTheme'
import { useRemindersStore } from '@/store/reminders'
import { remindersService } from '@/services/reminders.service'
import { Button } from '@/components/ui/Button'
import type { Reminder } from '@takenotes/shared'
import { ReminderPriority, ReminderChannel, RecurrenceType } from '@takenotes/shared'
import { useI18n } from '@/lib/i18n'

const PRIORITY_COLORS_LIGHT: Record<ReminderPriority, string> = {
  [ReminderPriority.Low]: '#12B76A', [ReminderPriority.Medium]: '#F79009',
  [ReminderPriority.High]: '#FB923C', [ReminderPriority.Urgent]: '#F04438',
}
const CHANNEL_ICONS: Record<string, string> = { push: '🔔', email: '✉️', telegram: '✈️' }

export default function ReminderDetailScreen() {
  const theme = useTheme()
  const { t } = useI18n()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { complete, snooze, cancel } = useRemindersStore()
  const [reminder, setReminder] = useState<Reminder | null>(null)
  const [snoozeModalVisible, setSnoozeModalVisible] = useState(false)
  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const SNOOZE_PRESETS = [
    { label: t('snooze5min'), minutes: 5 },
    { label: t('snooze15min'), minutes: 15 },
    { label: t('snooze30min'), minutes: 30 },
    { label: t('snooze1hour'), minutes: 60 },
    { label: t('snooze3hours'), minutes: 180 },
  ]

  useEffect(() => {
    remindersService.get(id).then(setReminder)
  }, [id])

  const handleComplete = async () => {
    setCompleting(true)
    try { await complete(id); router.back() }
    catch (e) { Alert.alert('Error', (e as Error).message) }
    finally { setCompleting(false) }
  }

  const handleSnooze = async (minutes: number) => {
    const until = new Date(Date.now() + minutes * 60 * 1000).toISOString()
    try { await snooze(id, until); setSnoozeModalVisible(false); remindersService.get(id).then(setReminder) }
    catch (e) { Alert.alert('Error', (e as Error).message) }
  }

  const handleCancel = () => {
    setCancelModalVisible(true)
  }

  const confirmCancel = async () => {
    setCancelling(true)
    try {
      await cancel(id)
      setCancelModalVisible(false)
      router.back()
    } catch (e) {
      Alert.alert('Error', (e as Error).message)
    } finally {
      setCancelling(false)
    }
  }

  if (!reminder) return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: 'center', marginTop: 60 }]}>Loading...</Text>
    </SafeAreaView>
  )

  const isActive = reminder.status === 'active'
  const isOverdue = new Date(reminder.dueAt) < new Date() && isActive
  const priorityColor = PRIORITY_COLORS_LIGHT[reminder.priority]

  const recurrenceLabel = () => {
    const r = reminder.repeatRule
    if (!r || r.type === RecurrenceType.None) return t('doNotRepeat')
    if (r.type === RecurrenceType.Daily) return t('daily')
    if (r.type === RecurrenceType.Weekly) return t('weekly')
    if (r.type === RecurrenceType.Monthly) return t('monthly')
    if (r.type === RecurrenceType.Yearly) return t('yearly')
    return r.type.charAt(0).toUpperCase() + r.type.slice(1)
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      {/* Back */}
      <View style={[styles.topBar, { borderBottomColor: theme.colors.border.default }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[theme.typography.body, { color: theme.colors.accent.primary }]}>← {t('back')}</Text>
        </TouchableOpacity>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
          <Text style={[theme.typography.micro, { color: priorityColor }]}>{t(reminder.priority as 'low' | 'medium' | 'high' | 'urgent').toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Title */}
        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: 4 }]}>{reminder.title}</Text>

        {/* Due block */}
        <View style={[styles.infoBlock, { backgroundColor: theme.colors.bg.surface, borderColor: isOverdue ? theme.colors.status.warning : theme.colors.border.default }]}>
          <Text style={[theme.typography.captionStrong, { color: theme.colors.text.tertiary }]}>{t('due').toUpperCase()}</Text>
          <Text style={[theme.typography.bodyStrong, { color: isOverdue ? theme.colors.status.warning : theme.colors.text.primary, marginTop: 2 }]}>
            {isOverdue ? `⚠ ${t('overdueLabel')} · ` : ''}{new Date(reminder.dueAt).toLocaleString()}
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.text.tertiary, marginTop: 2 }]}>{reminder.timezone}</Text>
        </View>

        {/* Repeat block */}
        <View style={[styles.infoBlock, { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.default }]}>
          <Text style={[theme.typography.captionStrong, { color: theme.colors.text.tertiary }]}>{t('repeat').toUpperCase()}</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.primary, marginTop: 2 }]}>{recurrenceLabel()}</Text>
        </View>

        {/* Primary action row — Complete / Snooze / Edit */}
        {isActive && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.colors.status.success + '15', borderColor: theme.colors.status.success }]}
              onPress={handleComplete}
              disabled={completing}
            >
              <Text style={{ fontSize: 22 }}>✅</Text>
              <Text style={[theme.typography.captionStrong, { color: theme.colors.status.success, marginTop: 6 }]}>{t('complete')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.colors.status.warning + '15', borderColor: theme.colors.status.warning }]}
              onPress={() => setSnoozeModalVisible(true)}
            >
              <Text style={{ fontSize: 22 }}>💤</Text>
              <Text style={[theme.typography.captionStrong, { color: theme.colors.status.warning, marginTop: 6 }]}>{t('snooze')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.colors.accent.soft, borderColor: theme.colors.accent.primary }]}
              onPress={() => router.push(`/reminders/${id}/edit`)}
            >
              <Text style={{ fontSize: 22 }}>✏️</Text>
              <Text style={[theme.typography.captionStrong, { color: theme.colors.accent.primary, marginTop: 6 }]}>{t('edit')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Channels */}
        <View style={styles.section}>
          <Text style={[theme.typography.captionStrong, { color: theme.colors.text.tertiary, marginBottom: 10 }]}>{t('deliveryChannels').toUpperCase()}</Text>
          <View style={styles.channelsRow}>
            {(['push', 'email', 'telegram'] as const).map((ch) => {
              const isSelected = reminder.deliveryPolicy.channels.includes(ch as ReminderChannel)
              return (
                <View
                  key={ch}
                  style={[styles.channelChip, {
                    backgroundColor: isSelected ? theme.colors.accent.soft : theme.colors.bg.surfaceSecondary,
                    borderColor: isSelected ? theme.colors.accent.primary : theme.colors.border.default,
                  }]}
                >
                  <Text style={{ fontSize: 16 }}>{CHANNEL_ICONS[ch]}</Text>
                  <Text style={[theme.typography.captionStrong, { color: isSelected ? theme.colors.accent.primary : theme.colors.text.tertiary, marginLeft: 6 }]}>
                    {ch === 'push' ? t('pushOnly') : ch === 'email' ? t('emailChannel') : t('telegram')}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Description */}
        {reminder.description ? (
          <View style={styles.section}>
            <Text style={[theme.typography.captionStrong, { color: theme.colors.text.tertiary, marginBottom: 8 }]}>{t('description').toUpperCase()}</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.primary, lineHeight: 24 }]}>{reminder.description}</Text>
          </View>
        ) : null}

        {/* Destructive */}
        {isActive && (
          <View style={[styles.section, { marginTop: 8 }]}>
            <Button label={t('cancelReminder')} variant="destructive" onPress={handleCancel} />
          </View>
        )}
      </ScrollView>

      {/* Snooze modal */}
      <Modal visible={snoozeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.bg.surface }]}>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text.primary, marginBottom: 16 }]}>{t('snoozeUntil')}</Text>
            {SNOOZE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={[styles.snoozeOption, { borderBottomColor: theme.colors.border.default }]}
                onPress={() => handleSnooze(preset.minutes)}
              >
                <Text style={[theme.typography.body, { color: theme.colors.text.primary }]}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.snoozeOption} onPress={() => setSnoozeModalVisible(false)}>
              <Text style={[theme.typography.body, { color: theme.colors.status.error }]}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cancel reminder confirmation modal */}
      <Modal visible={cancelModalVisible} transparent animationType="fade">
        <View style={styles.confirmModalOverlay}>
          <View style={[styles.confirmModalCard, { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.default }]}>
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: 8 }]}>{t('cancelReminder')}</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginBottom: 24 }]}>{t('cancelReminderBody')}</Text>
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={[styles.confirmModalBtn, { borderColor: theme.colors.border.default, borderWidth: 1.5 }]}
                onPress={() => setCancelModalVisible(false)}
                disabled={cancelling}
              >
                <Text style={[theme.typography.bodyStrong, { color: theme.colors.text.secondary }]}>{t('back')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalBtn, { backgroundColor: theme.colors.status.error }]}
                onPress={confirmCancel}
                disabled={cancelling}
              >
                <Text style={[theme.typography.bodyStrong, { color: '#FFFFFF' }]}>{t('cancelReminder')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  scroll: { padding: 20, paddingBottom: 100 },
  infoBlock: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 12, marginVertical: 16 },
  actionCard: { flex: 1, alignItems: 'center', borderRadius: 14, borderWidth: 1.5, paddingVertical: 16 },
  section: { marginBottom: 20 },
  channelsRow: { flexDirection: 'row', gap: 10 },
  channelChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1.5, paddingVertical: 10 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  snoozeOption: { paddingVertical: 16, borderBottomWidth: 1 },
  confirmModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', padding: 24 },
  confirmModalCard: { width: '100%', maxWidth: 400, borderRadius: 20, borderWidth: 1, padding: 24 },
  confirmModalActions: { flexDirection: 'row', gap: 10 },
  confirmModalBtn: { flex: 1, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
})
