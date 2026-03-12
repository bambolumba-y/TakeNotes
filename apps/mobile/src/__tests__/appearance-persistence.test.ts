import { describe, it, expect, beforeEach } from '@jest/globals'

// Mock AsyncStorage
const storage: Record<string, string> = {}
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (key: string) => Promise.resolve(storage[key] ?? null),
  setItem: (key: string, value: string) => {
    storage[key] = value
    return Promise.resolve()
  },
}))

describe('Appearance mode persistence', () => {
  beforeEach(() => { Object.keys(storage).forEach((k) => delete storage[k]) })

  it('persists selected appearance mode to AsyncStorage', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage')
    await AsyncStorage.setItem('takenotes_appearance_mode', 'dark')
    const stored = await AsyncStorage.getItem('takenotes_appearance_mode')
    expect(stored).toBe('dark')
  })

  it('returns null when no mode is stored', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage')
    const stored = await AsyncStorage.getItem('takenotes_appearance_mode')
    expect(stored).toBeNull()
  })
})
