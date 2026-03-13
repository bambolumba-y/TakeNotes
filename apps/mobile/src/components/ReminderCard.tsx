import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/useTheme'
import { useI18n } from '@/lib/i18n'
import type { Reminder } from '@takenotes/shared'
import { ReminderPriority, ReminderChannel } from '@takenotes/shared'

const PRIORITY_COLORS_LIGHT: Record<ReminderPriority, string> = {
  [ReminderPriority.Low]: '#12B76A',
  [ReminderPriority.Medium]: '#F79009',
  [ReminderPriority.High]: '#FB923C',
  [ReminderPriority.Urgent]: '#F04438',
}
const PRIORITY_COLORS_DARK: Record<ReminderPriority, string> = {
  [ReminderPriority.Low]: '#32D583',
  [ReminderPriority.Medium]: '#FDB022',
  [ReminderPriority.High]: '#FB923C',
  [ReminderPriority.Urgent]: '#F97066',
}
const CHANNEL_ICONS: Record<ReminderChannel, string> = {
  [ReminderChannel.Push]: '🔔',
  [ReminderChannel.Email]: '✉️',
  [ReminderChannel.Telegram]: '✈️',
}

interface ReminderCardProps {
  reminder: Reminder
  onPress: () => void
}

const PRIORITY_KEYS: Record<ReminderPriority, 'low' | 'medium' | 'high' | 'urgent'> = {
  [ReminderPriority.Low]: 'low',
  [ReminderPriority.Medium]: 'medium',
  [ReminderPriority.High]: 'high',
  [ReminderPriority.Urgent]: 'urgent',
}

export function ReminderCard({ reminder, onPress }: ReminderCardProps) {
  const theme = useTheme()
  const { t } = useI18n()
  const priorityColors = theme.isDark ? PRIORITY_COLORS_DARK : PRIORITY_COLORS_LIGHT
  const priorityColor = priorityColors[reminder.priority]
  const isOverdue = new Date(reminder.dueAt) < new Date() && reminder.status === 'active' && (!reminder.snoozeUntil || new Date(reminder.snoozeUntil) < new Date())

  const cardBorderColor = isOverdue
    ? theme.colors.status.warning
    : reminder.priority === ReminderPriority.Urgent
    ? theme.colors.status.error
    : theme.colors.border.default

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.bg.surface, borderColor: cardBorderColor, ...theme.colors.shadow.card }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={reminder.title}
    >
      <View style={styles.header}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text.primary, flex: 1 }]} numberOfLines={1}>
          {reminder.title}
        </Text>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
          <Text style={[theme.typography.micro, { color: priorityColor }]}>
            {t(PRIORITY_KEYS[reminder.priority]).toUpperCase()}
          </Text>
        </View>
      </View>

      {reminder.description ? (
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]} numberOfLines={1}>
          {reminder.description}
        </Text>
      ) : null}

      <View style={styles.meta}>
        <Text style={[theme.typography.captionStrong, { color: isOverdue ? theme.colors.status.warning : theme.colors.text.tertiary }]}>
          {isOverdue ? '⚠ ' : '🕐 '}
          {new Date(reminder.dueAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Text>
        {reminder.snoozeUntil && new Date(reminder.snoozeUntil) > new Date() && (
          <Text style={[theme.typography.micro, { color: theme.colors.text.tertiary, marginLeft: 8 }]}>
            💤 {new Date(reminder.snoozeUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        {reminder.folder && (
          <View style={[styles.chip, { backgroundColor: reminder.folder.color + '22' }]}>
            <Text style={[theme.typography.micro, { color: reminder.folder.color }]}>{reminder.folder.name}</Text>
          </View>
        )}
        <View style={styles.channels}>
          {reminder.deliveryPolicy.channels.map((ch) => (
            <Text key={ch} style={styles.channelIcon}>{CHANNEL_ICONS[ch as ReminderChannel]}</Text>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  channels: { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
  channelIcon: { fontSize: 14 },
})
