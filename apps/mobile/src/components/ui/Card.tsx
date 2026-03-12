import React from 'react'
import { View, StyleSheet, type ViewProps } from 'react-native'
import { useTheme } from '@/theme/useTheme'

interface CardProps extends ViewProps {
  children: React.ReactNode
}

export function Card({ children, style, ...rest }: CardProps) {
  const theme = useTheme()
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.bg.surface,
          borderColor: theme.colors.border.default,
          ...theme.colors.shadow.card,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
})
