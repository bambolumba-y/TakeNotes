import { getLocales } from 'expo-localization'
import { create } from 'zustand'

const translations = {
  en: {
    notes: 'Notes',
    reminders: 'Reminders',
    archive: 'Archive',
    organize: 'Organize',
    settings: 'Settings',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    nickname: 'Nickname',
    timezone: 'Timezone',
    language: 'Language',
    appearance: 'Appearance',
    account: 'Account',
    about: 'About',
    signOut: 'Sign Out',
    save: 'Save',
    cancel: 'Cancel',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    restore: 'Restore',
    complete: 'Complete',
    snooze: 'Snooze',
    noNotesYet: 'No notes yet',
    noRemindersYet: 'No reminders yet',
    archiveEmpty: 'Archive is empty',
    createNote: 'Create note',
    createReminder: 'Create reminder',
    newNote: 'New Note',
    newReminder: 'New Reminder',
    newFolder: 'New Folder',
    newTheme: 'New Theme',
    title: 'Title',
    description: 'Description',
    dueDate: 'Due date',
    dueTime: 'Due time',
    priority: 'Priority',
    channels: 'Channels',
    folder: 'Folder',
    themes: 'Themes',
    repeat: 'Repeat',
    active: 'Active',
    today: 'Today',
    upcoming: 'Upcoming',
    overdue: 'Overdue',
    all: 'All',
    pinned: 'Pinned',
    recent: 'Recent',
    search: 'Search',
    confirmEmailSent:
      'Confirmation email sent. Please check your inbox and verify your account.',
    passwordMismatch: 'Passwords do not match',
    weakPassword: 'Password must be at least 8 characters',
    invalidEmail: 'Please enter a valid email',
    duplicateEmail: 'An account with this email already exists',
    networkError: 'Connection failed. Please try again.',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  },
  ru: {
    notes: 'Заметки',
    reminders: 'Напоминания',
    archive: 'Архив',
    organize: 'Организация',
    settings: 'Настройки',
    signIn: 'Войти',
    signUp: 'Регистрация',
    email: 'Email',
    password: 'Пароль',
    confirmPassword: 'Подтвердите пароль',
    nickname: 'Никнейм',
    timezone: 'Часовой пояс',
    language: 'Язык',
    appearance: 'Оформление',
    account: 'Аккаунт',
    about: 'О приложении',
    signOut: 'Выйти',
    save: 'Сохранить',
    cancel: 'Отмена',
    create: 'Создать',
    edit: 'Изменить',
    delete: 'Удалить',
    restore: 'Восстановить',
    complete: 'Завершить',
    snooze: 'Отложить',
    noNotesYet: 'Заметок пока нет',
    noRemindersYet: 'Напоминаний пока нет',
    archiveEmpty: 'Архив пуст',
    createNote: 'Создать заметку',
    createReminder: 'Создать напоминание',
    newNote: 'Новая заметка',
    newReminder: 'Новое напоминание',
    newFolder: 'Новая папка',
    newTheme: 'Новая тема',
    title: 'Заголовок',
    description: 'Описание',
    dueDate: 'Дата',
    dueTime: 'Время',
    priority: 'Приоритет',
    channels: 'Каналы',
    folder: 'Папка',
    themes: 'Темы',
    repeat: 'Повтор',
    active: 'Активные',
    today: 'Сегодня',
    upcoming: 'Предстоящие',
    overdue: 'Просроченные',
    all: 'Все',
    pinned: 'Закреплённые',
    recent: 'Недавние',
    search: 'Поиск',
    confirmEmailSent: 'Письмо с подтверждением отправлено. Проверьте почту.',
    passwordMismatch: 'Пароли не совпадают',
    weakPassword: 'Пароль должен содержать не менее 8 символов',
    invalidEmail: 'Введите корректный email',
    duplicateEmail: 'Аккаунт с таким email уже существует',
    networkError: 'Ошибка соединения. Попробуйте снова.',
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
    urgent: 'Срочный',
  },
} as const

type Locale = keyof typeof translations
type TranslationKey = keyof typeof translations.en

function detectLocale(): Locale {
  try {
    const locales = getLocales()
    const lang = locales[0]?.languageCode ?? 'en'
    if (lang === 'ru') return 'ru'
  } catch {
    // getLocales may throw in some environments
  }
  return 'en'
}

interface I18nStore {
  locale: Locale
  t: (key: TranslationKey) => string
  setLocale: (locale: Locale) => void
}

export const useI18n = create<I18nStore>((set, get) => ({
  locale: detectLocale(),
  t: (key) => {
    const current = get().locale
    return (translations[current] as Record<string, string>)[key]
      ?? (translations.en as Record<string, string>)[key]
      ?? key
  },
  setLocale: (locale) =>
    set({
      locale,
      t: (key) => {
        return (translations[locale] as Record<string, string>)[key]
          ?? (translations.en as Record<string, string>)[key]
          ?? key
      },
    }),
}))

export type { Locale, TranslationKey }
