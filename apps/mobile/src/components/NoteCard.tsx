import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/useTheme'
import type { Note } from '@takenotes/shared'

interface NoteCardProps {
  note: Note
  onPress: () => void
  onLongPress?: () => void
  compact?: boolean
}

export function NoteCard({ note, onPress, onLongPress, compact = false }: NoteCardProps) {
  const theme = useTheme()

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.bg.surface,
          borderColor: theme.colors.border.default,
          ...theme.colors.shadow.card,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={note.title}
    >
      <View style={styles.header}>
        <Text
          style={[theme.typography.cardTitle, { color: theme.colors.text.primary, flex: 1 }]}
          numberOfLines={1}
        >
          {note.title}
        </Text>
        {note.isPinned && (
          <Text style={styles.pinIcon} accessibilityLabel="Pinned">📌</Text>
        )}
      </View>

      {!compact && note.content ? (
        <Text
          style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}
          numberOfLines={2}
        >
          {note.contentPlain || note.content}
        </Text>
      ) : null}

      <View style={styles.footer}>
        {note.folder && (
          <View style={[styles.folderChip, { backgroundColor: note.folder.color + '22' }]}>
            <Text style={[theme.typography.micro, { color: note.folder.color }]}>
              {note.folder.name}
            </Text>
          </View>
        )}
        {note.themes.slice(0, 2).map((t) => (
          <View key={t.id} style={[styles.themeChip, { backgroundColor: t.color + '22' }]}>
            <Text style={[theme.typography.micro, { color: t.color }]}>{t.name}</Text>
          </View>
        ))}
        <Text style={[theme.typography.micro, { color: theme.colors.text.tertiary, marginLeft: 'auto' }]}>
          {new Date(note.updatedAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center' },
  pinIcon: { fontSize: 14, marginLeft: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 6 },
  folderChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  themeChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
})
