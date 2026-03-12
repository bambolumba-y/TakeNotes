import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { useTheme } from '@/theme/useTheme'
import { useFoldersStore } from '@/store/folders'
import { useThemesStore } from '@/store/themes'
import { useNotesStore } from '@/store/notes'
import { useRemindersStore } from '@/store/reminders'
import { Button } from '@/components/ui/Button'
import { InputField } from '@/components/ui/InputField'
import { ColorPicker } from '@/components/ColorPicker'
import { IconPicker } from '@/components/IconPicker'
import { FOLDER_COLORS, FOLDER_ICONS } from '@takenotes/shared'
import type { Folder, ThemeEntity } from '@takenotes/shared'
import { useI18n } from '@/lib/i18n'

type Tab = 'themes' | 'folders'

const ICON_EMOJI: Record<string, string> = {
  'folder': '📁', 'star': '⭐', 'heart': '❤️', 'bookmark': '🔖', 'tag': '🏷️',
  'home': '🏠', 'briefcase': '💼', 'book': '📚', 'music': '🎵', 'camera': '📷',
  'code': '💻', 'coffee': '☕', 'globe': '🌍', 'map': '🗺️', 'shopping-bag': '🛍️',
  'sun': '☀️', 'moon': '🌙', 'zap': '⚡', 'flag': '🚩', 'gift': '🎁',
}

