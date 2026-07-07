import { registerGlobals } from "@livekit/react-native"

// WebRTC polyfills must be registered before ANY LiveKit / WebRTC usage.
registerGlobals()

import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { AuthProvider, useAuth } from "@/lib/auth"
import { colors } from "@/lib/theme"

SplashScreen.preventAutoHideAsync()

function Root() {
  const { ready } = useAuth()

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Root />
    </AuthProvider>
  )
}
