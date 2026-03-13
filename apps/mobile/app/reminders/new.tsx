import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { ReminderPriority, ReminderChannel, RecurrenceType } from '@takenotes/shared'
import { useTheme } from '@/theme/useTheme'
import { useRemindersStore } from '@/store/reminders'
import { useFoldersStore } from '@/store/folders'
import { useThemesStore } from '@/store/themes'
import { InputField } from '@/components/ui/InputField'
import { Button } from '@/components/ui/Button'
import type { Folder, ThemeEntity } from '@takenotes/shared'
import { useI18n } from '@/lib/i18n'


/**
 * Format a Date as a readable date string: "Mon, Mar 12 2026"
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a Date as HH:MM (24h or locale-default)
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/**
 * Combine the date part of `datePart` with the time part of `timePart` into one Date.
 */
function combineDateAndTime(datePart: Date, timePart: Date): Date {
  const combined = new Date(datePart)
  combined.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0)
  return combined
}

export default function NewReminderScreen() {
  const theme = useTheme()
  const { t } = useI18n()
  const { create } = useRemindersStore()

  const PRIORITY_OPTIONS = [
    { value: ReminderPriority.Low, label: t('low'), color: '#12B76A' },
    { value: ReminderPriority.Medium, label: t('medium'), color: '#F79009' },
    { value: ReminderPriority.High, label: t('high'), color: '#FB923C' },
    { value: ReminderPriority.Urgent, label: t('urgent'), color: '#F04438' },
  ]

  const CHANNEL_OPTIONS = [
    { value: ReminderChannel.Push, label: t('pushOnly'), icon: '🔔' },
    { value: ReminderChannel.Email, label: t('emailChannel'), icon: '✉️' },
    { value: ReminderChannel.Telegram, label: t('telegram'), icon: '✈️' },
  ]

  const RECURRENCE_OPTIONS = [
    { value: RecurrenceType.None, label: t('none') },
    { value: RecurrenceType.Daily, label: t('daily') },
    { value: RecurrenceType.Weekly, label: t('weekly') },
    { value: RecurrenceType.Monthly, label: t('monthly') },
    { value: RecurrenceType.Yearly, label: t('yearly') },
  ]
  const { folders } = useFoldersStore()
  const { themes } = useThemesStore()

  const [selectedChannels, setSelectedChannels] = useState<ReminderChannel[]>([ReminderChannel.Push])
  const [selectedPriority, setSelectedPriority] = useState<ReminderPriority>(ReminderPriority.Medium)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(RecurrenceType.None)
  const [saving, setSaving] = useState(false)

  // Separate date and time state
  const initialDue = (() => {
    const d = new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    return d
  })()
  const [dueDatePart, setDueDatePart] = useState<Date>(initialDue)
  const [dueTimePart, setDueTimePart] = useState<Date>(initialDue)

  // Picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<{ title: string; description?: string }>({
    defaultValues: { title: '', description: '' },
  })

  const toggleChannel = (ch: ReminderChannel) => {
    setSelectedChannels((prev) =>
      prev.includes(ch)
        ? prev.length > 1
          ? prev.filter((c) => c !== ch)
          : prev
        : [...prev, ch],
    )
  }

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    // On Android the picker closes automatically; on iOS we close manually
    if (Platform.OS === 'android') setShowDatePicker(false)
    if (selectedDate) {
      setDueDatePart(selectedDate)
    }
  }

  const onTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false)
    if (selectedDate) {
      setDueTimePart(selectedDate)
    }
  }

  const onSubmit = async (data: { title: string; description?: string }) => {
    const dueAt = combineDateAndTime(dueDatePart, dueTimePart)
    if (dueAt <= new Date()) {
      Alert.alert(t('invalidTime'), t('timeMustBeFuture'))
      return
    }
    setSaving(true)
    try {
      await create({
        title: data.title,
        description: data.description || undefined,
        dueAt: dueAt.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        priority: selectedPriority,
        folderId: selectedFolder,
        themeIds: selectedThemes,
        deliveryPolicy: { channels: selectedChannels },
        repeatRule: { type: recurrenceType },
      })
      router.back()
    } catch (e) {
      Alert.alert(t('somethingWentWrong'), (e as Error).message || t('failedToSave'))
    } finally {
      setSaving(false)
    }
  }

  const SectionLabel = ({ text }: { text: string }) => (
    <Text style={[theme.typography.captionStrong, { color: theme.colors.text.tertiary, marginBottom: 8 }]}>
      {text}
    </Text>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.colors.border.default }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[theme.typography.body, { color: theme.colors.accent.primary }]}>{t('cancel')}</Text>
        </TouchableOpacity>
        <Text style={[theme.typography.bodyStrong, { color: theme.colors.text.primary }]}>{t('newReminder')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <Controller
          control={control}
          name="title"
          rules={{ required: t('titleRequired') }}
          render={({ field: { onChange, onBlur, value } }) => (
            <InputField
              label={t('title')}
              placeholder={t('reminderTitlePlaceholder')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.title?.message}
            />
          )}
        />

        {/* Description */}
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <InputField
              label={`${t('description')} (${t('optional')})`}
              placeholder={t('addDetails')}
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />

        {/* Due Date & Time */}
        <View style={styles.section}>
          <SectionLabel text={t('dueDateAndTime').toUpperCase()} />

          {/* Date picker row */}
          <TouchableOpacity
            style={[
              styles.pickerRow,
              {
                backgroundColor: theme.colors.bg.input,
                borderColor: theme.colors.border.default,
              },
            ]}
            onPress={() => {
              setShowTimePicker(false)
              setShowDatePicker(true)
            }}
            activeOpacity={0.75}
          >
            <Text style={[theme.typography.captionStrong, { color: theme.colors.text.secondary }]}>
              {t('dueDate')}
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.primary }]}>
              {formatDate(dueDatePart)}
            </Text>
          </TouchableOpacity>

          {/* Time picker row */}
          <TouchableOpacity
            style={[
              styles.pickerRow,
              {
                backgroundColor: theme.colors.bg.input,
                borderColor: theme.colors.border.default,
                marginTop: 8,
              },
            ]}
            onPress={() => {
              setShowDatePicker(false)
              setShowTimePicker(true)
            }}
            activeOpacity={0.75}
          >
            <Text style={[theme.typography.captionStrong, { color: theme.colors.text.secondary }]}>
              {t('dueTime')}
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.primary }]}>
              {formatTime(dueTimePart)}
            </Text>
          </TouchableOpacity>

          {/* Native date picker */}
          {showDatePicker && (
            <DateTimePicker
              value={dueDatePart}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              onChange={onDateChange}
              style={{ marginTop: 8 }}
            />
          )}

          {/* Close button for iOS inline date picker */}
          {showDatePicker && Platform.OS === 'ios' && (
            <TouchableOpacity
              style={{ alignItems: 'flex-end', paddingVertical: 4 }}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={[theme.typography.bodyStrong, { color: theme.colors.accent.primary }]}>{t('done')}</Text>
            </TouchableOpacity>
          )}

          {/* Native time picker */}
          {showTimePicker && (
            <DateTimePicker
              value={dueTimePart}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour={true}
              onChange={onTimeChange}
              style={{ marginTop: 8 }}
            />
          )}

          {/* Close button for iOS spinner time picker */}
          {showTimePicker && Platform.OS === 'ios' && (
            <TouchableOpacity
              style={{ alignItems: 'flex-end', paddingVertical: 4 }}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={[theme.typography.bodyStrong, { color: theme.colors.accent.primary }]}>{t('done')}</Text>
            </TouchableOpacity>
          )}

          <Text style={[theme.typography.micro, { color: theme.colors.text.tertiary, marginTop: 6 }]}>
            {t('timezoneLabel')} {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </Text>
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <SectionLabel text={t('priority').toUpperCase()} />
          <View style={styles.chipRow}>
            {PRIORITY_OPTIONS.map((opt) => {
              const selected = selectedPriority === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? opt.color : theme.colors.border.default,
                      backgroundColor: selected ? opt.color + '20' : 'transparent',
                    },
                  ]}
                  onPress={() => setSelectedPriority(opt.value)}
                >
                  <Text
                    style={[
                      theme.typography.captionStrong,
                      { color: selected ? opt.color : theme.colors.text.secondary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Channels */}
        <View style={styles.section}>
          <SectionLabel text={t('deliveryChannels').toUpperCase()} />
          <View style={styles.chipRow}>
            {CHANNEL_OPTIONS.map((ch) => {
              const selected = selectedChannels.includes(ch.value)
              return (
                <TouchableOpacity
                  key={ch.value}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? theme.colors.accent.primary : theme.colors.border.default,
                      backgroundColor: selected ? theme.colors.accent.soft : 'transparent',
                    },
                  ]}
                  onPress={() => toggleChannel(ch.value)}
                >
                  <Text style={{ marginRight: 4 }}>{ch.icon}</Text>
                  <Text
                    style={[
                      theme.typography.captionStrong,
                      { color: selected ? theme.colors.accent.primary : theme.colors.text.secondary },
                    ]}
                  >
                    {ch.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Recurrence */}
        <View style={styles.section}>
          <SectionLabel text={t('repeat').toUpperCase()} />
          <View style={styles.chipRow}>
            {RECURRENCE_OPTIONS.map((opt) => {
              const selected = recurrenceType === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? theme.colors.accent.primary : theme.colors.border.default,
                      backgroundColor: selected ? theme.colors.accent.soft : 'transparent',
                    },
                  ]}
                  onPress={() => setRecurrenceType(opt.value)}
                >
                  <Text
                    style={[
                      theme.typography.captionStrong,
                      { color: selected ? theme.colors.accent.primary : theme.colors.text.secondary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Folder */}
        {folders.length > 0 && (
          <View style={styles.section}>
            <SectionLabel text={t('folder').toUpperCase()} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    borderColor: !selectedFolder ? theme.colors.accent.primary : theme.colors.border.default,
                    backgroundColor: !selectedFolder ? theme.colors.accent.soft : 'transparent',
                    marginRight: 8,
                  },
                ]}
                onPress={() => setSelectedFolder(null)}
              >
                <Text style={[theme.typography.caption, { color: !selectedFolder ? theme.colors.accent.primary : theme.colors.text.secondary }]}>
                  {t('none')}
                </Text>
              </TouchableOpacity>
              {folders.map((f: Folder) => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.chip,
                    {
                      borderColor: selectedFolder === f.id ? f.color : theme.colors.border.default,
                      backgroundColor: selectedFolder === f.id ? f.color + '20' : 'transparent',
                      marginRight: 8,
                    },
                  ]}
                  onPress={() => setSelectedFolder(f.id)}
                >
                  <Text style={[theme.typography.caption, { color: selectedFolder === f.id ? f.color : theme.colors.text.secondary }]}>
                    {f.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Themes */}
        {themes.length > 0 && (
          <View style={styles.section}>
            <SectionLabel text={t('themes').toUpperCase()} />
            <View style={styles.chipRow}>
              {themes.map((th: ThemeEntity) => {
                const selected = selectedThemes.includes(th.id)
                return (
                  <TouchableOpacity
                    key={th.id}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? th.color : theme.colors.border.default,
                        backgroundColor: selected ? th.color + '20' : 'transparent',
                      },
                    ]}
                    onPress={() =>
                      setSelectedThemes((prev) =>
                        prev.includes(th.id) ? prev.filter((id) => id !== th.id) : [...prev, th.id],
                      )
                    }
                  >
                    <Text style={[theme.typography.caption, { color: selected ? th.color : theme.colors.text.secondary }]}>
                      {th.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        <View style={{ marginTop: 8 }}>
          <Button label={t('createReminder')} onPress={handleSubmit(onSubmit)} loading={saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  scroll: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
})
