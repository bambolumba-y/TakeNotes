import { renderHook, act } from '@testing-library/react-native'
import { useDebounce } from '../hooks/useDebounce'

// Use fake timers for debounce tests
beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('does not update before the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } },
    )

    rerender({ value: 'changed', delay: 300 })

    // Advance time by less than the debounce delay
    act(() => {
      jest.advanceTimersByTime(200)
    })

    // Should still be the initial value
    expect(result.current).toBe('initial')
  })

  it('updates after the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } },
    )

    rerender({ value: 'changed', delay: 300 })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(result.current).toBe('changed')
  })

  it('resets the timer on consecutive rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } },
    )

    rerender({ value: 'ab', delay: 300 })
    act(() => { jest.advanceTimersByTime(100) })

    rerender({ value: 'abc', delay: 300 })
    act(() => { jest.advanceTimersByTime(100) })

    // 200ms elapsed total — still should not have updated
    expect(result.current).toBe('a')

    // Advance to complete the final debounce
    act(() => { jest.advanceTimersByTime(300) })
    expect(result.current).toBe('abc')
  })

  it('handles numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: number; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 100 } },
    )

    rerender({ value: 42, delay: 100 })
    act(() => { jest.advanceTimersByTime(100) })
    expect(result.current).toBe(42)
  })
})

describe('notes search query propagation', () => {
  it('notes store setQuery updates query correctly', () => {
    // Import the actual store and verify setQuery updates the query field
    const { useNotesStore } = require('../store/notes')
    const { getState } = useNotesStore

    act(() => {
      getState().setQuery({ q: 'test search', sort: 'title' })
    })

    const state = getState()
    expect(state.query.q).toBe('test search')
    expect(state.query.sort).toBe('title')
  })

  it('notes store setQuery with themeId filter is stored', () => {
    const { useNotesStore } = require('../store/notes')
    const { getState } = useNotesStore

    const themeId = '123e4567-e89b-12d3-a456-426614174000'
    act(() => {
      getState().setQuery({ themeId })
    })

    expect(getState().query.themeId).toBe(themeId)
  })
})
