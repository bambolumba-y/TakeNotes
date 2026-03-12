import { Tabs } from 'expo-router'
import { router } from 'expo-router'
import { useTheme } from '@/theme/useTheme'
import { FAB } from '@/components/FAB'
import { View, Text } from 'react-native'
import { useI18n } from '@/lib/i18n'

export default function TabLayout() {
  const theme = useTheme()
  const { t } = useI18n()

  const FAB_ACTIONS = [
    { label: t('newNote'), onPress: () => router.push('/notes/new') },
    { label: t('newReminder'), onPress: () => router.push('/reminders/new') },
    { label: t('newFolder'), onPress: () => router.push({ pathname: '/(tabs)/organize', params: { createFolder: 'true' } }) },
    { label: t('newTheme'), onPress: () => router.push({ pathname: '/(tabs)/organize', params: { createTheme: 'true' } }) },
  ]

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
          options={{ title: t('notes'), tabBarIcon: ({ color }) => <TabIcon name="notes" color={color} /> }}
        />
        <Tabs.Screen
          name="reminders"
          options={{ title: t('reminders'), tabBarIcon: ({ color }) => <TabIcon name="reminders" color={color} /> }}
        />
        <Tabs.Screen
          name="archive"
          options={{ title: t('archive'), tabBarIcon: ({ color }) => <TabIcon name="archive" color={color} /> }}
        />
        <Tabs.Screen
          name="organize"
          options={{ title: t('organize'), tabBarIcon: ({ color }) => <TabIcon name="organize" color={color} /> }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: t('settings'), tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} /> }}
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
  return <Text style={{ fontSize: 20 }} accessibilityLabel={name}>{icons[name]}</Text>
}
