import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { FOLDER_ICONS } from '@takenotes/shared'
import { useTheme } from '@/theme/useTheme'

const ICON_MAP: Record<string, string> = {
  'folder': '📁', 'star': '⭐', 'heart': '❤️', 'bookmark': '🔖', 'tag': '🏷️',
  'home': '🏠', 'briefcase': '💼', 'book': '📚', 'music': '🎵', 'camera': '📷',
  'code': '💻', 'coffee': '☕', 'globe': '🌍', 'map': '🗺️', 'shopping-bag': '🛍️',
  'sun': '☀️', 'moon': '🌙', 'zap': '⚡', 'flag': '🚩', 'gift': '🎁',
}

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const theme = useTheme()
  return (
    <View style={styles.grid}>
      {FOLDER_ICONS.map((icon) => (
        <TouchableOpacity
          key={icon}
          style={[
            styles.item,
            {
              backgroundColor: value === icon ? theme.colors.accent.soft : theme.colors.bg.surfaceSecondary,
              borderColor: value === icon ? theme.colors.accent.primary : 'transparent',
            },
          ]}
          onPress={() => onChange(icon)}
          accessibilityLabel={icon}
        >
          <Text style={{ fontSize: 20 }}>{ICON_MAP[icon]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: { width: 44, height: 44, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
})
