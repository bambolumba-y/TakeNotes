import React, { useState } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/useTheme'
import { useNotesStore } from '@/store/notes'
import { useFoldersStore } from '@/store/folders'
import { useThemesStore } from '@/store/themes'
import { Button } from '@/components/ui/Button'
import type { Folder, ThemeEntity } from '@takenotes/shared'
import { useI18n } from '@/lib/i18n'

export default function NewNoteScreen() {
  const theme = useTheme()
  const { t } = useI18n()
  const { create } = useNotesStore()
  const { folders } = useFoldersStore()
  const { themes } = useThemesStore()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])
  const [isPinned, setIsPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [titleError, setTitleError] = useState('')

  const toggleTheme = (id: string) => {
    setSelectedThemes((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])
  }

  const handleSave = async () => {
    if (!title.trim()) { setTitleError(t('titleRequired')); return }
    setSaving(true)
    try {
      await create({ title: title.trim(), content, folderId: selectedFolder, themeIds: selectedThemes, isPinned })
      router.back()
    } catch (e) {
      Alert.alert(t('somethingWentWrong'), t('failedToSave'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.colors.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Cancel">
          <Text style={[theme.typography.body, { color: theme.colors.accent.primary }]}>{t('cancel')}</Text>
        </TouchableOpacity>
        <Text style={[theme.typography.bodyStrong, { color: theme.colors.text.primary }]}>{t('newNote')}</Text>
        <TouchableOpacity onPress={() => setIsPinned((v) => !v)} accessibilityLabel="Toggle pin">
          <Text style={{ fontSize: 20 }}>{isPinned ? '📌' : '📍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TextInput
          style={[theme.typography.title2, styles.titleInput, { color: theme.colors.text.primary }]}
          value={title}
          onChangeText={(t) => { setTitle(t); setTitleError('') }}
          placeholder={t('title')}
          placeholderTextColor={theme.colors.text.tertiary}
          accessibilityLabel="Note title"
          multiline={false}
        />
        {titleError ? (
          <Text style={[theme.typography.caption, { color: theme.colors.status.error, marginHorizontal: 20, marginTop: -8, marginBottom: 8 }]}>
            {titleError}
          </Text>
        ) : null}

        <TextInput
          style={[theme.typography.body, styles.contentInput, { color: theme.colors.text.primary, backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.default }]}
          value={content}
          onChangeText={setContent}
          placeholder={t('addDetails')}
          placeholderTextColor={theme.colors.text.tertiary}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Note content"
        />

        {folders.length > 0 && (
          <View style={styles.section}>
            <Text style={[theme.typography.captionStrong, { color: theme.colors.text.tertiary, marginBottom: 8 }]}>{t('folderLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              <TouchableOpacity
                style={[styles.chip, { borderColor: selectedFolder === null ? theme.colors.accent.primary : theme.colors.border.default, backgroundColor: selectedFolder === null ? theme.colors.accent.soft : 'transparent' }]}
                onPress={() => setSelectedFolder(null)}
              >
                <Text style={[theme.typography.caption, { color: selectedFolder === null ? theme.colors.accent.primary : theme.colors.text.secondary }]}>{t('none')}</Text>
              </TouchableOpacity>
              {folders.map((f: Folder) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.chip, { borderColor: selectedFolder === f.id ? f.color : theme.colors.border.default, backgroundColor: selectedFolder === f.id ? f.color + '20' : 'transparent' }]}
                  onPress={() => setSelectedFolder(f.id)}
                >
                  <Text style={[theme.typography.caption, { color: selectedFolder === f.id ? f.color : theme.colors.text.secondary }]}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {themes.length > 0 && (
          <View style={styles.section}>
            <Text style={[theme.typography.captionStrong, { color: theme.colors.text.tertiary, marginBottom: 8 }]}>{t('themesLabel')}</Text>
            <View style={styles.themeGrid}>
              {themes.map((t: ThemeEntity) => {
                const selected = selectedThemes.includes(t.id)
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, { borderColor: selected ? t.color : theme.colors.border.default, backgroundColor: selected ? t.color + '20' : 'transparent' }]}
                    onPress={() => toggleTheme(t.id)}
                  >
                    <Text style={[theme.typography.caption, { color: selected ? t.color : theme.colors.text.secondary }]}>{t.name}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        <View style={{ marginTop: 16 }}>
          <Button label={t('saveNote')} onPress={handleSave} loading={saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  scroll: { padding: 20, paddingBottom: 100 },
  titleInput: { marginBottom: 12, fontSize: 22, fontWeight: '600' },
  contentInput: { minHeight: 160, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  section: { marginBottom: 20 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
