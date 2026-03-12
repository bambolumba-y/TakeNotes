import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTheme } from '@/theme/useTheme'
import { InputField } from '@/components/ui/InputField'
import { Button } from '@/components/ui/Button'
import { signUp } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth'
import { useI18n } from '@/lib/i18n'

const signUpUISchema = z
  .object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignUpUIInput = z.infer<typeof signUpUISchema>

function mapErrorMessage(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('already registered') || lower.includes('user already exists') || lower.includes('email address is already')) {
    return 'An account with this email already exists'
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection')) {
    return 'Connection failed. Please try again.'
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  return message
}

export default function SignUpScreen() {
  const theme = useTheme()
  const { t } = useI18n()
  const setSession = useAuthStore((s) => s.setSession)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpUIInput>({
    resolver: zodResolver(signUpUISchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (data: SignUpUIInput) => {
    setServerError(null)
    try {
      const result = await signUp({ email: data.email, password: data.password })
      if (result.session) {
        // Email confirmation not required — proceed directly
        setSession(result.session)
        router.replace('/(tabs)/notes')
      } else {
        // Email confirmation required — show success screen
        setShowConfirmation(true)
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Sign up failed'
      setServerError(mapErrorMessage(raw))
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.app }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Create account</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 6 }]}>
              Your notes and reminders, organized.
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <InputField
                  label={t('email')}
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
                  label={t('password')}
                  placeholder="Min 8 characters"
                  secureTextEntry
                  autoComplete="new-password"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <InputField
                  label={t('confirmPassword')}
                  placeholder="Repeat your password"
                  secureTextEntry
                  autoComplete="new-password"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            {serverError ? (
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.status.error, marginBottom: 12 },
                ]}
              >
                {serverError}
              </Text>
            ) : null}

            <Button
              label={isSubmitting ? 'Creating account...' : t('signUp')}
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              disabled={isSubmitting}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/sign-in">
              <Text style={[theme.typography.bodyStrong, { color: theme.colors.accent.primary }]}>
                {t('signIn')}
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Email confirmation modal */}
      <Modal
        visible={showConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowConfirmation(false)
          router.replace('/(auth)/sign-in')
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.bg.surface,
                borderColor: theme.colors.border.default,
              },
            ]}
          >
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: 12 }]}>
              Check your inbox
            </Text>
            <Text
              style={[
                theme.typography.body,
                { color: theme.colors.text.secondary, textAlign: 'center', marginBottom: 24 },
              ]}
            >
              {t('confirmEmailSent')}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.accent.primary }]}
              onPress={() => {
                setShowConfirmation(false)
                router.replace('/(auth)/sign-in')
              }}
            >
              <Text style={[theme.typography.bodyStrong, { color: '#FFFFFF' }]}>Go to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 32 },
  form: { marginBottom: 24 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  modalButton: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
  },
})