export default function OrganizeScreen() {
  const theme = useTheme()
  const { t } = useI18n()
  const params = useLocalSearchParams<{ createFolder?: string; createTheme?: string }>()
  const { folders, fetch: fetchFolders, create: createFolder, update: updateFolder, remove: removeFolder } = useFoldersStore()
  const { themes, fetch: fetchThemes, create: createTheme, update: updateTheme, remove: removeTheme } = useThemesStore()
  const { notes, fetch: fetchNotes } = useNotesStore()
  const { reminders, fetch: fetchReminders } = useRemindersStore()

  const [activeTab, setActiveTab] = useState<Tab>('themes')

  // Modal state
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<Folder | ThemeEntity | null>(null)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [color, setColor] = useState(FOLDER_COLORS[0])
  const [icon, setIcon] = useState(FOLDER_ICONS[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchFolders()
    fetchThemes()
    fetchNotes()
    fetchReminders()
  }, [])

  // Handle FAB deep-link params to auto-open the create modal
  useEffect(() => {
    if (params.createFolder === 'true') {
      setActiveTab('folders')
      openCreate('folders')
    } else if (params.createTheme === 'true') {
      setActiveTab('themes')
      openCreate('themes')
    }
  }, [params.createFolder, params.createTheme])

  const openCreate = useCallback((tab?: Tab) => {
    const t = tab ?? activeTab
    setEditingItem(null)
    setName('')
    setNameError('')
    setColor(FOLDER_COLORS[0])
    setIcon(FOLDER_ICONS[0])
    setModalVisible(true)
  }, [activeTab])

  const openEdit = useCallback((item: Folder | ThemeEntity) => {
    setEditingItem(item)
    setName(item.name)
    setColor(item.color)
    setIcon(item.icon)
    setNameError('')
    setModalVisible(true)
  }, [])

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError(t('name') + ' is required')
      return
    }
    setSaving(true)
    try {
      if (activeTab === 'folders') {
        if (editingItem) await updateFolder(editingItem.id, { name: name.trim(), color, icon })
        else await createFolder({ name: name.trim(), color, icon })
      } else {
        if (editingItem) await updateTheme(editingItem.id, { name: name.trim(), color, icon })
        else await createTheme({ name: name.trim(), color, icon })
      }
      setModalVisible(false)
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (item: Folder | ThemeEntity) => {
    Alert.alert(
      t('deleteConfirm'),
      `"${item.name}" will be removed.`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => (activeTab === 'folders' ? removeFolder(item.id) : removeTheme(item.id)),
        },
      ],
    )
  }

  // Compute item counts per folder and theme
  const notesCountByFolder = (folderId: string) =>
    notes.filter((n) => n.folderId === folderId).length
  const remindersCountByFolder = (folderId: string) =>
    reminders.filter((r) => r.folderId === folderId).length
  const notesCountByTheme = (themeId: string) =>
    notes.filter((n) => n.themes?.some((t) => t.id === themeId)).length
  const remindersCountByTheme = (themeId: string) =>
    reminders.filter((r) => r.themes?.some((t) => t.id === themeId)).length

  const items = activeTab === 'folders' ? folders : themes

  const renderItem = ({ item }: { item: Folder | ThemeEntity }) => {
    const noteCount = activeTab === 'folders'
      ? notesCountByFolder(item.id)
      : notesCountByTheme(item.id)
    const reminderCount = activeTab === 'folders'
      ? remindersCountByFolder(item.id)
      : remindersCountByTheme(item.id)

    return (
      <View
        style={[styles.item, { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.default }]}
      >
        <View style={[styles.itemIcon, { backgroundColor: item.color + '25' }]}>
          <Text style={{ fontSize: 20 }}>{ICON_EMOJI[item.icon] ?? '📁'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.bodyStrong, { color: theme.colors.text.primary }]}>{item.name}</Text>
          <Text style={[theme.typography.caption, { color: theme.colors.text.tertiary, marginTop: 2 }]}>
            {noteCount} note{noteCount !== 1 ? 's' : ''}  ·  {reminderCount} reminder{reminderCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
        <TouchableOpacity onPress={() => openEdit(item)} style={{ padding: 8 }} accessibilityLabel={t('edit')}>
          <Text style={{ color: theme.colors.accent.primary, fontSize: 14 }}>{t('edit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: 8 }} accessibilityLabel={t('delete')}>
          <Text style={{ color: theme.colors.status.error, fontSize: 14 }}>{t('delete')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      <View style={styles.header}>
        <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>{t('organize')}</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.colors.bg.surfaceSecondary }]}>
        {(['themes', 'folders'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { backgroundColor: theme.colors.bg.surface }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                theme.typography.bodyStrong,
                { color: activeTab === tab ? theme.colors.accent.primary : theme.colors.text.secondary },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={items as (Folder | ThemeEntity)[]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>{activeTab === 'folders' ? '📁' : '🏷️'}</Text>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text.primary, textAlign: 'center' }]}>
              {activeTab === 'folders' ? t('noFoldersYet') : t('noThemesYet')}
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: 'center', marginTop: 8 }]}>
              {activeTab === 'folders' ? t('createFolder') : t('createTheme')}
            </Text>
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.colors.bg.app }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border.default }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={[theme.typography.body, { color: theme.colors.accent.primary }]}>{t('cancel')}</Text>
            </TouchableOpacity>
            <Text style={[theme.typography.bodyStrong, { color: theme.colors.text.primary }]}>
              {editingItem
                ? (activeTab === 'folders' ? t('editFolder') : t('editTheme'))
                : (activeTab === 'folders' ? t('newFolder') : t('newTheme'))}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <InputField
              label={t('name')}
              value={name}
              onChangeText={(v) => { setName(v); setNameError('') }}
              placeholder={activeTab === 'folders' ? t('newFolder') : t('newTheme')}
              error={nameError}
            />

            {/* Live preview */}
            {name.trim().length > 0 && (
              <View style={[styles.preview, { backgroundColor: color + '20', borderColor: color }]}>
                <View style={[styles.previewIcon, { backgroundColor: color + '30' }]}>
                  <Text style={{ fontSize: 22 }}>{ICON_EMOJI[icon] ?? '📁'}</Text>
                </View>
                <Text style={[theme.typography.bodyStrong, { color: theme.colors.text.primary, flex: 1 }]}>
                  {name.trim()}
                </Text>
                <View style={[styles.previewDot, { backgroundColor: color }]} />
              </View>
            )}

            <Text style={[theme.typography.captionStrong, { color: theme.colors.text.secondary, marginBottom: 10, marginTop: 16 }]}>
              {t('color').toUpperCase()}
            </Text>
            <ColorPicker value={color} onChange={setColor} />

            <Text style={[theme.typography.captionStrong, { color: theme.colors.text.secondary, marginTop: 20, marginBottom: 10 }]}>
              {t('icon').toUpperCase()}
            </Text>
            <IconPicker value={icon} onChange={setIcon} />

            <View style={{ marginTop: 24 }}>
              <Button label={editingItem ? t('save') : t('create')} onPress={handleSave} loading={saving} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  item: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  itemIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: 8 },
  empty: { paddingTop: 60, alignItems: 'center', paddingHorizontal: 40 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalBody: { padding: 20, paddingBottom: 60 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  previewDot: { width: 12, height: 12, borderRadius: 6, marginLeft: 8 },
})
