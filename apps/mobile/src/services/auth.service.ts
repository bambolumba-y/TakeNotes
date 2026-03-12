import { supabase } from '../lib/supabase'
import type { SignInInput, SignUpInput, ForgotPasswordInput } from '@takenotes/shared'

export async function signIn({ email, password }: SignInInput) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signUp({ email, password }: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function forgotPassword({ email }: ForgotPasswordInput) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw new Error(error.message)
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}
