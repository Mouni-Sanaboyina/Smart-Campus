import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { loginUser } from "../../services/api"

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [role, setRole] = useState("student")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async () => {
    setError("")

    if (!email || !password) {
      setError("Please enter email and password")
      return
    }

    try {
      setLoading(true)

      // ✅ FIX: Use centralised loginUser() from api.js
      const data = await loginUser(email, password, role)

      // data = { access_token, role, id, name }
      login(data)

      // ✅ FIX: Correct redirect — was `/${data.role}`, now `/role/dashboard`
      navigate(`/${data.role}/dashboard`)

    } catch (err) {
      setError(err.message || "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-700 to-cyan-400">

      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10">

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Smart Curriculum
          </h1>
          <p className="text-gray-600 text-sm mt-2">
            AI Powered Curriculum &amp; Attendance System
          </p>
        </div>

        {/* Role Toggle */}
        <div className="bg-gray-200 rounded-full p-1 flex mb-8">
          {["student", "faculty", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                role === r
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-300"
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="space-y-5">

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full p-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full p-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          />

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full py-3 text-lg font-semibold text-white rounded-xl shadow-lg transition duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105 active:scale-95 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Signing in..." : role === "student" ? "Sign In" : "Login"}
          </button>

          {role === "student" && (
            <p
              onClick={() => navigate("/signup")}
              className="text-center text-sm text-blue-600 cursor-pointer hover:underline"
            >
              New student? Register here
            </p>
          )}

        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          Smart Curriculum &amp; Attendance System
        </p>

      </div>
    </div>
  )
}