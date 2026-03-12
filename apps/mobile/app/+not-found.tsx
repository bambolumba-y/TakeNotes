import { Redirect } from 'expo-router'
import { useAuthStore } from '../src/store/auth'

export default function NotFound() {
  const session = useAuthStore((s) => s.session)
  return <Redirect href={session ? '/(tabs)/notes' : '/(auth)/sign-in'} />
}
