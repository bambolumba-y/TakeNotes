import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/useTheme'

interface SearchInputProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
}

export function SearchInput({ value, onChangeText, placeholder = 'Search...' }: SearchInputProps) {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.bg.input,
          borderColor: focused ? theme.colors.accent.primary : theme.colors.border.default,
        },
      ]}
    >
      <Text style={[styles.icon, { color: theme.colors.text.tertiary }]}>🔍</Text>
      <TextInput
        style={[theme.typography.body, styles.input, { color: theme.colors.text.primary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.tertiary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel="Search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} accessibilityLabel="Clear search">
          <Text style={[styles.icon, { color: theme.colors.text.tertiary }]}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 44,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  input: { flex: 1, marginLeft: 8, marginRight: 4 },
  icon: { fontSize: 16 },
})
