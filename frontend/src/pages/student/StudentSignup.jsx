import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Webcam from "react-webcam"
import { signupStudent } from "../../services/api"

const BASE_URL = "http://127.0.0.1:8000"

export default function StudentSignup() {
  const navigate  = useNavigate()
  const webcamRef = useRef(null)

  const [form,      setForm]      = useState({ name: "", email: "", password: "", interests: "" })
  const [faceImage, setFaceImage] = useState(null)   // base64 of captured face
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState("")
  const [step,      setStep]      = useState("form") // form | camera | done

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const capture = () => {
    const img = webcamRef.current.getScreenshot()
    if (!img) return
    setFaceImage(img)
    setStep("form")
  }

  const handleSubmit = async () => {
    setError("")

    if (!form.name || !form.email || !form.password || !form.interests) {
      return setError("Please fill all fields")
    }
    if (!faceImage) {
      return setError("Please capture your face photo before submitting")
    }

    setLoading(true)
    try {
      // Step 1: Create account
      await signupStudent(form.name, form.email, form.password, form.interests)

      // Step 2: Register face using the pre-approval endpoint (no JWT needed).
      // Backend validates the face, then zips & stores it as {student_id}.zip
      const res = await fetch(`${BASE_URL}/student/register-face-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:    form.email,
          password: form.password,
          image:    faceImage,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        // Face registration failure means attendance won't work — treat as error
        throw new Error(err.detail || "Face registration failed. Please try again.")
      }

      setStep("done")
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // ─── Done screen ────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-700 to-cyan-400">
        <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-sm w-full">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration Submitted!</h2>
          <p className="text-gray-500 text-sm mb-2">
            Your account and face photo have been registered.
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Your face is securely stored as an encrypted zip file.
            Once an admin approves your account you can login.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // ─── Camera screen ──────────────────────────────────────────────────────────
  if (step === "camera") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-700 to-cyan-400">
        <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full">
          <h2 className="text-xl font-bold mb-2">Register Your Face</h2>
          <p className="text-gray-500 text-sm mb-1">
            Look straight at the camera in good lighting.
          </p>
          <p className="text-gray-400 text-xs mb-4">
            Remove glasses, hats, or anything covering your face.
            This photo will be stored as an encrypted zip file used for attendance verification.
          </p>
          {/* Oval face guide overlay */}
          <div className="relative mb-4">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="rounded-xl w-full"
              mirrored
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-48 border-4 border-dashed border-blue-400 rounded-full opacity-80" />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep("form")}
              className="flex-1 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 transition text-sm"
            >
              Cancel
            </button>
            <button
              onClick={capture}
              className="flex-1 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
            >
              📸 Capture
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Form screen ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-700 to-cyan-400">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">

        <h2 className="text-2xl font-bold text-center mb-6">Student Registration</h2>

        <div className="space-y-4">
          <input
            type="text" name="name" placeholder="Full Name"
            value={form.name} onChange={handleChange}
            className="w-full p-3 border rounded-xl outline-none focus:border-blue-400 transition"
          />
          <input
            type="email" name="email" placeholder="Email"
            value={form.email} onChange={handleChange}
            className="w-full p-3 border rounded-xl outline-none focus:border-blue-400 transition"
          />
          <input
            type="password" name="password" placeholder="Password"
            value={form.password} onChange={handleChange}
            className="w-full p-3 border rounded-xl outline-none focus:border-blue-400 transition"
          />
          <input
            type="text" name="interests" placeholder="Interests (e.g. AI, Web Development)"
            value={form.interests} onChange={handleChange}
            className="w-full p-3 border rounded-xl outline-none focus:border-blue-400 transition"
          />

          <div className="p-3 bg-gray-100 rounded-xl text-sm text-gray-500">
            🎓 Branch: CSE (AI &amp; DS)
          </div>

          {/* Face capture section */}
          {!faceImage ? (
            <button
              onClick={() => setStep("camera")}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition text-sm text-gray-600 font-medium"
            >
              📸 Capture Face Photo (Required for Attendance)
            </button>
          ) : (
            <div className="text-center p-3 bg-green-50 rounded-xl border border-green-200">
              <img
                src={faceImage}
                alt="Face preview"
                className="rounded-lg mx-auto w-32 h-24 object-cover mb-2"
              />
              <p className="text-green-600 text-sm font-medium">✅ Face captured</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Will be stored as an encrypted zip file
              </p>
              <button
                onClick={() => { setFaceImage(null); setStep("camera") }}
                className="text-xs text-blue-500 hover:underline mt-1"
              >
                Retake
              </button>
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-3 bg-blue-600 text-white rounded-xl font-semibold transition ${
              loading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"
            }`}
          >
            {loading ? "Submitting..." : "Submit Registration"}
          </button>

          <p
            onClick={() => navigate("/")}
            className="text-center text-sm text-blue-600 cursor-pointer hover:underline"
          >
            Already have an account? Login
          </p>
        </div>
      </div>
    </div>
  )
}