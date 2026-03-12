import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native'
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

const PRIORITY_OPTIONS = [
  { value: ReminderPriority.Low, label: 'Low', color: '#12B76A' },
  { value: ReminderPriority.Medium, label: 'Medium', color: '#F79009' },
  { value: ReminderPriority.High, label: 'High', color: '#FB923C' },
  { value: ReminderPriority.Urgent, label: 'Urgent', color: '#F04438' },
]

const CHANNEL_OPTIONS = [
  { value: ReminderChannel.Push, label: 'Push', icon: '🔔' },
  { value: ReminderChannel.Email, label: 'Email', icon: '✉️' },
  { value: ReminderChannel.Telegram, label: 'Telegram', icon: '✈️' },
]

const RECURRENCE_OPTIONS = [
  { value: RecurrenceType.None, label: 'None' },
  { value: RecurrenceType.Daily, label: 'Daily' },
  { value: RecurrenceType.Weekly, label: 'Weekly' },
  { value: RecurrenceType.Monthly, label: 'Monthly' },
  { value: RecurrenceType.Yearly, label: 'Yearly' },
]

export default function NewReminderScreen() {
  const theme = useTheme()
  const { create } = useRemindersStore()
  const { folders } = useFoldersStore()
  const { themes } = useThemesStore()

  const [selectedChannels, setSelectedChannels] = useState<ReminderChannel[]>([ReminderChannel.Push])
  const [selectedPriority, setSelectedPriority] = useState<ReminderPriority>(ReminderPriority.Medium)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(RecurrenceType.None)
  const [saving, setSaving] = useState(false)

  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d.toISOString().slice(0, 16)
  })

  const { control, handleSubmit, formState: { errors } } = useForm<{ title: string; description?: string }>({
    defaultValues: { title: '', description: '' },
  })

  const toggleChannel = (ch: ReminderChannel) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? (prev.length > 1 ? prev.filter((c) => c !== ch) : prev) : [...prev, ch]
    )
  }

  const onSubmit = async (data: { title: string; description?: string }) => {
    if (!dueDate) { Alert.alert('Error', 'Please set a due date and time'); return }
    setSaving(true)
    try {
      await create({
        title: data.title,
        description: data.description || undefined,
        dueAt: new Date(dueDate).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        priority: selectedPriority,
        folderId: selectedFolder,
        themeIds: selectedThemes,
        deliveryPolicy: { channels: selectedChannels },
        repeatRule: { type: recurrenceType },
      })
      router.back()
    } catch (e) {
      Alert.alert('Error', (e as Error).message || 'Failed to create reminder')
    } finally {
      setSaving(false)
    }
  }

  const SectionLabel = ({ text }: { text: string }) => (
    <Text style={[theme.typography.captionStrong, { color: theme.colors.text.tertiary, marginBottom: 8 }]}>{text}</Text>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.colors.border.default }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[theme.typography.body, { color: theme.colors.accent.primary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[theme.typography.bodyStrong, { color: theme.colors.text.primary }]}>New Reminder</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Controller control={control} name="title" rules={{ required: 'Title is required' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <InputField label="Title" placeholder="Reminder title" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.title?.message} />
          )}
        />

        <Controller control={control} name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <InputField label="Description (optional)" placeholder="Add details..." value={value ?? ''} onChangeText={onChange} onBlur={onBlur} />
          )}
        />

        {/* Due Date/Time */}
        <View style={styles.section}>
          <SectionLabel text="DUE DATE & TIME" />
          <InputField
            label=""
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DDTHH:MM"
            autoCapitalize="none"
          />
          <Text style={[theme.typography.micro, { color: theme.colors.text.tertiary }]}>
            Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </Text>
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <SectionLabel text="PRIORITY" />
          <View style={styles.chipRow}>
            {PRIORITY_OPTIONS.map((opt) => {
              const selected = selectedPriority === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, { borderColor: selected ? opt.color : theme.colors.border.default, backgroundColor: selected ? opt.color + '20' : 'transparent' }]}
                  onPress={() => setSelectedPriority(opt.value)}
                >
                  <Text style={[theme.typography.captionStrong, { color: selected ? opt.color : theme.colors.text.secondary }]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Channels */}
        <View style={styles.section}>
          <SectionLabel text="DELIVERY CHANNELS" />
          <View style={styles.chipRow}>
            {CHANNEL_OPTIONS.map((ch) => {
              const selected = selectedChannels.includes(ch.value)
              return (
                <TouchableOpacity
                  key={ch.value}
                  style={[styles.chip, { borderColor: selected ? theme.colors.accent.primary : theme.colors.border.default, backgroundColor: selected ? theme.colors.accent.soft : 'transparent' }]}
                  onPress={() => toggleChannel(ch.value)}
                >
                  <Text style={{ marginRight: 4 }}>{ch.icon}</Text>
                  <Text style={[theme.typography.captionStrong, { color: selected ? theme.colors.accent.primary : theme.colors.text.secondary }]}>{ch.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Recurrence */}
        <View style={styles.section}>
          <SectionLabel text="REPEAT" />
          <View style={styles.chipRow}>
            {RECURRENCE_OPTIONS.map((opt) => {
              const selected = recurrenceType === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, { borderColor: selected ? theme.colors.accent.primary : theme.colors.border.default, backgroundColor: selected ? theme.colors.accent.soft : 'transparent' }]}
                  onPress={() => setRecurrenceType(opt.value)}
                >
                  <Text style={[theme.typography.captionStrong, { color: selected ? theme.colors.accent.primary : theme.colors.text.secondary }]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Folder */}
        {folders.length > 0 && (
          <View style={styles.section}>
            <SectionLabel text="FOLDER" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.chip, { borderColor: !selectedFolder ? theme.colors.accent.primary : theme.colors.border.default, backgroundColor: !selectedFolder ? theme.colors.accent.soft : 'transparent', marginRight: 8 }]}
                onPress={() => setSelectedFolder(null)}
              >
                <Text style={[theme.typography.caption, { color: !selectedFolder ? theme.colors.accent.primary : theme.colors.text.secondary }]}>None</Text>
              </TouchableOpacity>
              {folders.map((f: Folder) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.chip, { borderColor: selectedFolder === f.id ? f.color : theme.colors.border.default, backgroundColor: selectedFolder === f.id ? f.color + '20' : 'transparent', marginRight: 8 }]}
                  onPress={() => setSelectedFolder(f.id)}
                >
                  <Text style={[theme.typography.caption, { color: selectedFolder === f.id ? f.color : theme.colors.text.secondary }]}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Themes */}
        {themes.length > 0 && (
          <View style={styles.section}>
            <SectionLabel text="THEMES" />
            <View style={styles.chipRow}>
              {themes.map((t: ThemeEntity) => {
                const selected = selectedThemes.includes(t.id)
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, { borderColor: selected ? t.color : theme.colors.border.default, backgroundColor: selected ? t.color + '20' : 'transparent' }]}
                    onPress={() => setSelectedThemes((prev) => prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id])}
                  >
                    <Text style={[theme.typography.caption, { color: selected ? t.color : theme.colors.text.secondary }]}>{t.name}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        <View style={{ marginTop: 8 }}>
          <Button label="Create Reminder" onPress={handleSubmit(onSubmit)} loading={saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  scroll: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
})
