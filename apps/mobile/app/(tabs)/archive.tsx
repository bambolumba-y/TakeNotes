import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/useTheme'
import { useNotesStore } from '@/store/notes'
import { useRemindersStore } from '@/store/reminders'
import { useFoldersStore } from '@/store/folders'
import { SearchInput } from '@/components/SearchInput'
import { useDebounce } from '@/hooks/useDebounce'
import { useI18n } from '@/lib/i18n'

type FilterTab = 'all' | 'notes' | 'reminders'
type DateRange = 'all' | 'last7' | 'last30'

function getDateRangeCutoff(range: DateRange): Date | null {
  if (range === 'all') return null
  const now = new Date()
  if (range === 'last7') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  if (range === 'last30') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return null
}

export default function ArchiveScreen() {
  const theme = useTheme()
  const { t } = useI18n()

  const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
    { value: 'all', label: t('allTime') },
    { value: 'last7', label: t('last7Days') },
    { value: 'last30', label: t('last30Days') },
  ]
  const { archivedNotes, isLoading: notesLoading, fetchArchived: fetchArchivedNotes, restore: restoreNote } = useNotesStore()
  const { archivedReminders, isLoading: remindersLoading, fetchArchived: fetchArchivedReminders, restore: restoreReminder } = useRemindersStore()
  const { folders, fetch: fetchFolders } = useFoldersStore()

  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [hasEverLoaded, setHasEverLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)
  const isLoading = notesLoading || remindersLoading

  useEffect(() => {
    loadArchive()
    fetchFolders()
  }, [])

  async function loadArchive() {
    setError(null)
    try {
      await Promise.all([fetchArchivedNotes(), fetchArchivedReminders()])
      setHasEverLoaded(true)
    } catch {
      setError(t('somethingWentWrong'))
    }
  }

  const cutoff = getDateRangeCutoff(dateRange)

  const matchesSearch = useCallback((text: string) =>
    !debouncedSearch || text.toLowerCase().includes(debouncedSearch.toLowerCase()),
  [debouncedSearch])

  const matchesDateRange = useCallback((dateStr: string) => {
    if (!cutoff) return true
    return new Date(dateStr) >= cutoff
  }, [cutoff])

  const noteItems = archivedNotes
    .filter((n) => (matchesSearch(n.title) || matchesSearch(n.contentPlain)))
    .filter((n) => matchesDateRange(n.updatedAt))
    .filter((n) => !selectedFolder || n.folderId === selectedFolder)
    .map((n) => ({ ...n, itemType: 'note' as const }))

  const reminderItems = archivedReminders
    .filter((r) => (matchesSearch(r.title) || matchesSearch(r.description ?? '')))
    .filter((r) => matchesDateRange(r.updatedAt))
    .map((r) => ({ ...r, itemType: 'reminder' as const }))

  const items =
    filter === 'notes' ? noteItems :
    filter === 'reminders' ? reminderItems :
    [...noteItems, ...reminderItems].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('all') },
    { key: 'notes', label: t('notes') },
    { key: 'reminders', label: t('reminders') },
  ]

  const hasActiveFilters = !!debouncedSearch || dateRange !== 'all' || !!selectedFolder
  const totalItems = archivedNotes.length + archivedReminders.length

  const clearFilters = () => {
    setSearch('')
    setDateRange('all')
    setSelectedFolder(null)
  }

  if (isLoading && !hasEverLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
        <View style={styles.header}>
          <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>{t('archive')}</Text>
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
          <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>{t('archive')}</Text>
        </View>
        <View style={styles.centered}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text.primary, textAlign: 'center' }]}>
            {t('somethingWentWrong')}
          </Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: theme.colors.accent.soft, marginTop: 16 }]}
            onPress={loadArchive}
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
        <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>{t('archive')}</Text>
      </View>

      <SearchInput value={search} onChangeText={setSearch} placeholder={t('searchArchive')} />

      {/* Type filter chips */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.key
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? theme.colors.accent.soft : theme.colors.bg.surfaceSecondary,
                  borderColor: isActive ? theme.colors.accent.primary : 'transparent',
                },
              ]}
              onPress={() => setFilter(tab.key)}
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

      {/* Extended filters: Date range + Folder */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.extFilterRow}
        style={styles.extFilterScroll}
      >
        {/* Date range */}
        {DATE_RANGE_OPTIONS.map((opt) => {
          const isActive = dateRange === opt.value
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? theme.colors.accent.soft : theme.colors.bg.surfaceSecondary,
                  borderColor: isActive ? theme.colors.accent.primary : theme.colors.border.default,
                },
              ]}
              onPress={() => setDateRange(opt.value)}
              accessibilityLabel={opt.label}
            >
              <Text
                style={[
                  theme.typography.captionStrong,
                  { color: isActive ? theme.colors.accent.primary : theme.colors.text.secondary },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          )
        })}

        {/* Folder filter — only relevant when showing notes */}
        {(filter === 'all' || filter === 'notes') && folders.length > 0 && (
          <View style={[styles.divider, { backgroundColor: theme.colors.border.default }]} />
        )}
        {(filter === 'all' || filter === 'notes') && folders.map((folder) => {
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
              onPress={() => setSelectedFolder((prev) => prev === folder.id ? null : folder.id)}
              accessibilityLabel={folder.name}
            >
              <Text style={{ fontSize: 12, marginRight: 3 }}>📁</Text>
              <Text style={[theme.typography.captionStrong, { color: isActive ? folder.color : theme.colors.text.secondary }]}>
                {folder.name}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {items.length === 0 && !isLoading && hasActiveFilters ? (
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
      ) : items.length === 0 && !isLoading ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📦</Text>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text.primary, textAlign: 'center' }]}>
            {t('archiveEmpty')}
          </Text>
          <Text
            style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: 'center', marginTop: 8 }]}
          >
            {t('archiveEmptyBody')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.itemType}-${item.id}`}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={loadArchive}
              tintColor={theme.colors.accent.primary}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.item,
                { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.default },
              ]}
              onPress={() =>
                router.push(item.itemType === 'note' ? `/notes/${item.id}` : `/reminders/${item.id}`)
              }
            >
              <View style={styles.itemLeft}>
                <View
                  style={[
                    styles.typeTag,
                    {
                      backgroundColor:
                        item.itemType === 'note'
                          ? theme.colors.accent.soft
                          : theme.colors.status.success + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      theme.typography.micro,
                      {
                        color:
                          item.itemType === 'note'
                            ? theme.colors.accent.primary
                            : theme.colors.status.success,
                      },
                    ]}
                  >
                    {item.itemType === 'note' ? t('note').toUpperCase() : t('reminder').toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[theme.typography.cardTitle, { color: theme.colors.text.primary, marginTop: 4 }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text style={[theme.typography.caption, { color: theme.colors.text.tertiary, marginTop: 2 }]}>
                  {new Date(item.updatedAt).toLocaleDateString()}
                </Text>
              </View>
              {item.itemType === 'note' && (
                <TouchableOpacity
                  style={[styles.restoreBtn, { backgroundColor: theme.colors.accent.soft }]}
                  onPress={() => restoreNote(item.id)}
                >
                  <Text style={[theme.typography.captionStrong, { color: theme.colors.accent.primary }]}>
                    {t('restore')}
                  </Text>
                </TouchableOpacity>
              )}
              {item.itemType === 'reminder' && (
                <TouchableOpacity
                  style={[styles.restoreBtn, { backgroundColor: theme.colors.bg.surfaceSecondary }]}
                  onPress={() => restoreReminder(item.id)}
                >
                  <Text style={[theme.typography.captionStrong, { color: theme.colors.text.secondary }]}>
                    {t('restore')}
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  extFilterScroll: { flexGrow: 0, marginBottom: 8 },
  extFilterRow: { paddingHorizontal: 16, paddingBottom: 4, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5 },
  divider: { width: 1, height: 20, marginHorizontal: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  itemLeft: { flex: 1, marginRight: 12 },
  typeTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  restoreBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  ctaButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
})
