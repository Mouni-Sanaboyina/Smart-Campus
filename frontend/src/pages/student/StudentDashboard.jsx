import { useNavigate } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import Webcam from "react-webcam"
import MainLayout from "../../layouts/MainLayout"
import { useAuth } from "../../context/AuthContext"
import { getAttendancePercentage, registerFace } from "../../services/api"

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const webcamRef = useRef(null)

  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")

  // Face registration state (shown if face_registered = false)
  const [faceNeeded,    setFaceNeeded]    = useState(false)
  const [showCamera,    setShowCamera]    = useState(false)
  const [faceImage,     setFaceImage]     = useState(null)
  const [faceLoading,   setFaceLoading]   = useState(false)
  const [faceMsg,       setFaceMsg]       = useState("")

  useEffect(() => {
    if (!user) return
    getAttendancePercentage()
      .then(data => {
        setStats(data)
        // ✅ Backend now returns face_registered in this response
        if (data.face_registered === false) setFaceNeeded(true)
      })
      .catch(() => setError("Could not load attendance data"))
      .finally(() => setLoading(false))
  }, [user])

  const capture = () => {
    const img = webcamRef.current.getScreenshot()
    setFaceImage(img)
    setShowCamera(false)
  }

  const submitFace = async () => {
    if (!faceImage) return
    setFaceLoading(true)
    setFaceMsg("")
    try {
      await registerFace(faceImage)
      setFaceMsg("✅ Face registered! You can now mark attendance.")
      setFaceNeeded(false)
    } catch (e) {
      setFaceMsg("❌ " + (e.message || "Failed to register face"))
    } finally {
      setFaceLoading(false)
    }
  }

  const pctColor =
    !stats           ? "text-gray-800" :
    stats.percentage >= 75 ? "text-green-600" :
    stats.percentage >= 50 ? "text-yellow-500" : "text-red-600"

  return (
    <MainLayout>
      <div className="mt-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Welcome, {user?.name}
        </h2>

        {/* ── Face Registration Banner ───────────────────────────────────── */}
        {faceNeeded && (
          <div className="mb-6 bg-orange-50 border border-orange-300 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-orange-800">Face Not Registered</p>
                <p className="text-sm text-orange-700">
                  You must register your face before you can mark attendance.
                </p>
              </div>
            </div>

            {faceMsg && (
              <p className="text-sm font-medium mb-3">{faceMsg}</p>
            )}

            {!showCamera && !faceImage && (
              <button onClick={() => setShowCamera(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition text-sm font-medium">
                📸 Register Face Now
              </button>
            )}

            {showCamera && (
              <div className="text-center">
                <Webcam ref={webcamRef} screenshotFormat="image/jpeg"
                  className="rounded-xl mx-auto mb-3 max-w-xs w-full" mirrored />
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setShowCamera(false)}
                    className="px-4 py-2 bg-gray-200 rounded-xl text-sm">Cancel</button>
                  <button onClick={capture}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium">
                    📸 Capture
                  </button>
                </div>
              </div>
            )}

            {faceImage && !faceMsg && (
              <div className="flex items-center gap-4">
                <img src={faceImage} alt="Face preview"
                  className="w-20 h-16 object-cover rounded-lg border" />
                <div className="flex gap-2">
                  <button onClick={() => { setFaceImage(null); setShowCamera(true) }}
                    className="px-3 py-1 bg-gray-200 rounded-lg text-sm">Retake</button>
                  <button onClick={submitFace} disabled={faceLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                    {faceLoading ? "Saving..." : "Save Face"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Attendance % */}
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Attendance</h3>
            {loading ? (
              <p className="text-gray-400 animate-pulse">Loading...</p>
            ) : error ? (
              <p className="text-red-500 text-sm">{error}</p>
            ) : (
              <>
                <p className={`text-4xl font-bold ${pctColor}`}>{stats.percentage}%</p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats.present_classes} present / {stats.total_classes} total classes
                </p>
                {stats.percentage < 75 && stats.total_classes > 0 && (
                  <p className="text-xs text-red-500 mt-2">⚠️ Below 75% threshold</p>
                )}
              </>
            )}
          </div>

          {/* Mark Attendance */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Mark Attendance</h3>
            <p className="text-gray-500 text-sm mb-4">
              Scan the faculty QR code to mark your attendance.
            </p>
            <button onClick={() => navigate("/student/attendance")}
              disabled={faceNeeded}
              className={`w-full py-2 rounded-xl font-medium transition ${
                faceNeeded
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"}`}>
              {faceNeeded ? "Register Face First" : "Open Scanner"}
            </button>
          </div>

          {/* Timetable */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Today's Timetable</h3>
            <p className="text-gray-500 text-sm mb-4">View all periods including free slots.</p>
            <button onClick={() => navigate("/student/curriculum")}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium">
              View Timetable
            </button>
          </div>

          {/* NEP Recommendations */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2">NEP Recommendations</h3>
            <p className="text-gray-500 text-sm mb-4">Skill-building programs matched to your interests.</p>
            <button onClick={() => navigate("/student/recommendations")}
              className="w-full py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-medium">
              View Recommendations
            </button>
          </div>

        </div>
      </div>
    </MainLayout>
  )
}