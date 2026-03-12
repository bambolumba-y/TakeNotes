import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signInSchema, type SignInInput } from '@takenotes/shared'
import { useTheme } from '@/theme/useTheme'
import { InputField } from '@/components/ui/InputField'
import { Button } from '@/components/ui/Button'
import { signIn } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'

export default function SignInScreen() {
  const theme = useTheme()
  const setSession = useAuthStore((s) => s.setSession)
  const [serverError, setServerError] = useState<string | null>(null)

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit = async (data: SignInInput) => {
    setServerError(null)
    try {
      const result = await signIn(data)
      setSession(result.session)
      router.replace('/(tabs)/notes')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign in failed')
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Welcome back</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 6 }]}>
              Sign in to continue
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <InputField
                  label="Email"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <InputField
                  label="Password"
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="password"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />

            {serverError ? (
              <Text style={[theme.typography.caption, { color: theme.colors.status.error, marginBottom: 12 }]}>
                {serverError}
              </Text>
            ) : null}

            <Button label="Sign In" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />

            <Link href="/(auth)/forgot-password" asChild>
              <Text style={[theme.typography.caption, { color: theme.colors.accent.primary, textAlign: 'center', marginTop: 16 }]}>
                Forgot password?
              </Text>
            </Link>
          </View>

          <View style={styles.footer}>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
              Don't have an account?{' '}
            </Text>
            <Link href="/(auth)/sign-up">
              <Text style={[theme.typography.bodyStrong, { color: theme.colors.accent.primary }]}>Sign up</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 32 },
  form: { marginBottom: 24 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
})
