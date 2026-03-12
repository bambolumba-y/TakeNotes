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
import { useNotesStore } from '@/store/notes'
import { useFoldersStore } from '@/store/folders'
import { useThemesStore } from '@/store/themes'
import { notesService } from '@/services/notes.service'
import { NoteCard } from '@/components/NoteCard'
import { SearchInput } from '@/components/SearchInput'
import { FolderStrip } from '@/components/FolderStrip'
import { useDebounce } from '@/hooks/useDebounce'

type SortOption = 'updated_at' | 'created_at' | 'title'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'updated_at', label: 'Updated' },
  { value: 'created_at', label: 'Created' },
  { value: 'title', label: 'Title' },
]

export default function NotesScreen() {
  const theme = useTheme()
  const { notes, isLoading, setQuery } = useNotesStore()
  const { folders, fetch: fetchFolders } = useFoldersStore()
  const { themes, fetch: fetchThemes } = useThemesStore()

  const [search, setSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOption>('updated_at')
  const [hasEverLoaded, setHasEverLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    fetchFolders()
    fetchThemes()
  }, [])

  useEffect(() => {
    loadNotes()
  }, [debouncedSearch, selectedFolder, selectedTheme, sort])

  async function loadNotes() {
    setError(null)
    useNotesStore.setState({ isLoading: true })
    try {
      const q = {
        archived: 'false' as const,
        q: debouncedSearch || undefined,
        folderId: selectedFolder ?? undefined,
        themeId: selectedTheme ?? undefined,
        sort,
      }
      setQuery(q)
      const data = await notesService.list(q)
      useNotesStore.setState({ notes: data, isLoading: false })
      setHasEverLoaded(true)
    } catch {
      setError('Something went wrong')
      useNotesStore.setState({ isLoading: false })
    }
  }

  const handleFolderSelect = useCallback((id: string | null) => {
    setSelectedFolder(id)
  }, [])

  const handleThemeSelect = useCallback((id: string | null) => {
    setSelectedTheme((prev) => (prev === id ? null : id))
  }, [])

  const handleSortSelect = useCallback((value: SortOption) => {
    setSort(value)
  }, [])

  const clearFilters = () => {
    setSearch('')
    setSelectedFolder(null)
    setSelectedTheme(null)
    setSort('updated_at')
  }

  const hasActiveFilters = !!search || !!selectedFolder || !!selectedTheme || sort !== 'updated_at'
  const pinned = notes.filter((n) => n.isPinned)
  const recent = notes.filter((n) => !n.isPinned)

  if (isLoading && !hasEverLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
        <View style={styles.header}>
          <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Notes</Text>
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
          <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Notes</Text>
        </View>
        <View style={styles.centered}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text.primary, textAlign: 'center' }]}>
            Something went wrong
          </Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: theme.colors.accent.soft, marginTop: 16 }]}
            onPress={loadNotes}
          >
            <Text style={[theme.typography.bodyStrong, { color: theme.colors.accent.primary }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      <View style={styles.header}>
        <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Notes</Text>
      </View>

      <SearchInput value={search} onChangeText={setSearch} placeholder="Search notes..." />
      <FolderStrip folders={folders} selectedId={selectedFolder} onSelect={handleFolderSelect} />

      {/* Sort + Theme filter bar */}
      <View style={styles.filterBar}>
        {/* Sort chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {SORT_OPTIONS.map((opt) => {
            const isActive = sort === opt.value
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
                onPress={() => handleSortSelect(opt.value)}
                accessibilityLabel={`Sort by ${opt.label}`}
              >
                <Text style={[theme.typography.captionStrong, { color: isActive ? theme.colors.accent.primary : theme.colors.text.secondary }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            )
          })}

          {themes.length > 0 && (
            <View style={[styles.divider, { backgroundColor: theme.colors.border.default }]} />
          )}

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
      </View>

      {notes.length === 0 && !isLoading && hasActiveFilters ? (
        // Empty filtered result state
        <View style={styles.centered}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🔍</Text>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text.primary, textAlign: 'center' }]}>
            No results for your search
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: 'center', marginTop: 8 }]}>
            Try adjusting your filters or search term
          </Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: theme.colors.accent.soft, marginTop: 16 }]}
            onPress={clearFilters}
          >
            <Text style={[theme.typography.bodyStrong, { color: theme.colors.accent.primary }]}>Clear filters</Text>
          </TouchableOpacity>
        </View>
      ) : notes.length === 0 && !isLoading ? (
        // Empty dataset state
        <View style={styles.centered}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📝</Text>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text.primary, textAlign: 'center' }]}>
            No notes yet
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: 'center', marginTop: 8 }]}>
            Tap the + button to create your first note
          </Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: theme.colors.accent.soft, marginTop: 20 }]}
            onPress={() => router.push('/notes/new')}
          >
            <Text style={[theme.typography.bodyStrong, { color: theme.colors.accent.primary }]}>Create note</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => ''}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={loadNotes}
              tintColor={theme.colors.accent.primary}
            />
          }
          ListHeaderComponent={
            <>
              {pinned.length > 0 && (
                <View style={styles.section}>
                  <Text
                    style={[
                      theme.typography.captionStrong,
                      { color: theme.colors.text.tertiary, marginBottom: 8, paddingHorizontal: 16 },
                    ]}
                  >
                    PINNED
                  </Text>
                  {pinned.map((note) => (
                    <View key={note.id} style={{ paddingHorizontal: 16 }}>
                      <NoteCard note={note} onPress={() => router.push(`/notes/${note.id}`)} />
                    </View>
                  ))}
                </View>
              )}
              {recent.length > 0 && (
                <View style={styles.section}>
                  <Text
                    style={[
                      theme.typography.captionStrong,
                      { color: theme.colors.text.tertiary, marginBottom: 8, paddingHorizontal: 16 },
                    ]}
                  >
                    RECENT
                  </Text>
                  {recent.map((note) => (
                    <View key={note.id} style={{ paddingHorizontal: 16 }}>
                      <NoteCard note={note} onPress={() => router.push(`/notes/${note.id}`)} />
                    </View>
                  ))}
                </View>
              )}
            </>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  filterBar: { marginBottom: 4 },
  filterRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
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
  section: { marginBottom: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  ctaButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
})
