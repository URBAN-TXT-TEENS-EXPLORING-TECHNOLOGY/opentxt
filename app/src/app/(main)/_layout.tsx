import { Redirect, Stack } from "expo-router"
import { useAuth } from "@/lib/auth"
import { colors } from "@/lib/theme"

export default function MainLayout() {
  const { token } = useAuth()
  if (token === null) return <Redirect href="/sign-in" />
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
    />
  )
}
