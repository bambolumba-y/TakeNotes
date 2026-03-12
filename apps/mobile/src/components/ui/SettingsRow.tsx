import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/useTheme'

interface SettingsRowProps {
  label: string
  value?: string
  onPress?: () => void
  trailing?: React.ReactNode
  destructive?: boolean
}

export function SettingsRow({ label, value, onPress, trailing, destructive = false }: SettingsRowProps) {
  const theme = useTheme()
  const labelColor = destructive ? theme.colors.status.error : theme.colors.text.primary

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: theme.colors.border.default }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
    >
      <Text style={[theme.typography.body, { color: labelColor, flex: 1 }]}>{label}</Text>
      {value ? (
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>{value}</Text>
      ) : null}
      {trailing ?? null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
})
