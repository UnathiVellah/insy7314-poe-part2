import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import { clearAuth, getSavedUser, getToken, saveAuth } from '../services/api'
import * as authService from '../services/authService'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (getToken() ? getSavedUser() : null))
  // True while we ask the server whether a saved token is still valid.
  const [checking, setChecking] = useState(() => Boolean(getToken() && getSavedUser()))

  useEffect(() => {
    if (!checking) return undefined

    let cancelled = false

    // Never trust what is sitting in sessionStorage: ask the server who this
    // token really belongs to. This also corrects a tampered role value.
    authService
      .getCurrentUser()
      .then((serverUser) => {
        if (cancelled) return
        saveAuth(getToken(), serverUser)
        setUser(serverUser)
      })
      .catch((error) => {
        if (cancelled) return
        // Only a 401 means the token is bad. If the server is just
        // unreachable, keep the saved session instead of logging out.
        if (error.status === 401) {
          clearAuth()
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })

    return () => {
      cancelled = true
    }
  }, [checking])

  const login = useCallback(async (email, password) => {
    const { token, user: loggedInUser } = await authService.login(email, password)
    saveAuth(token, loggedInUser)
    setUser(loggedInUser)
    return loggedInUser
  }, [])

  const register = useCallback((details) => authService.register(details), [])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, checking, isAuthenticated: Boolean(user), login, register, logout }),
    [user, checking, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}