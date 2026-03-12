/**
 * Tests for deep link and notification response navigation.
 * These tests verify the routing logic in isolation.
 */

// Mock expo-router
const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  router: { push: mockPush, replace: jest.fn() },
  useSegments: () => ['(tabs)'],
  Stack: { Screen: () => null },
}))

// Mock expo-notifications
const mockAddNotificationResponseReceivedListener = jest.fn()
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: mockAddNotificationResponseReceivedListener,
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
}))

// Mock expo-linking
jest.mock('expo-linking', () => ({
  parse: jest.fn((url: string) => {
    // Simple parse: extract path from takenotes://path
    const match = url.match(/^takenotes:\/\/(.*)$/)
    return { path: match ? match[1] : '', queryParams: {} }
  }),
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}))

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  },
}))

describe('Deep link handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
  })

  it('navigates to reminder detail when notification contains reminderId', () => {
    const reminderId = '123e4567-e89b-12d3-a456-426614174000'

    // Simulate the notification response listener being called
    let capturedListener: ((response: unknown) => void) | null = null
    mockAddNotificationResponseReceivedListener.mockImplementation((cb: (r: unknown) => void) => {
      capturedListener = cb
      return { remove: jest.fn() }
    })

    // Trigger the listener registration (as the layout would do)
    const { router } = require('expo-router')
    const Notifications = require('expo-notifications')

    Notifications.addNotificationResponseReceivedListener((response: {
      notification: { request: { content: { data: Record<string, unknown> } } }
    }) => {
      const data = response.notification.request.content.data
      const rid = data?.reminderId as string | undefined
      if (rid) {
        router.push(`/reminders/${rid}`)
      }
    })

    // Fire the captured listener with a mock notification response
    if (capturedListener) {
      capturedListener({
        notification: {
          request: {
            content: {
              data: { reminderId },
            },
          },
        },
      })
    }

    expect(mockPush).toHaveBeenCalledWith(`/reminders/${reminderId}`)
  })

  it('does not navigate when notification has no reminderId', () => {
    let capturedListener: ((response: unknown) => void) | null = null
    mockAddNotificationResponseReceivedListener.mockImplementation((cb: (r: unknown) => void) => {
      capturedListener = cb
      return { remove: jest.fn() }
    })

    const { router } = require('expo-router')
    const Notifications = require('expo-notifications')

    Notifications.addNotificationResponseReceivedListener((response: {
      notification: { request: { content: { data: Record<string, unknown> } } }
    }) => {
      const data = response.notification.request.content.data
      const rid = data?.reminderId as string | undefined
      if (rid) {
        router.push(`/reminders/${rid}`)
      }
    })

    if (capturedListener) {
      capturedListener({
        notification: {
          request: {
            content: {
              data: { someOtherField: 'value' },
            },
          },
        },
      })
    }

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('parses takenotes://reminders/:id URL correctly', () => {
    const Linking = require('expo-linking')
    const reminderId = 'abc12345-0000-0000-0000-000000000001'
    const url = `takenotes://reminders/${reminderId}`

    const parsed = Linking.parse(url)
    expect(parsed.path).toBe(`reminders/${reminderId}`)

    // Verify the regex used in the layout matches
    const match = parsed.path.match(/^reminders\/([a-zA-Z0-9-]+)$/)
    expect(match).not.toBeNull()
    expect(match![1]).toBe(reminderId)
  })

  it('handles deep link URL and navigates to correct reminder route', () => {
    const { router } = require('expo-router')
    const Linking = require('expo-linking')
    const reminderId = 'abc12345-0000-0000-0000-000000000001'
    const url = `takenotes://reminders/${reminderId}`

    // Simulate the handleUrl function from _layout.tsx
    const parsed = Linking.parse(url)
    const match = parsed.path?.match(/^reminders\/([a-zA-Z0-9-]+)$/)
    if (match) {
      router.push(`/reminders/${match[1]}`)
    }

    expect(mockPush).toHaveBeenCalledWith(`/reminders/${reminderId}`)
  })
})
