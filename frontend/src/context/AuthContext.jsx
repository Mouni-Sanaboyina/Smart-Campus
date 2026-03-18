import { createContext, useContext, useState } from "react"

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user")
    return stored ? JSON.parse(stored) : null
  })

  // ✅ FIX: token stored separately so api.js can always read it
  const [token, setToken] = useState(() => {
    return localStorage.getItem("token") || null
  })

  const login = (userData) => {
    // userData from /login response: { access_token, role, id, name }
    const { access_token, ...userInfo } = userData
    setUser(userInfo)
    setToken(access_token)
    localStorage.setItem("user", JSON.stringify(userInfo))
    localStorage.setItem("token", access_token)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("user")
    localStorage.removeItem("token")
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}