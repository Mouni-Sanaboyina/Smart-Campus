import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"

import Login              from "./pages/auth/Login"
import StudentSignup      from "./pages/student/StudentSignup"
import AdminDashboard     from "./pages/admin/AdminDashboard"
import FacultyDashboard   from "./pages/faculty/FacultyDashboard"
import FacultyAttendance  from "./pages/faculty/FacultyAttendance"
import FacultyCurriculum  from "./pages/faculty/FacultyCurriculum"
import StudentDashboard   from "./pages/student/StudentDashboard"
import StudentAttendance  from "./pages/student/StudentAttendance"
import StudentCurriculum  from "./pages/student/Studentcurriculum"
import Recommendations    from "./pages/student/Recommendations"
import StudentSkills      from "./pages/student/StudentSkills"

function ProtectedRoute({ children, role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" />
  if (role && user.role !== role) return <Navigate to={`/${user.role}/dashboard`} />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={`/${user.role}/dashboard`} /> : <Login />} />
      <Route path="/signup" element={<StudentSignup />} />

      {/* Admin */}
      <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

      {/* Faculty */}
      <Route path="/faculty/dashboard"  element={<ProtectedRoute role="faculty"><FacultyDashboard /></ProtectedRoute>} />
      <Route path="/faculty/attendance" element={<ProtectedRoute role="faculty"><FacultyAttendance /></ProtectedRoute>} />
      <Route path="/faculty/curriculum" element={<ProtectedRoute role="faculty"><FacultyCurriculum /></ProtectedRoute>} />

      {/* Student */}
      <Route path="/student/dashboard"       element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/attendance"      element={<ProtectedRoute role="student"><StudentAttendance /></ProtectedRoute>} />
      <Route path="/student/curriculum"      element={<ProtectedRoute role="student"><StudentCurriculum /></ProtectedRoute>} />
      <Route path="/student/skills"          element={<ProtectedRoute role="student"><StudentSkills /></ProtectedRoute>} />
      <Route path="/student/recommendations" element={<ProtectedRoute role="student"><Recommendations /></ProtectedRoute>} />
      <Route path="/student/nep"             element={<Navigate to="/student/recommendations" />} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}