import React from 'react'
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/useTheme'
import type { Folder } from '@takenotes/shared'

interface FolderStripProps {
  folders: Folder[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function FolderStrip({ folders, selectedId, onSelect }: FolderStripProps) {
  const theme = useTheme()
  if (!folders.length) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      <TouchableOpacity
        style={[
          styles.chip,
          {
            backgroundColor: selectedId === null ? theme.colors.accent.primary : theme.colors.bg.surfaceSecondary,
            borderColor: selectedId === null ? theme.colors.accent.primary : theme.colors.border.default,
          },
        ]}
        onPress={() => onSelect(null)}
        accessibilityLabel="All folders"
      >
        <Text style={[theme.typography.captionStrong, { color: selectedId === null ? '#fff' : theme.colors.text.secondary }]}>
          All
        </Text>
      </TouchableOpacity>

      {folders.map((folder) => {
        const isSelected = selectedId === folder.id
        return (
          <TouchableOpacity
            key={folder.id}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? folder.color + '30' : theme.colors.bg.surfaceSecondary,
                borderColor: isSelected ? folder.color : theme.colors.border.default,
              },
            ]}
            onPress={() => onSelect(isSelected ? null : folder.id)}
            accessibilityLabel={folder.name}
          >
            <Text style={{ fontSize: 13, marginRight: 4 }}>{folder.icon === 'folder' ? '📁' : '🏷️'}</Text>
            <Text style={[theme.typography.captionStrong, { color: isSelected ? folder.color : theme.colors.text.secondary }]}>
              {folder.name}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, flexDirection: 'row' },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
})
