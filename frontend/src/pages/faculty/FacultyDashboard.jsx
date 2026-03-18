import { useState } from "react"
import MainLayout from "../../layouts/MainLayout"
import { generateQR } from "../../services/api"
import { QRCodeCanvas } from "qrcode.react"
import { useAuth } from "../../context/AuthContext"

const PERIODS = ["P1", "P2", "P3", "P4", "P5", "P6"]

export default function FacultyDashboard() {
  const { user } = useAuth()

  const [selectedPeriod, setSelectedPeriod] = useState("P1")
  const [session,  setSession]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")
  const [gpsInfo,  setGpsInfo]  = useState(null) // { lat, lng } or null

  // ── Get GPS then generate QR ───────────────────────────────────────────────
  const handleGenerate = () => {
    setError("")
    setLoading(true)
    setGpsInfo(null)

    if (!navigator.geolocation) {
      generateWithCoords(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setGpsInfo(coords)
        generateWithCoords(coords)
      },
      (err) => {
        console.warn("GPS denied:", err.message)
        setError("⚠️ Location access denied. QR will be generated without location lock.")
        generateWithCoords(null)
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  const generateWithCoords = async (coords) => {
    try {
      const data = await generateQR(user.id, selectedPeriod, coords)
      setSession(data)
    } catch (err) {
      setError(err.message || "Failed to generate QR")
    } finally {
      setLoading(false)
    }
  }

  // ── QR payload — embed session_id + location so student scans it locally ──
  const qrPayload = session
    ? JSON.stringify({
        session_id: session.session_id,
        // Embed faculty location directly in QR so student app can compare
        // without an extra API round-trip before the GPS check
        latitude:  session.latitude  ?? null,
        longitude: session.longitude ?? null,
      })
    : ""

  return (
    <MainLayout>
      <div className="mt-6">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          QR Attendance Generator
        </h2>

        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

          {!session ? (
            <div className="space-y-4">

              {/* Period Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Period
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PERIODS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={`py-2 rounded-lg text-sm font-medium transition border ${
                        selectedPeriod === p
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* GPS info note */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                📍 Your location will be captured and embedded in the QR so students
                must be physically nearby to mark attendance.
              </div>

              {error && (
                <p className="text-orange-500 text-sm text-center">{error}</p>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600
                  text-white rounded-xl font-semibold shadow-md
                  hover:scale-105 active:scale-95 transition ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
              >
                {loading ? "Getting location & generating..." : `Generate QR for ${selectedPeriod}`}
              </button>

            </div>
          ) : (
            <div className="text-center">

              <p className="text-gray-700 font-medium mb-1">
                {session.subject} — Room {session.room_no}
              </p>
              <p className="text-gray-500 text-sm mb-1">
                Period: <strong>{session.period}</strong> · {session.start_time}–{session.end_time}
              </p>

              {/* GPS badge */}
              {session.has_gps ? (
                <p className="text-green-600 text-xs mb-4 font-medium">
                  📍 Location locked ({session.latitude?.toFixed(5)}, {session.longitude?.toFixed(5)})
                </p>
              ) : (
                <p className="text-orange-500 text-xs mb-4">
                  ⚠️ No location lock — students can mark from anywhere
                </p>
              )}

              <div className="flex justify-center p-4 bg-gray-50 rounded-xl">
                <QRCodeCanvas
                  value={qrPayload}
                  size={220}
                />
              </div>

              <p className="text-xs text-gray-400 mt-3">
                Session ID: {session.session_id} · Expires at {session.end_time}
              </p>

              <button
                onClick={() => { setSession(null); setGpsInfo(null); setError("") }}
                className="mt-5 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition text-sm"
              >
                Generate New QR
              </button>

            </div>
          )}

        </div>

      </div>
    </MainLayout>
  )
}