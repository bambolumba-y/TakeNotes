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

const PRIORITY_COLORS_LIGHT: Record<ReminderPriority, string> = {
  [ReminderPriority.Low]: '#12B76A', [ReminderPriority.Medium]: '#F79009',
  [ReminderPriority.High]: '#FB923C', [ReminderPriority.Urgent]: '#F04438',
}
const CHANNEL_ICONS: Record<string, string> = { push: '🔔', email: '✉️', telegram: '✈️' }

const SNOOZE_PRESETS = [
  { label: '5 min', minutes: 5 }, { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 }, { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
]

export default function ReminderDetailScreen() {
  const theme = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { complete, snooze, cancel } = useRemindersStore()
  const [reminder, setReminder] = useState<Reminder | null>(null)
  const [snoozeModalVisible, setSnoozeModalVisible] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [cancelling, setCancelling] = useState(false)

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
    Alert.alert('Cancel reminder', 'This reminder will be cancelled.', [
      { text: 'Back', style: 'cancel' },
      { text: 'Cancel Reminder', style: 'destructive', onPress: async () => { await cancel(id); router.back() } },
    ])
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
    if (!r || r.type === RecurrenceType.None) return 'Does not repeat'
    return r.type.charAt(0).toUpperCase() + r.type.slice(1)
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      {/* Back */}
      <View style={[styles.topBar, { borderBottomColor: theme.colors.border.default }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[theme.typography.body, { color: theme.colors.accent.primary }]}>← Back</Text>
        </TouchableOpacity>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
          <Text style={[theme.typography.micro, { color: priorityColor }]}>{reminder.priority.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Title */}
        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: 4 }]}>{reminder.title}</Text>

        {/* Due block */}
        <View style={[styles.infoBlock, { backgroundColor: theme.colors.bg.surface, borderColor: isOverdue ? theme.colors.status.warning : theme.colors.border.default }]}>
          <Text style={[theme.typography.captionStrong, { color: theme.colors.text.tertiary }]}>DUE</Text>
          <Text style={[theme.typography.bodyStrong, { color: isOverdue ? theme.colors.status.warning : theme.colors.text.primary, marginTop: 2 }]}>
            {isOverdue ? '⚠ Overdue · ' : ''}{new Date(reminder.dueAt).toLocaleString()}
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.text.tertiary, marginTop: 2 }]}>{reminder.timezone}</Text>
        </View>

        {/* Repeat block */}
        <View style={[styles.infoBlock, { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.default }]}>
          <Text style={[theme.typography.captionStrong, { color: theme.colors.text.tertiary }]}>REPEAT</Text>
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
              <Text style={[theme.typography.captionStrong, { color: theme.colors.status.success, marginTop: 6 }]}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.colors.status.warning + '15', borderColor: theme.colors.status.warning }]}
              onPress={() => setSnoozeModalVisible(true)}
            >
              <Text style={{ fontSize: 22 }}>💤</Text>
              <Text style={[theme.typography.captionStrong, { color: theme.colors.status.warning, marginTop: 6 }]}>Snooze</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.colors.accent.soft, borderColor: theme.colors.accent.primary }]}
              onPress={() => router.push(`/reminders/${id}/edit`)}
            >
              <Text style={{ fontSize: 22 }}>✏️</Text>
              <Text style={[theme.typography.captionStrong, { color: theme.colors.accent.primary, marginTop: 6 }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Channels */}
        <View style={styles.section}>
          <Text style={[theme.typography.captionStrong, { color: theme.colors.text.tertiary, marginBottom: 10 }]}>DELIVERY CHANNELS</Text>
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
                    {ch.charAt(0).toUpperCase() + ch.slice(1)}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Description */}
        {reminder.description ? (
          <View style={styles.section}>
            <Text style={[theme.typography.captionStrong, { color: theme.colors.text.tertiary, marginBottom: 8 }]}>DESCRIPTION</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.primary, lineHeight: 24 }]}>{reminder.description}</Text>
          </View>
        ) : null}

        {/* Destructive */}
        {isActive && (
          <View style={[styles.section, { marginTop: 8 }]}>
            <Button label="Cancel Reminder" variant="destructive" onPress={handleCancel} />
          </View>
        )}
      </ScrollView>

      {/* Snooze modal */}
      <Modal visible={snoozeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.bg.surface }]}>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text.primary, marginBottom: 16 }]}>Snooze until...</Text>
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
              <Text style={[theme.typography.body, { color: theme.colors.status.error }]}>Cancel</Text>
            </TouchableOpacity>
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
})
