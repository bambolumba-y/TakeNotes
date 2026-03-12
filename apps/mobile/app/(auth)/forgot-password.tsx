import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@takenotes/shared'
import { useTheme } from '@/theme/useTheme'
import { InputField } from '@/components/ui/InputField'
import { Button } from '@/components/ui/Button'
import { forgotPassword } from '@/services/auth.service'

export default function ForgotPasswordScreen() {
  const theme = useTheme()
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    setServerError(null)
    try {
      await forgotPassword(data)
      setSent(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Request failed')
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Button label="Back" variant="ghost" onPress={() => router.back()} style={styles.back} />

        <View style={styles.header}>
          <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Reset password</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 6 }]}>
            {sent ? 'Check your email for a reset link.' : "We'll send a reset link to your email."}
          </Text>
        </View>

        {!sent && (
          <View>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <InputField
                  label="Email"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />
            {serverError ? (
              <Text style={[theme.typography.caption, { color: theme.colors.status.error, marginBottom: 12 }]}>
                {serverError}
              </Text>
            ) : null}
            <Button label="Send Reset Link" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24 },
  back: { alignSelf: 'flex-start', marginBottom: 24, paddingHorizontal: 0 },
  header: { marginBottom: 32 },
})
