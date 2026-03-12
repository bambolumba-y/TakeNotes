import React, { useState } from 'react'
import { View, TextInput, Text, StyleSheet, type TextInputProps } from 'react-native'
import { useTheme } from '@/theme/useTheme'

interface InputFieldProps extends TextInputProps {
  label: string
  error?: string
}

export function InputField({ label, error, style, ...rest }: InputFieldProps) {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)

  return (
    <View style={styles.wrapper}>
      <Text style={[theme.typography.captionStrong, { color: theme.colors.text.secondary, marginBottom: 6 }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.bg.input,
            borderColor: error
              ? theme.colors.status.error
              : focused
              ? theme.colors.accent.primary
              : theme.colors.border.default,
            color: theme.colors.text.primary,
            ...theme.typography.body,
          },
          style,
        ]}
        placeholderTextColor={theme.colors.text.tertiary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
      {error ? (
        <Text style={[theme.typography.caption, { color: theme.colors.status.error, marginTop: 4 }]}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
})
