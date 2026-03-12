import React, { useState } from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/useTheme'

const FAB_SIZE = 56
const FAB_BOTTOM_OFFSET = 80 + 16 // tab bar height + margin
const FAB_RIGHT_OFFSET = 20

type FABAction = {
  label: string
  onPress: () => void
}

type FABProps = {
  actions?: FABAction[]
}

export function FAB({ actions = [] }: FABProps) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <View style={[styles.container, { bottom: FAB_BOTTOM_OFFSET, right: FAB_RIGHT_OFFSET }]}>
      {open && (
        <View style={[styles.menu, { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.default }]}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.menuItem]}
              onPress={() => { setOpen(false); action.onPress() }}
              accessibilityLabel={action.label}
            >
              <Text style={[theme.typography.bodyStrong, { color: theme.colors.text.primary }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: theme.colors.accent.primary },
          theme.colors.shadow.fab,
        ]}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.85}
        accessibilityLabel="Open actions menu"
        accessibilityRole="button"
      >
        <Text style={styles.fabIcon}>{open ? '✕' : '+'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'flex-end',
    zIndex: 100,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '300',
  },
  menu: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 180,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
})
