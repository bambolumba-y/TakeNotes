import { Tabs } from 'expo-router'
import { router } from 'expo-router'
import { useTheme } from '@/theme/useTheme'
import { FAB } from '@/components/FAB'
import { View } from 'react-native'

const FAB_ACTIONS = [
  { label: 'New Note', onPress: () => router.push('/notes/new') },
  { label: 'New Reminder', onPress: () => router.push('/reminders/new') },
  { label: 'New Folder', onPress: () => router.push({ pathname: '/(tabs)/organize', params: { createFolder: 'true' } }) },
  { label: 'New Theme', onPress: () => router.push({ pathname: '/(tabs)/organize', params: { createTheme: 'true' } }) },
]

export default function TabLayout() {
  const theme = useTheme()

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.colors.bg.surface,
            borderTopColor: theme.colors.border.default,
            borderTopWidth: theme.border.thin,
            height: 80,
            paddingBottom: 16,
            paddingTop: 8,
          },
          tabBarActiveTintColor: theme.colors.accent.primary,
          tabBarInactiveTintColor: theme.colors.text.tertiary,
          tabBarLabelStyle: {
            ...theme.typography.micro,
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="notes"
          options={{ title: 'Notes', tabBarIcon: ({ color }) => <TabIcon name="notes" color={color} /> }}
        />
        <Tabs.Screen
          name="reminders"
          options={{ title: 'Reminders', tabBarIcon: ({ color }) => <TabIcon name="reminders" color={color} /> }}
        />
        <Tabs.Screen
          name="archive"
          options={{ title: 'Archive', tabBarIcon: ({ color }) => <TabIcon name="archive" color={color} /> }}
        />
        <Tabs.Screen
          name="organize"
          options={{ title: 'Organize', tabBarIcon: ({ color }) => <TabIcon name="organize" color={color} /> }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: 'Settings', tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} /> }}
        />
      </Tabs>
      <FAB actions={FAB_ACTIONS} />
    </View>
  )
}

function TabIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, string> = {
    notes: '📝',
    reminders: '🔔',
    archive: '📦',
    organize: '🗂️',
    settings: '⚙️',
  }
  const { Text } = require('react-native')
  return <Text style={{ fontSize: 20 }} accessibilityLabel={name}>{icons[name]}</Text>
}
