import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/useTheme'
import { useRemindersStore } from '@/store/reminders'
import { useFoldersStore } from '@/store/folders'
import { useThemesStore } from '@/store/themes'
import { remindersService } from '@/services/reminders.service'
import { ReminderCard } from '@/components/ReminderCard'
import { SearchInput } from '@/components/SearchInput'
import { useDebounce } from '@/hooks/useDebounce'
import { useI18n } from '@/lib/i18n'

type Tab = { key: 'active' | 'today' | 'upcoming' | 'overdue'; label: string }
type SortOption = 'due_at' | 'updated_at'

export default function RemindersScreen() {
  const theme = useTheme()
  const { t } = useI18n()

  const TABS: Tab[] = [
    { key: 'active', label: t('active') },
    { key: 'today', label: t('today') },
    { key: 'upcoming', label: t('upcoming') },
    { key: 'overdue', label: t('overdue') },
  ]

  const EMPTY_MESSAGES: Record<string, { icon: string; title: string; body: string }> = {
    active: { icon: '🔔', title: t('noRemindersYet'), body: t('noRemindersYetBody') },
    today: { icon: '📅', title: t('noRemindersYet'), body: t('noRemindersYetBody') },
    upcoming: { icon: '🗓️', title: t('noRemindersYet'), body: t('noRemindersYetBody') },
    overdue: { icon: '✅', title: t('noRemindersYet'), body: t('noRemindersYetBody') },
  }
  const { reminders, isLoading, activeView, setView } = useRemindersStore()
  const { folders, fetch: fetchFolders } = useFoldersStore()
  const { themes, fetch: fetchThemes } = useThemesStore()

  const [search, setSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOption>('due_at')
  const [hasEverLoaded, setHasEverLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    fetchFolders()
    fetchThemes()
  }, [])

  useEffect(() => {
    loadReminders()
  }, [debouncedSearch, selectedFolder, selectedTheme, sort, activeView])

  // Device IANA timezone for smart view date boundaries
  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  async function loadReminders(overrideView?: Tab['key']) {
    setError(null)
    useRemindersStore.setState({ isLoading: true })
    try {
      const store = useRemindersStore.getState()
      const view = overrideView ?? store.activeView
      const data = await remindersService.list({
        view,
        q: debouncedSearch || undefined,
        folderId: selectedFolder ?? undefined,
        themeId: selectedTheme ?? undefined,
        sort,
        timezone: deviceTimezone,
      })
      useRemindersStore.setState({ reminders: data, isLoading: false })
      setHasEverLoaded(true)
    } catch {
      setError(t('somethingWentWrong'))
      useRemindersStore.setState({ isLoading: false })
    }
  }

  const handleTabChange = useCallback((key: Tab['key']) => {
    setView(key)
    loadReminders(key)
  }, [debouncedSearch, selectedFolder, selectedTheme, sort])

  const handleFolderSelect = useCallback((id: string | null) => {
    setSelectedFolder((prev) => (prev === id ? null : id))
  }, [])

  const handleThemeSelect = useCallback((id: string | null) => {
    setSelectedTheme((prev) => (prev === id ? null : id))
  }, [])

  const clearFilters = useCallback(() => {
    setSearch('')
    setSelectedFolder(null)
    setSelectedTheme(null)
    setSort('due_at')
  }, [])

  const hasActiveFilters = !!search || !!selectedFolder || !!selectedTheme || sort !== 'due_at'
  const empty = EMPTY_MESSAGES[activeView]

  if (isLoading && !hasEverLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
        <View style={styles.header}>
          <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>{t('reminders')}</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.accent.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
        <View style={styles.header}>
          <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>{t('reminders')}</Text>
        </View>
        <View style={styles.centered}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text.primary, textAlign: 'center' }]}>
            {t('somethingWentWrong')}
          </Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: theme.colors.accent.soft, marginTop: 16 }]}
            onPress={() => loadReminders()}
          >
            <Text style={[theme.typography.bodyStrong, { color: theme.colors.accent.primary }]}>{t('tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      <View style={styles.header}>
        <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>{t('reminders')}</Text>
      </View>

      {/* Subtabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = activeView === tab.key
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? theme.colors.accent.soft : 'transparent',
                  borderColor: isActive ? theme.colors.accent.primary : 'transparent',
                },
              ]}
              onPress={() => handleTabChange(tab.key)}
              accessibilityLabel={tab.label}
            >
              <Text
                style={[
                  theme.typography.captionStrong,
                  { color: isActive ? theme.colors.accent.primary : theme.colors.text.secondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <SearchInput value={search} onChangeText={setSearch} placeholder={t('searchReminders')} />

      {/* Sort + Folder + Theme filter row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {/* Sort */}
        {(['due_at', 'updated_at'] as SortOption[]).map((s) => {
          const label = s === 'due_at' ? t('sortByDueDate') : t('sortByUpdated')
          const isActive = sort === s
          return (
            <TouchableOpacity
              key={s}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? theme.colors.accent.soft : theme.colors.bg.surfaceSecondary,
                  borderColor: isActive ? theme.colors.accent.primary : theme.colors.border.default,
                },
              ]}
              onPress={() => setSort(s)}
              accessibilityLabel={`Sort by ${label}`}
            >
              <Text style={[theme.typography.captionStrong, { color: isActive ? theme.colors.accent.primary : theme.colors.text.secondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}

        {folders.length > 0 && (
          <View style={[styles.divider, { backgroundColor: theme.colors.border.default }]} />
        )}

        {/* Folder filter */}
        {folders.map((folder) => {
          const isActive = selectedFolder === folder.id
          return (
            <TouchableOpacity
              key={folder.id}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? folder.color + '30' : theme.colors.bg.surfaceSecondary,
                  borderColor: isActive ? folder.color : theme.colors.border.default,
                },
              ]}
              onPress={() => handleFolderSelect(folder.id)}
              accessibilityLabel={folder.name}
            >
              <Text style={{ fontSize: 12, marginRight: 3 }}>📁</Text>
              <Text style={[theme.typography.captionStrong, { color: isActive ? folder.color : theme.colors.text.secondary }]}>
                {folder.name}
              </Text>
            </TouchableOpacity>
          )
        })}

        {themes.length > 0 && (
          <View style={[styles.divider, { backgroundColor: theme.colors.border.default }]} />
        )}

        {/* Theme filter */}
        {themes.map((t) => {
          const isActive = selectedTheme === t.id
          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? t.color + '30' : theme.colors.bg.surfaceSecondary,
                  borderColor: isActive ? t.color : theme.colors.border.default,
                },
              ]}
              onPress={() => handleThemeSelect(t.id)}
              accessibilityLabel={`Filter by theme ${t.name}`}
            >
              <Text style={{ fontSize: 12, marginRight: 3 }}>🏷️</Text>
              <Text style={[theme.typography.captionStrong, { color: isActive ? t.color : theme.colors.text.secondary }]}>
                {t.name}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {reminders.length === 0 && !isLoading && hasActiveFilters ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🔍</Text>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text.primary, textAlign: 'center' }]}>
            {t('noResults')}
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: 'center', marginTop: 8 }]}>
            {t('tryAdjustingFilters')}
          </Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: theme.colors.accent.soft, marginTop: 16 }]}
            onPress={clearFilters}
          >
            <Text style={[theme.typography.bodyStrong, { color: theme.colors.accent.primary }]}>{t('clearFilters')}</Text>
          </TouchableOpacity>
        </View>
      ) : reminders.length === 0 && !isLoading ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>{empty.icon}</Text>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text.primary, textAlign: 'center' }]}>
            {empty.title}
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: 'center', marginTop: 8 }]}>
            {empty.body}
          </Text>
          {activeView === 'active' && (
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: theme.colors.accent.soft, marginTop: 20 }]}
              onPress={() => router.push('/reminders/new')}
            >
              <Text style={[theme.typography.bodyStrong, { color: theme.colors.accent.primary }]}>{t('createReminder')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16 }}>
              <ReminderCard reminder={item} onPress={() => router.push(`/reminders/${item.id}`)} />
            </View>
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => loadReminders()}
              tintColor={theme.colors.accent.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5 },
  filterScroll: { flexGrow: 0, marginBottom: 8 },
  filterRow: { paddingHorizontal: 16, paddingBottom: 4, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  divider: { width: 1, height: 20, marginHorizontal: 4 },
  list: { paddingBottom: 120 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  ctaButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
})
