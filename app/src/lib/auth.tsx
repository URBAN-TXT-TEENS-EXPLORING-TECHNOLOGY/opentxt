import * as SecureStore from "expo-secure-store"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { api, type User } from "./api"

const TOKEN_KEY = "opentxt.token"
const USER_KEY = "opentxt.user"

type AuthState = {
  /** null until the stored session has been read. */
  ready: boolean
  token: string | null
  user: User | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/** Session provider — token + user persisted in the device keychain. */
export function AuthProvider(props: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ])
        if (storedToken !== null && storedUser !== null) {
          setToken(storedToken)
          setUser(JSON.parse(storedUser) as User)
        }
      } finally {
        setReady(true)
      }
    })()
  }, [])

  const persist = useCallback(async (nextToken: string, nextUser: User) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, nextToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser)),
    ])
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await api.signIn(email.trim().toLowerCase(), password)
      await persist(res.token, res.user)
    },
    [persist],
  )

  const signUp = useCallback(
    async (email: string, password: string) => {
      const res = await api.register(email.trim().toLowerCase(), password)
      await persist(res.token, res.user)
    },
    [persist],
  )

  const signOut = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ])
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ ready, token, user, signIn, signUp, signOut }),
    [ready, token, user, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (ctx === null) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}

/** The token, for screens that require an authenticated session. */
export function useAuthToken(): string {
  const { token } = useAuth()
  if (token === null) throw new Error("expected an authenticated session")
  return token
}
