const BASE_URL = "http://127.0.0.1:8000"

function authHeaders() {
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || "Request failed")
  return data
}

// ─── Auth ────────────────────────────────────────────────
export const loginUser     = (email, password, role) =>
  apiFetch("/login", { method:"POST", body: JSON.stringify({ email, password, selected_role: role }) })

export const signupStudent = (name, email, password, interests) =>
  apiFetch("/student/signup", { method:"POST", body: JSON.stringify({ name, email, password, interests }) })

// ─── Admin ───────────────────────────────────────────────
export const getPendingStudents = () => apiFetch("/admin/pending-students")
export const approveStudent     = (id) => apiFetch(`/admin/approve/${id}`, { method:"POST" })
export const getAdminStats      = () => apiFetch("/admin/stats")

// ─── Faculty ─────────────────────────────────────────────
export const generateQR = (facultyId, period, gpsCoords = null) =>
  apiFetch(`/faculty/generate-qr/${facultyId}/${period}`, {
    method: "POST",
    body: JSON.stringify(gpsCoords
      ? { latitude: gpsCoords.lat, longitude: gpsCoords.lng }
      : {}
    ),
  })

export const getFacultyAttendance = (period)  => apiFetch(`/faculty/attendance/${period}`)
export const getFacultyTimetable  = (day)     => apiFetch(`/faculty/timetable/${day}`)

// ─── Student ─────────────────────────────────────────────
export const markAttendance = (sessionId, gpsCoords = null) =>
  apiFetch(`/student/mark-attendance/${sessionId}`, {
    method: "POST",
    body: JSON.stringify(gpsCoords
      ? { latitude: gpsCoords.lat, longitude: gpsCoords.lng }
      : {}
    ),
  })

export const getAttendancePercentage = () => apiFetch("/student/attendance-percentage")
export const getStudentTimetable     = () => apiFetch("/student/timetable")
export const registerFace            = (imageBase64) =>
  apiFetch("/student/register-face", { method:"POST", body: JSON.stringify({ image: imageBase64 }) })

// ─── Recommendations & Skills ─────────────────────────────
export const getRecommendations = () => apiFetch("/student/recommendations")

export const getProfile = () => apiFetch("/student/profile")

export const updateInterests = (interests) =>
  apiFetch("/student/update-interests", {
    method: "PUT",
    body: JSON.stringify({ interests }),
  })