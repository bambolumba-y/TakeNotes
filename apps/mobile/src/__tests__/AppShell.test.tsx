import React from 'react'
import { render } from '@testing-library/react-native'
import { ThemeProvider } from '../theme/ThemeProvider'
import { Text } from 'react-native'

function TestChild() {
  return <Text>Hello</Text>
}

describe('ThemeProvider', () => {
  it('renders children without crashing', () => {
    const { getByText } = render(
      <ThemeProvider>
        <TestChild />
      </ThemeProvider>,
    )
    expect(getByText('Hello')).toBeTruthy()
  })
})
