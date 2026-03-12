import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, type TouchableOpacityProps } from 'react-native'
import { useTheme } from '@/theme/useTheme'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'

interface ButtonProps extends TouchableOpacityProps {
  label: string
  variant?: ButtonVariant
  loading?: boolean
}

export function Button({ label, variant = 'primary', loading = false, disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme()

  const backgroundColors: Record<ButtonVariant, string> = {
    primary: theme.colors.accent.primary,
    secondary: theme.colors.bg.surfaceSecondary,
    ghost: 'transparent',
    destructive: theme.colors.status.error,
  }

  const textColors: Record<ButtonVariant, string> = {
    primary: '#FFFFFF',
    secondary: theme.colors.text.primary,
    ghost: theme.colors.accent.primary,
    destructive: '#FFFFFF',
  }

  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { backgroundColor: backgroundColors[variant], opacity: isDisabled ? 0.5 : 1 },
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <Text style={[theme.typography.bodyStrong, { color: textColors[variant] }]}>{label}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
})
