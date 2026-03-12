import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { FOLDER_COLORS } from '@takenotes/shared'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <View style={styles.grid}>
      {FOLDER_COLORS.map((color) => (
        <TouchableOpacity
          key={color}
          style={[
            styles.swatch,
            { backgroundColor: color },
            value === color && styles.selected,
          ]}
          onPress={() => onChange(color)}
          accessibilityLabel={`Color ${color}`}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  selected: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] },
})
