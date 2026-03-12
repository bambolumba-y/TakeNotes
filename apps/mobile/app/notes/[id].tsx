import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useTheme } from '@/theme/useTheme'
import { useNotesStore } from '@/store/notes'
import { useFoldersStore } from '@/store/folders'
import { useThemesStore } from '@/store/themes'
import { Button } from '@/components/ui/Button'
import { notesService } from '@/services/notes.service'
import type { Note, Folder, ThemeEntity } from '@takenotes/shared'

export default function NoteDetailScreen() {
  const theme = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { update, remove, archive, pin, unpin } = useNotesStore()
  const { folders } = useFoldersStore()
  const { themes } = useThemesStore()

  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])
  const [isPinned, setIsPinned] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    notesService.get(id).then((n) => {
      setNote(n)
      setTitle(n.title)
      setContent(n.content)
      setSelectedFolder(n.folderId)
      setSelectedThemes(n.themes.map((t) => t.id))
      setIsPinned(n.isPinned)
    })
  }, [id])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await update(id, { title: title.trim(), content, folderId: selectedFolder, themeIds: selectedThemes, isPinned })
      setEditing(false)
    } catch {
      Alert.alert('Error', 'Failed to update note')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = () => {
    Alert.alert('Archive note', 'This note will be moved to archive.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', onPress: async () => { await archive(id); router.back() } },
    ])
  }

  const handleDelete = () => {
    Alert.alert('Delete note', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await remove(id); router.back() } },
    ])
  }

  const handlePinToggle = async () => {
    if (isPinned) { await unpin(id) } else { await pin(id) }
    setIsPinned((v) => !v)
  }

  if (!note) return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: 'center', marginTop: 40 }]}>Loading...</Text>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.colors.border.default }]}>
        <TouchableOpacity onPress={() => router.back()}><Text style={[theme.typography.body, { color: theme.colors.accent.primary }]}>← Back</Text></TouchableOpacity>
        <View style={styles.topBarActions}>
          <TouchableOpacity onPress={handlePinToggle} style={{ marginRight: 16 }} accessibilityLabel="Toggle pin">
            <Text style={{ fontSize: 20 }}>{isPinned ? '📌' : '📍'}</Text>
          </TouchableOpacity>
          {editing ? (
            <Button label="Save" onPress={handleSave} loading={saving} style={{ height: 36, paddingHorizontal: 16 }} />
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={[theme.typography.bodyStrong, { color: theme.colors.accent.primary }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {editing ? (
          <TextInput
            style={[theme.typography.title2, styles.titleInput, { color: theme.colors.text.primary }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={theme.colors.text.tertiary}
          />
        ) : (
          <Text style={[theme.typography.title2, styles.titleInput, { color: theme.colors.text.primary }]}>{title}</Text>
        )}

        <Text style={[theme.typography.caption, { color: theme.colors.text.tertiary, marginBottom: 16 }]}>
          Updated {new Date(note.updatedAt).toLocaleString()}
        </Text>

        {editing ? (
          <TextInput
            style={[theme.typography.body, styles.contentInput, { color: theme.colors.text.primary, backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.default }]}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        ) : (
          <Text style={[theme.typography.body, { color: theme.colors.text.primary, lineHeight: 24 }]}>
            {content || <Text style={{ color: theme.colors.text.tertiary }}>No content</Text>}
          </Text>
        )}

        <View style={styles.divider} />

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.bg.surfaceSecondary }]} onPress={handleArchive}>
            <Text style={{ fontSize: 18 }}>📦</Text>
            <Text style={[theme.typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>Archive</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.status.error + '15' }]} onPress={handleDelete}>
            <Text style={{ fontSize: 18 }}>🗑️</Text>
            <Text style={[theme.typography.caption, { color: theme.colors.status.error, marginTop: 4 }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  topBarActions: { flexDirection: 'row', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 100 },
  titleInput: { marginBottom: 4 },
  contentInput: { minHeight: 200, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#E4E7EC', marginVertical: 20 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, alignItems: 'center', borderRadius: 12, padding: 14 },
})
