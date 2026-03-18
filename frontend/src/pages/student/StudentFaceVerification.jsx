import { useEffect, useRef, useState } from "react"

const BASE_URL = "http://127.0.0.1:8000"

function authHeaders() {
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * StudentFaceVerification
 *
 * Props:
 *   sessionId  – QR session ID to verify against
 *   gpsCoords  – { lat, lng } | null
 *   onVerified – called with backend response data on success
 *   onError    – called with error message string on failure
 */
export default function StudentFaceVerification({ sessionId, gpsCoords, onVerified, onError }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)

  // Start camera on mount
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setCameraReady(true)
        }
      } catch {
        setError("Camera access denied. Please allow camera access and try again.")
      }
    }
    startCamera()

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return
    if (!cameraReady) {
      setError("Camera not ready. Please wait a moment.")
      return
    }

    setLoading(true)
    setError(null)

    // Capture current video frame → base64 JPEG
    const canvas  = canvasRef.current
    const video   = videoRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d").drawImage(video, 0, 0)
    const imageBase64 = canvas.toDataURL("image/jpeg")

    stopCamera()

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
        const msg = data.detail || "Face verification failed."
        setError(msg)
        onError?.(msg)
        return
      }

      onVerified?.(data)
    } catch {
      const msg = "Network error. Please try again."
      setError(msg)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
      <h3 className="text-lg font-semibold mb-1">Face Verification</h3>
      <p className="text-xs text-gray-400 mb-4">
        Your live face will be compared against your registered photo (stored as an encrypted zip).
      </p>

      {error && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-xl">{error}</p>
      )}

      {/* Video preview */}
      <div className="relative mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-64 h-48 mx-auto rounded-xl border-2 border-blue-300 object-cover"
        />
        {/* Oval face guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-28 h-36 border-4 border-dashed border-blue-400 rounded-full opacity-70" />
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <p className="text-xs text-gray-400 mb-4">
        Centre your face in the oval · Good lighting · No glasses
      </p>

      <button
        onClick={handleCapture}
        disabled={loading || !cameraReady}
        className={`px-8 py-3 rounded-xl font-semibold text-white transition ${
          loading || !cameraReady
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {loading
          ? "Verifying..."
          : !cameraReady
          ? "Starting camera..."
          : "📸 Capture & Verify Face"}
      </button>
    </div>
  )
}