import { useState, useRef, useEffect } from "react"
import MainLayout from "../../layouts/MainLayout"
import { Html5QrcodeScanner } from "html5-qrcode"

const BASE_URL = "http://127.0.0.1:8000"
const GPS_RADIUS_METERS = 100

function authHeaders() {
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6_371_000
  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Steps: idle → scanning → requesting_location → gps_check → face_capture → verifying → success | error

export default function StudentAttendance() {
  const [step,       setStep]       = useState("idle")
  const [message,    setMessage]    = useState("")
  const [sessionId,  setSessionId]  = useState(null)
  const [qrCoords,   setQrCoords]   = useState(null)  // faculty location from QR
  const [gpsCoords,  setGpsCoords]  = useState(null)  // student live location

  // Face capture refs
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)

  // ── QR Scanner ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "scanning") return

    const scanner = new Html5QrcodeScanner("qr-reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    }, false)

    scanner.render(
      (decodedText) => {
        scanner.clear().catch(() => {})
        try {
          const data = JSON.parse(decodedText)
          if (!data.session_id) throw new Error("No session_id in QR")

          const facultyCoords =
            data.latitude != null && data.longitude != null
              ? { lat: data.latitude, lng: data.longitude }
              : null

          setSessionId(data.session_id)
          setQrCoords(facultyCoords)

          // If QR has location → request student's location
          if (facultyCoords) {
            setStep("requesting_location")
            requestStudentLocation(data.session_id, facultyCoords)
          } else {
            // No location in QR → skip GPS, go to face
            setStep("gps_check")
            validateLocationOnBackend(data.session_id, null)
          }
        } catch {
          setMessage("Invalid QR code. Ask faculty to regenerate.")
          setStep("error")
        }
      },
      () => {}
    )

    return () => { scanner.clear().catch(() => {}) }
  }, [step])

  // ── Step 1: Request student location ───────────────────────────────────────
  const requestStudentLocation = (sid, facultyCoords) => {
    setMessage("📍 Please allow location access to verify you are in class...")

    if (!navigator.geolocation) {
      setMessage("GPS not supported on this device. Skipping location check.")
      setStep("gps_check")
      validateLocationOnBackend(sid, null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const studentCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setGpsCoords(studentCoords)

        // Client-side distance check first
        const dist = haversine(
          facultyCoords.lat, facultyCoords.lng,
          studentCoords.lat, studentCoords.lng
        )

        if (dist > GPS_RADIUS_METERS) {
          setMessage(
            `❌ You are ${Math.round(dist)}m away from the classroom. ` +
            `You must be within ${GPS_RADIUS_METERS}m to mark attendance.`
          )
          setStep("error")
          return
        }

        // Also validate on backend
        setStep("gps_check")
        validateLocationOnBackend(sid, studentCoords)
      },
      (err) => {
        setMessage(
          "Location access was denied. You must allow location access to mark attendance. " +
          "Please enable location in your browser settings and try again."
        )
        setStep("error")
      },
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    )
  }

  const validateLocationOnBackend = async (sid, coords) => {
    setMessage("📍 Validating location on server...")
    try {
      const body = coords
        ? { latitude: coords.lat, longitude: coords.lng }
        : {}
      const res = await fetch(`${BASE_URL}/student/validate-location/${sid}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.detail || "You are too far from the classroom.")
        setStep("error")
        return
      }
      // Location valid → proceed to face
      proceedToFace(sid, coords)
    } catch {
      setMessage("Location check failed. Try again.")
      setStep("error")
    }
  }

  // ── Step 2: Face capture ───────────────────────────────────────────────────
  const proceedToFace = async (sid, coords) => {
    setSessionId(sid)
    setGpsCoords(coords)
    setStep("face_capture")
    startCamera()
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      setMessage("Camera access denied. Cannot verify face.")
      setStep("error")
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setStep("verifying")
    setMessage("🔍 Verifying your face against registered photo...")
    stopCamera()

    // Capture current video frame → base64
    const canvas  = canvasRef.current
    const video   = videoRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d").drawImage(video, 0, 0)
    const imageBase64 = canvas.toDataURL("image/jpeg")

    try {
      const res = await fetch(`${BASE_URL}/student/verify-and-mark/${sessionId}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          image:     imageBase64,
          latitude:  gpsCoords?.lat  ?? null,
          longitude: gpsCoords?.lng  ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.detail || "Verification failed.")
        setStep("error")
        return
      }
      setMessage(data.message || "Attendance marked successfully!")
      setStep("success")
    } catch {
      setMessage("Network error. Try again.")
      setStep("error")
    }
  }

  useEffect(() => () => stopCamera(), [])

  const reset = () => {
    stopCamera()
    setStep("idle")
    setMessage("")
    setSessionId(null)
    setQrCoords(null)
    setGpsCoords(null)
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="mt-6 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Mark Attendance</h2>

        {/* Step indicator */}
        {!["idle", "success", "error"].includes(step) && (
          <div className="flex items-center gap-2 mb-6">
            <StepBadge n={1} label="Scan QR"
              active={step === "scanning"}
              done={!["idle", "scanning"].includes(step)} />
            <div className="flex-1 h-0.5 bg-gray-200" />
            <StepBadge n={2} label="Location"
              active={["requesting_location", "gps_check"].includes(step)}
              done={["face_capture", "verifying"].includes(step)} />
            <div className="flex-1 h-0.5 bg-gray-200" />
            <StepBadge n={3} label="Face"
              active={["face_capture", "verifying"].includes(step)}
              done={false} />
          </div>
        )}

        {/* ── IDLE ── */}
        {step === "idle" && (
          <Card>
            <p className="text-gray-500 text-sm mb-5 text-center">
              Attendance requires:<br />
              <span className="font-medium text-gray-700">
                QR Scan → Location Check → Face Verification
              </span>
            </p>
            <button
              onClick={() => setStep("scanning")}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold text-lg"
            >
              📷 Start Scanner
            </button>
          </Card>
        )}

        {/* ── SCANNING ── */}
        {step === "scanning" && (
          <Card>
            <p className="text-sm text-gray-500 mb-4 text-center">
              Point camera at faculty's QR code
            </p>
            <div id="qr-reader" className="w-full" />
            <button
              onClick={reset}
              className="mt-4 w-full py-2 bg-gray-200 rounded-xl text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
          </Card>
        )}

        {/* ── REQUESTING LOCATION ── */}
        {step === "requesting_location" && (
          <Card>
            <div className="text-center py-8">
              <div className="text-5xl mb-4 animate-bounce">📍</div>
              <p className="font-semibold text-gray-700">Location Access Required</p>
              <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
                {message}
              </p>
              <p className="text-xs text-blue-500 mt-3">
                Tap "Allow" in your browser's location prompt
              </p>
            </div>
          </Card>
        )}

        {/* ── GPS CHECK (backend validation) ── */}
        {step === "gps_check" && (
          <Card>
            <div className="text-center py-8">
              <div className="text-5xl mb-4 animate-pulse">📍</div>
              <p className="font-semibold text-gray-700">Verifying Location</p>
              <p className="text-sm text-gray-400 mt-2">{message}</p>
            </div>
          </Card>
        )}

        {/* ── FACE CAPTURE ── */}
        {step === "face_capture" && (
          <Card>
            <p className="text-sm text-center text-gray-500 mb-3">
              ✅ Location verified. Now look straight at the camera.
            </p>
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-xl border-2 border-blue-300"
              />
              {/* Face oval guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-48 border-4 border-dashed border-blue-400 rounded-full opacity-70" />
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <p className="text-xs text-center text-gray-400 mt-2 mb-3">
              Centre your face in the oval. Good lighting, no glasses, no hat.
            </p>
            <button
              onClick={captureAndVerify}
              className="w-full py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold"
            >
              😶 Verify Face & Mark Attendance
            </button>
            <button
              onClick={reset}
              className="mt-2 w-full py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200"
            >
              Cancel
            </button>
          </Card>
        )}

        {/* ── VERIFYING ── */}
        {step === "verifying" && (
          <Card>
            <div className="text-center py-10">
              <div className="text-5xl mb-4 animate-spin">🔍</div>
              <p className="font-semibold text-gray-700">Verifying Face...</p>
              <p className="text-sm text-gray-400 mt-2">
                Comparing with your registered photo
              </p>
            </div>
          </Card>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <Card>
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-xl font-bold text-green-700">Attendance Marked!</p>
              <p className="text-sm text-gray-500 mt-2">{message}</p>
              <button
                onClick={reset}
                className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
              >
                Done
              </button>
            </div>
          </Card>
        )}

        {/* ── ERROR ── */}
        {step === "error" && (
          <Card>
            <div className="text-center py-8">
              <div className="text-6xl mb-4">❌</div>
              <p className="text-xl font-bold text-red-600">Failed</p>
              <p className="text-sm text-gray-600 mt-2 max-w-xs mx-auto">{message}</p>
              <button
                onClick={reset}
                className="mt-6 px-8 py-3 bg-gray-200 rounded-xl hover:bg-gray-300 transition font-medium"
              >
                Try Again
              </button>
            </div>
          </Card>
        )}

      </div>
    </MainLayout>
  )
}

function Card({ children }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">{children}</div>
  )
}

function StepBadge({ n, label, active, done }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
          done
            ? "bg-green-500 text-white"
            : active
            ? "bg-blue-600 text-white ring-4 ring-blue-100"
            : "bg-gray-200 text-gray-500"
        }`}
      >
        {done ? "✓" : n}
      </div>
      <span className={`text-xs font-medium ${active ? "text-blue-600" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  )
}